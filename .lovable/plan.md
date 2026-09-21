# Budget-aware meal planning — revised architecture proposal

Nothing implemented. Revised per your six points.

## Inspection result (unchanged)

- **Meal plan** is manual today: recipe → day + meal slot, with servings. There is **no AI meal-plan generator yet**; the AI is the Chef chat (reads pantry, searches recipes, suggests).
- **Pantry**: name, quantity + unit, category, location, expiry, purchase date, status (active/consumed/discarded), barcode data.
- **Recipes**: Spoonacular cache with ingredients, servings, cooking time.
- **Grocery list** already solves the hard part: gathers ingredients from chosen meal-plan days, scales by servings, matches active pantry items, converts units safely, subtracts what you have, consolidates duplicates, then shows a review step.
- **Profile**: household size, dietary preferences, allergies.
- **Pricing: none exists anywhere** in code or database.

Reused as-is: the ingredient engine (normalisation, unit conversion, pantry matching, consolidation, category inference), the grocery generation flow, profile diet/allergy/household data, pantry expiry dates, and the Chef's recipe search.

## 1. Cost layer — multi-source, confidence-aware

A single internal price-estimate shape, so every consumer of a price handles all sources identically:

```text
ingredient identity, estimated price, currency,
unit basis (per kg / per l / per piece, when resolvable),
source: personal | external_estimate | local_estimate | category_fallback,
confidence: 0–1,
observed_at (optional)
```

Resolution order, highest priority first:

1. **personal** — your own recorded purchase prices, normalised to a unit basis. Highest trust.
2. **local_estimate** — regional reference prices (placeholder for the MVP; the slot exists so local data, supermarket feeds or receipt scanning can be added later without touching callers).
3. **external_estimate** — Spoonacular. Explicitly **not** treated as accurate local grocery pricing: used as a relative/ranking signal and a last-resort magnitude, flagged as external, low confidence, never presented as a shop price.
4. **category_fallback** — built-in typical price per kg / l / piece by category, tunable in code.

Every figure the user sees is labelled *estimated* and carries a confidence signal. No supermarket integrations, receipt scanning or live prices in this scope — only the source slots for them.

## 2. Deterministic cost engine — the AI does no arithmetic

A pure, testable module in the app/backend owns all numbers:

1. expand recipe ingredients and scale to required servings
2. consolidate identical ingredients across the **whole plan** (not per meal)
3. subtract active pantry quantities with safe unit conversion
4. price only the missing quantities via the resolver above
5. total estimated shopping cost, cost per serving, pantry ingredients used, expiring items rescued
6. compare against the budget envelope

The AI's only jobs: choose recipes and propose substitutions. The loop is: AI proposes a plan → engine evaluates it → if over budget, the engine's own numbers (which lines cost the most, what is already available) are fed back with a request for cheaper substitutions → recalculate. Bounded iterations; if it still cannot fit, the user is told honestly how far over it lands, never given a silently massaged number.

**Allergies are enforced in code**, after the AI answers, on top of the prompt instruction — any plan containing an allergen is rejected and regenerated. Budget never relaxes an allergy or a dietary constraint.

## 3. No cost fields on meal_plan_entries

Dropped from the earlier proposal — you are right that a per-entry cost is misleading when ingredients are shared and pantry-dependent. For the MVP, **all costs are derived** at generation and display time from the plan + pantry + price resolver.

If historical budget tracking is wanted later, it should be a **separate plan/budget snapshot model** — one row per generated plan capturing the budget, the totals, and the priced line items as they stood at that moment — proposed on its own, not bolted onto individual meal entries.

## 4. Whole-plan ingredient reuse as a core objective

The planner simulates a running inventory across the period, in date order:

- start from current pantry quantities (with expiry dates)
- each meal draws from that running inventory first
- anything bought is bought in realistic purchase quantities, and the **remainder stays in the simulated inventory** for later meals
- later meals prefer recipes that consume those remainders and the soonest-expiring items

The objective is not "pick cheap recipes". It minimises:

```text
new grocery spend + likely food waste + unused purchased ingredients
```

subject to: allergies (absolute), dietary constraints, servings/household size, budget, cooking-time limit, and preferences (healthy / high-protein / family-friendly). So if spinach is bought for Monday, the rest of the bunch is planned into a later meal before unrelated ingredients are added.

Priority sequence when trade-offs are needed: allergy safety → dietary constraints → expiring ingredients → pantry availability → budget → cross-meal reuse → nutrition and cooking time.

## 5. Monthly budget as a real envelope

Not a flat divide-by-four. The envelope tracks the actual budget period: days remaining, spend already allocated to plans inside the period, and a small configurable buffer. The planning budget for the next week is derived from what genuinely remains over the days that remain. Only one week of detail is ever generated at a time.

## 6. Proposed MVP data model

Additive and minimal.

**Needed now**

- `profiles` — budget amount, currency, period (daily/weekly/monthly/custom), buffer %, meals to include, and planning preferences (prioritise pantry, prioritise expiring, cooking-time limit, nutrition style). Small and stable enough to be columns, or one preferences JSON field if you prefer flexibility.
- `pantry_items` — optional purchase price + currency, feeding the personal price layer (also improves the existing product learning).

**Deliberately not added now**

- No cost columns on `meal_plan_entries` (point 3).
- No ingredient-price table yet: the MVP resolver works from personal pantry prices, in-code category reference data, and Spoonacular as a flagged external signal. A shared `ingredient_prices` table becomes worthwhile only when local or crowd data arrives — the resolver interface is designed so adding it changes nothing above it.
- No plan/budget snapshot table until you want history (separate proposal).

No tables removed or renamed; every new field optional, so existing meal plans and grocery generation keep working exactly as now.

## Results the user sees

```text
Weekly budget      1,200 SEK
Estimated shopping   940 SEK
Budget remaining     260 SEK

8 pantry ingredients used · 3 expiring rescued · ~47 SEK per serving
```

Each meal shows its estimated added cost, with ingredients split into **You already have** and **Still needed**. Pantry ingredients never count as new spending — shown separately as value used. Budget is a collapsed optional section ("Plan within my budget"); untouched, generation behaves as an unbudgeted planner.

## Grocery integration

Accepting a plan writes the meal-plan entries, then runs the **existing** grocery generation: only missing quantities after pantry subtraction, shared ingredients counted once, duplicates consolidated, same review step. Because both use the one cost/consolidation engine, the plan's estimated shopping total and the grocery list always agree.

## Suggested build order

1. Cost engine + price resolver with all four sources and confidence (pure logic, unit-tested, no UI).
2. Budget and planning preferences on the profile; optional purchase price on pantry items.
3. AI plan generator without budget: fill a date range from pantry, diet, allergies, time.
4. Running-inventory simulation, whole-plan consolidation and the budget feedback loop.
5. Budget summary + per-meal have/need breakdown.
6. Accept → grocery list via the existing flow; monthly envelope tracking.

Nothing is implemented until you approve.
