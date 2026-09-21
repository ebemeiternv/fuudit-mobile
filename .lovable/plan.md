# Phase 3 — AI-assisted generation inside the existing Meal Plan

No new Meal Plan feature, no parallel screen, no second data model. Generation is one more way to fill the meal plan you already have. Manual planning stays exactly as it is today.

## What already exists (and gets reused untouched)

- **Meal Plan screen** — week navigation, day strip with per-day meal counts, the four slot sections (Breakfast / Lunch / Dinner / Snack), each with its own "Add" action and dashed empty state, a "List" button that opens grocery generation, and a "+" button in the header.
- **Meal cards** — image, title, servings, cooking time, notes, and the Edit / Move / Remove menu.
- **Add-to-plan sheet** — recipe search, custom meals, servings, notes.
- **One save path** — the existing add-to-plan logic already caches a recipe locally before creating the entry, so generated recipes need no new persistence code.
- **Grocery generation** — day selection, servings scaling, pantry matching and subtraction, duplicate consolidation, review step.
- **Phase 1 cost engine and Phase 2 defaults** — plan-wide consolidation, pantry subtraction, personal prices, budget defaults.

## What Phase 3 adds

### 1. One new entry point on the existing screen

Next to the existing "List" button in the Meal Plan header: **Generate**. Nothing else on the screen changes. Manual "+", per-slot "Add", editing, moving and removing keep working identically.

### 2. Generate sheet (setup)

A bottom sheet in the same style as the existing sheets, pre-filled from the Phase 2 profile defaults and overridable for this one session only (never written back unless the user asks):

- Which days (defaults to the days of the week currently in view, past days excluded)
- Which meals (from usual meals planned)
- Servings (from household size)
- Cooking time limit
- "Plan within my budget" — collapsed and optional, pre-filled with the default budget, currency and period
- Priorities: use what I have, rescue expiring food, nutrition style

Allergies and dietary preferences come from the profile and are shown as fixed, non-negotiable facts — not editable here and never relaxed.

### 3. Draft review state (temporary, not persisted)

The generated plan appears as a draft in a review sheet, held in memory only:

- Grouped by day and slot, matching the existing slot order and labels
- Each proposed meal shows title, cooking time, servings, and — when a budget was set — its estimated added cost with "You already have" / "Still needed"
- A calm summary at the top: estimated grocery cost, budget remaining, pantry ingredients used, expiring items rescued, cost per serving
- Per-meal actions: remove, or regenerate just that slot
- Slots that already contain a meal are skipped by default, with a clear "keep what's there" vs "replace" choice
- "Accept plan" writes the entries; "Discard" leaves the plan untouched

Nothing is written to the database until Accept.

### 4. Acceptance

Accept loops the draft through the **existing** add-to-plan path — the same one the manual sheet uses — so every accepted meal becomes an ordinary `meal_plan_entries` row with recipe, date, slot and servings. Afterwards the plan is just the normal Meal Plan: editable, movable, removable, indistinguishable from manually added meals. Optionally, a follow-up prompt opens the existing grocery generation for those days, so the list is produced by the code that already produces it.

### 5. Generation logic (server side)

A new edge function does the planning; the client only sends preferences and renders the result.

- Candidate recipes come from the existing recipe search, filtered by diet, allergies and cooking time
- The model's job is selection and substitution only — it never does arithmetic and never decides whether the plan fits the budget
- The Phase 1 cost engine evaluates the proposed plan deterministically: consolidate across the whole plan, subtract pantry, price only missing quantities, compare with the budget envelope
- If it is over budget, the engine's own numbers are fed back with a request for cheaper substitutions, then recalculated — a small bounded number of rounds
- Allergens are checked in code after the model answers; any plan containing one is rejected and regenerated
- If it still cannot fit, the user is told honestly how far over it lands — never a massaged number

### 6. Deliberately out of scope for Phase 3

Monthly envelope tracking, historical budget snapshots, supermarket integrations, receipt scanning, any redesign of the Meal Plan screen, and any change to how manual planning works.

## Technical notes

- **No schema changes.** The draft lives in React state; accepted meals use `meal_plan_entries` as-is. If persisted drafts are ever wanted, that is a separate proposal.
- **New files:** a generate sheet, a draft review sheet, a small draft type + accept helper, and one edge function (`meal-plan-generate`) using the standard Lovable AI model with a strict output schema.
- **Changed files:** the Meal Plan screen (one button plus two sheet mounts) and the meal-plan query hooks (a batch accept built on the existing add-to-plan mutation).
- **Reused as-is:** cost engine, price resolver, planning defaults parser, recipe caching, grocery generation, all existing meal-plan components.
- Generation and acceptance both invalidate the existing meal-plan queries, so the week view updates the way it already does.

## Suggested build order

1. Draft types + accept helper on top of the existing add-to-plan path
2. Edge function: unbudgeted generation (days, slots, diet, allergies, time, pantry-first)
3. Draft review sheet with per-meal keep/remove/regenerate
4. Budget evaluation loop and the summary card
5. Optional hand-off to the existing grocery generation after acceptance
