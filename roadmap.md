# Roadmap

## In progress — Phase 3: AI meal-plan generation (budget deferred to Phase 4)

- [ ] Inspect remaining pieces: chef edge function pattern, `_shared` helpers, recipe search hook/repo, GenerateGrocerySheet API
- [ ] Deterministic candidate scoring (pure, tested): pantry overlap, quantity-compatible matches, expiring-soon overlap, cooking time, diet/allergy compatibility
- [ ] Edge function `meal-plan-generate`: whole-week selection/ranking among real catalogue candidates, strict output
- [ ] Generate setup sheet on existing Meal Plan screen (no budget UI)
- [ ] Draft review state: keep/remove/regenerate one slot; occupied slots default to Keep, never silently overwritten
- [ ] Accept via existing add-to-plan path (full recipe detail cached; no incomplete records)
- [ ] Optional hand-off to existing grocery generation after acceptance
- [ ] Allergy/diet validation in code after the model answers; failed slots left unresolved, retryable
- [ ] Tests + typecheck + build; update CHANGELOG

## Later

- Phase 4: budget-aware optimisation (cost engine loop, budget summaries, per-meal cost) — Phase 1/2 infra stays intact
- Backfill CHANGELOG entries for slices 7 & 8
- Real-world Chef verification on iPhone PWA

## Blocked / waiting

- Real-world testing feedback from the installed iPhone PWA (no further UX changes until friction or blocking issues reported)
