# Phase 4 — Running inventory + budget-aware planning

Extends the existing Generate Meal Plan flow. No parallel planner, no parallel pricing, no schema changes.

## 1. Budget back in the Generate sheet

A collapsed "Plan within my budget" section in the existing sheet:
- amount, currency, period (matched to the generated date range), buffer %
- pre-filled from the Profile planning defaults, editable for this session only (nothing written back to Profile)
- off by default → Phase 3 behaviour unchanged, no cost work runs at all

Monthly period is treated as an envelope: the planning budget for the generated range is derived from the amount remaining over the days remaining in the period, minus the buffer. No flat divide-by-four.

## 2. Running-inventory representation

A new pure module `src/lib/mealPlan/inventory.ts`, built on the Phase 1 engine's existing consolidation, unit conversion and pantry matching (nothing duplicated).

Representation: per ingredient identity key, a list of lots.

```text
Lot { identityKey, quantity, unit, origin: "pantry" | "purchased",
      expiresOn: string | null, purchaseCost: number | null }
```

Simulation walks meals in date order:
1. scale the recipe's ingredients to the required servings (existing engine logic)
2. draw from existing lots first — compatible units only (`convertQuantity`; refused conversions keep lots separate)
3. among compatible lots, consume soonest-expiring first, pantry before purchased
4. whatever remains is the missing quantity for that meal
5. price the missing quantity through the Phase 1 resolver and buy in whole packs where a pack size is genuinely known
6. the purchased lot enters the inventory; the unconsumed remainder stays there for later meals

The real pantry is never touched — this is an in-memory model that lives only for the duration of a draft.

## 3. Expiry handling

- Real pantry lots carry their known expiry date; consumption prefers the soonest.
- Purchased lots have no expiry unless one is genuinely known — they stay expiry-unknown, never invented.
- "Rescued" is only reported when a compatible quantity whose expiry falls inside or just after the planning window is actually allocated to a meal. A name match alone never counts.

## 4. Budget calculation and unpriced items

All arithmetic is the deterministic engine's; the AI never decides whether a plan fits. Reported separately, as Phase 1 already models them:
estimated purchase spend (the figure compared to the budget), consumed ingredient value, pantry value used, estimated leftovers from purchased packs, unpriced item count, confidence.

An unpriced ingredient is never zero. With any unpriced lines the status is stated as incomplete, e.g. `Estimated 910 SEK + 2 unpriced items`, and never as a confident "under budget".

## 5. Optimisation loop

1. Generate the initial valid Phase 3 plan (allergy/diet/time validated).
2. Evaluate deterministically through the inventory simulation.
3. If over budget: pick the slots whose meals contribute most new purchase spend, and identify pantry quantities and purchased leftovers that are going unused.
4. Ask the planner for replacement candidates for those specific slots only, passing the engine's own numbers and the unused-inventory hints. Candidates go through the same Phase 3 eligibility check in code.
5. Recalculate the whole plan, not the changed meal.

Bounded rounds (3). Stops early when within budget or when a round yields no improvement. Allergies and dietary constraints are never relaxed; servings are never silently reduced. If the target is unreachable, the best valid plan found is returned with the estimated difference stated plainly.

## 6. Whole-plan objective

Minimised jointly across the period: new purchase spend + unused purchased quantity + food likely to expire unused. Pantry use and expiring-item rescue improve the score; a substitution is only accepted when the whole-plan score improves. A repetition penalty keeps the optimiser from collapsing the week onto one cheap recipe.

## 7. Draft review summary (budget on)

Added beneath the existing Phase 3 summary:

```text
Weekly budget      1,200 SEK
Estimated shopping ~940 SEK  (+2 unpriced items)
Budget remaining   ~260 SEK
Pantry used 8 · Expiring rescued 3 · Leftovers ~120 SEK
Confidence Fair
```

Everything is labelled as an estimate. No supermarket-price precision is implied.

## 8. Per-meal information

One or two short plain lines per meal, from the simulation's own allocations:
"Uses spinach you have", "Uses leftover feta from Monday", "Rescues mushrooms expiring tomorrow", "~85 SEK additional shopping". No tables, no ledgers.

## 9. Single-slot regeneration

Regenerating one slot replaces that meal, then re-runs the whole simulation from the start of the period, because shared ingredients, leftovers and total spend all shift. The summary and every per-meal line are refreshed together.

## 10. Acceptance and grocery list

Acceptance is unchanged: accepted meals become ordinary meal-plan entries and grocery generation stays the existing flow. Before acceptance, a reconciliation check compares the simulation's missing quantities with what the existing grocery engine would produce for the same meals and pantry; comparable lines that disagree are surfaced as a caveat rather than resolved by a second calculation.

## Keeping the two engines from diverging

Both read from the same primitives — `convertQuantity`, `normalizeIngredientName`, `ingredientsMatch`, `inferCategory`, `normalizeUnit` in `src/lib/grocery.ts` — and the simulation consolidates through the Phase 1 engine's existing code path. Pack purchasing and leftovers are the only thing the simulation adds on top; consumption requirements come from shared logic. A test asserts agreement between the two for a plan with no pack rounding.

## Technical notes

- New: `src/lib/mealPlan/inventory.ts` (simulation + whole-plan scoring), `src/lib/mealPlan/optimize.ts` (bounded substitution loop), `inventory.test.ts`.
- Changed: `GenerateMealPlanSheet.tsx` (collapsed budget section), `DraftReviewSheet.tsx` (budget summary + per-meal reasons), `src/lib/mealPlan/generate.ts` (return the cost result alongside the draft), `supabase/functions/meal-plan-generate/index.ts` (an additional targeted-substitution request shape).
- No schema changes. No supermarket integrations, receipt scanning, historical budget snapshots, pantry mutation or live retailer prices.
