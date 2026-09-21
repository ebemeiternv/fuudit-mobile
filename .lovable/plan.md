# Budget-aware meal planning — architecture proposal

No code written yet. This is the inspection result and the proposed design.

## What I found in the app today

- **Meal plan** is fully manual: you pick a recipe and add it to a day/meal slot (`meal_plan_entries` holds date, meal type, servings, recipe or custom title). There is **no AI meal-plan generator yet** — the AI today is the Chef chat, which can read your pantry, search recipes and suggest them one conversation at a time.
- **Pantry** holds name, quantity + unit, category, location, expiry date, purchase date and status (active / used / discarded), plus barcode data for scanned products.
- **Recipes** are cached from Spoonacular with ingredients, servings and cooking time.
- **Grocery list** already has the hard part solved: it collects ingredients from selected meal-plan days, scales them by servings, matches them against active pantry items, converts units where safely possible, subtracts what you already have and consolidates duplicates — then lets you review before adding.
- **Profile** already stores household size, dietary preferences and allergies.
- **Pricing: nothing exists today.** No price, cost, currency or purchase-price data anywhere in the database or code.

## What gets reused (no duplication)

- The whole ingredient engine: name normalisation, unit conversion, pantry matching, duplicate consolidation, category inference.
- The existing grocery generation flow — budget planning feeds it instead of replacing it.
- Profile household size, diet and allergies; pantry expiry dates for "expiring soon"; the Chef's recipe search and pantry-reading capability.

## What is genuinely new

1. An **AI meal-plan generator** (this does not exist yet) that fills a date range with recipes, optimised across the whole plan rather than meal by meal.
2. An **estimated cost layer** so a plan can be priced.
3. A **budget preference** the user can save and reuse.

## How I propose to estimate ingredient prices

Three layers, cheapest and most honest first — always labelled "estimated", never presented as real shop prices:

1. **Spoonacular price data.** Recipes already come from Spoonacular, which returns a price per serving and a per-ingredient price breakdown. We fetch it with the recipe (same function, one extra call), convert from US cents into the user's currency using a stored, adjustable rate, and cache it on the recipe we already store. This gives real per-ingredient numbers with zero manual data entry.
2. **Your own history.** When you add a pantry item you can optionally record what you paid. Over time your own prices override Spoonacular for items you actually buy — this reuses the existing product-learning mechanism rather than a new system.
3. **Category fallback.** A small built-in table of typical price-per-kilo / per-litre / per-piece by category (produce, dairy, meat & fish, staples…) for anything the first two layers cannot price. Shipped in code, tunable.

Every figure shown carries a confidence signal, and the summary always says "estimated".

## Database changes needed

Minimal, additive, no restructuring:

- `profiles`: budget amount, currency, period, buffer % and planning preferences — saved so the user does not retype them. Could also live in a small preferences JSON on the profile.
- `recipes`: cached estimated cost fields from Spoonacular (no new table — the recipe cache already exists).
- `pantry_items`: an optional purchase price + currency, used for the personal-price layer.
- `meal_plan_entries`: the entry's estimated cost and how much of it was covered by pantry, so the plan summary survives a reload.

No new tables. Nothing removed or renamed. Existing meal plans keep working untouched because every field is optional.

## The generator and its logic

A new backend function (built like the existing Chef function, same AI gateway, same error handling) receives: the date range, meals to include, budget envelope, servings, cooking-time limit, diet/allergies, pantry contents with expiry dates, and the planning priorities. It searches recipes, prices candidate plans with the cost layer, and iterates until the plan fits the budget.

Priority order, applied strictly in this sequence:

1. **Allergies — absolute exclusion.** Never relaxed for any reason, budget included. Enforced in code after the AI answers, not just in the prompt: any plan containing an allergen is rejected and regenerated.
2. Dietary constraints.
3. Ingredients expiring soon (rescue first).
4. Ingredients already in the pantry.
5. Staying inside the budget.
6. Reusing purchased ingredients across meals — if spinach is bought for Monday, the rest of it is planned into another meal before unrelated ingredients are bought.
7. Nutrition style (healthy / high protein / family friendly) and cooking time.

If the budget cannot be met without breaking 1–2, the plan comes back honest: "closest plan is X over budget" with suggestions, never a silently unsafe plan.

## Monthly budgets

A monthly figure is treated as an envelope, not a month of meals. We derive a weekly planning budget from it (monthly ÷ weeks, minus a small configurable buffer, default a few percent) and only ever generate a week of detail at a time, tracking what the month has left.

## Results the user sees

A calm summary card, not a spreadsheet:

```text
Weekly budget      1,200 SEK
Estimated shopping   940 SEK
Budget remaining     260 SEK

8 pantry ingredients used · 3 expiring rescued · ~47 SEK per serving
```

Each meal shows its estimated added cost with ingredients split into **You already have** and **Still needed**. Pantry ingredients are never counted as new spending — they are shown separately as value used.

## Grocery integration

Accepting a plan writes the meal-plan entries, then runs the **existing** grocery generation: only missing quantities after pantry subtraction, ingredients shared across recipes counted once, duplicates consolidated, with the same review step before anything is added. The plan's estimated shopping total and the grocery list therefore always agree.

## UX

Budget is a collapsed optional section in the generate flow — "Plan within my budget". Untouched, the planner behaves exactly as an unbudgeted planner. Wording throughout: *Estimated grocery cost*, *You already have*, *Still needed*, *Budget remaining*.

## Suggested build order

1. Cost layer + Spoonacular price caching, with estimated costs visible on recipes (no planner yet).
2. Budget & planning preferences on the profile.
3. AI plan generator without budget — recipes into a date range from pantry, diet, allergies, time.
4. Budget constraint, plan-level optimisation and ingredient reuse.
5. Budget summary + per-meal have/need breakdown.
6. Accept → grocery list via the existing flow; monthly envelope handling.

Nothing is implemented until you approve this.
