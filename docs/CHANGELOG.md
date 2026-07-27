# Fuudit Changelog

## Slice 3 — Spoonacular Recipe Discovery, Detail & Saved Recipes

### Schema
- **No migration required.** Existing `recipes` table already has `source`, `source_id`, `title`, `image`, `servings`, `ready_minutes`, `ingredients jsonb`, `instructions text`, `data jsonb`, plus a unique index on `(source, source_id)` — enough to store nutrition, dietary tags, source URL, credits and license inside `data`. `saved_recipes` already has unique `(user_id, recipe_id)` and per-user RLS.

### Spoonacular integration
- New edge function `supabase/functions/spoonacular/index.ts` — the only place the API key is used.
- Reads `SPOONACULAR_API_KEY` from server-side env. Missing key → HTTP 503 with `code: "missing_api_key"`; UI shows a stable "Recipe service unavailable" state.
- Actions: `search` (`/recipes/complexSearch` with `addRecipeInformation=true`, `instructionsRequired=true`), `byIngredients` (`/recipes/findByIngredients` with `ignorePantry=true`, `ranking=1` to maximise pantry usage), `detail` (`/recipes/{id}/information?includeNutrition=true`).
- Input validation on every request (action allowlist, integer id, string ingredient array capped at 20). Returns typed error codes for `rate_limited` (Spoonacular signals quota via 402), `unauthorized`, `not_found`, `upstream_error`.
- The client never calls `api.spoonacular.com` directly; all traffic goes via `supabase.functions.invoke("spoonacular", …)`.

### Client integration
- `src/lib/spoonacular.ts`: shared types + `normalizeSpoonRecipe`, `pantryNamesToIngredients`, `pickSpoonDiet`, `pickSpoonIntolerances`. Robust to missing fields.
- `src/lib/sanitizeHtml.ts`: DOMPurify wrapper (allowed tags: inline formatting + safe links only) — used for Spoonacular's `summary` and `instructions` HTML.
- `src/lib/spoonErrors.ts`: maps thrown errors to user-friendly `title` / `description`.
- `src/repositories/spoonacular.ts`: thin client over the edge function; typed error surface.
- `src/repositories/recipes.ts`: `upsertFromSpoonacular` (idempotent on `(source, source_id)`), `getById`, `findBySourceId`.
- `src/hooks/queries/useRecipes.ts`: `useRecipeSearch`, `useRecipesByIngredients`, `useRecipeDetail` (cache-first, upserts on miss), `useSaveSpoonacularRecipe` (fetches full detail and caches it before saving so saved recipes stay viewable offline). Duplicate-key errors (`23505`) on save are swallowed.

### Recipe caching
- Every recipe the user opens or saves is upserted into `public.recipes` keyed on `(source='spoonacular', source_id=<spoon id>)`. Duplicates are prevented by the existing unique index.
- Cached rows include normalized ingredients (name, amount, unit, original) and structured steps under `data.steps`, plus `data.summary`, `data.diets`, `data.dishTypes`, `data.nutrition`, `data.sourceUrl`, `data.sourceName`, `data.creditsText`, `data.license`.
- Saved recipes read from the local cache, so the saved list stays viewable when Spoonacular is unavailable.

### Screens
- **Rewrote** `src/pages/app/ChefScreen.tsx` — now a **Recipe Discovery** screen (no chat AI). Two modes: keyword `Search` and `From pantry` (chips seeded from active pantry items, expiring items marked and prioritised). Applies the user's profile `diet` + `intolerances`. Save/unsave from card. Attribution footer.
- **New** `src/pages/app/RecipeDetailScreen.tsx` at `/app/recipes/:source/:id` (`source` is `local` or `spoon`). Hero image, prep time, servings, dietary tags, ingredients list, step-by-step instructions (falls back to sanitized `instructions` HTML when no steps), key nutrients per serving, "View original recipe" link, source credits + license.
- **New** `src/pages/app/SavedRecipesScreen.tsx` at `/app/saved` — search by title, filter by dietary tag (only tags actually present are shown), unsave inline, empty/error/loading states.
- `ProfileScreen.tsx` now shows real saved-recipe count and links to `/app/saved`.

### Attribution & compliance
- Spoonacular's TOS requires visible attribution to Spoonacular AND to the recipe's original source when provided (`sourceUrl`, `sourceName`, `creditsText`, `license`).
- Discovery screen carries "Recipe data powered by Spoonacular." at the bottom.
- Recipe detail shows the recipe's `creditsText` (or `sourceName`, or a Spoonacular fallback) plus the `license` string, and offers a prominent "View original recipe on {source}" outbound link with `rel="noopener noreferrer"`.
- Any HTML from Spoonacular (`summary`, `instructions`) is sanitized with DOMPurify before rendering.

### Known limitations & API-cost notes
- Spoonacular free tier is 150 points/day; `complexSearch` costs 1 pt + 0.01 per result, `findByIngredients` is 1 pt/result, detail is 1 pt. Search + detail-on-save can burn quota quickly — mitigated by 5 min (list) / 30 min (detail) `staleTime`, cache-first detail lookup, and no automatic prefetching.
- `findByIngredients` doesn't accept diet/intolerance params server-side; we apply diet/intolerances only to keyword search. Pantry-mode results are not filtered by the profile's dietary prefs — a known Spoonacular limitation.
- Pantry ingredient names are sent as-is; brand-specific or verbose names may match poorly.
- No offline write path: unsaving while offline will fail (recipes list remains readable from local cache).

### Remaining Slice 4 work
- Real AI Chef: conversational assistant grounded in pantry + saved recipes (`chef_conversations`, `chef_messages` tables already exist).
- Meal plan assignment from a recipe.
- Grocery list generation from a recipe's missing ingredients.



## Slice 2 — Pantry Events & Real Impact Data

### Database
- New enum `pantry_event_type` (`added`, `consumed`, `discarded`, `deleted`).
- New table `public.pantry_events` (append-only): `user_id`, nullable `pantry_item_id`, `event_type`, `item_name`, `category`, `quantity`, `unit`, `occurred_at`.
- Indexes on `(user_id, occurred_at DESC)` and `(user_id, event_type)`.
- RLS: users can only `SELECT` and `INSERT` their own events. No `UPDATE`/`DELETE` policy exists — events are immutable from the client. Grants: `SELECT, INSERT` to `authenticated`, `ALL` to `service_role`.

### Event-logging behaviour
- `added` event on pantry-item creation.
- `consumed` / `discarded` event on status change, only when the status actually transitions (prevents duplicates on retry / re-tap).
- `deleted` event on permanent deletion, with `pantry_item_id` set to `null` so history survives item removal.
- Every event snapshots `item_name`, `category`, `quantity`, `unit` so history is stable even if the source item is later edited or deleted.
- Event-log failures are logged to console but never block the user's pantry action.

### Repository & hooks
- `src/repositories/pantryEvents.ts` (new): `list`, `log`.
- `src/hooks/queries/usePantryItems.ts`: added `usePantryEvents`; wired event logging into `useCreatePantryItem`, `useDeletePantryItem`, `useSetPantryItemStatus`. `useDeletePantryItem` now takes the full `PantryItem` (needed for the snapshot). `useSetPantryItemStatus` now takes `{ item, status }`.
- `src/hooks/queries/usePantryImpact.ts` (new): derives `consumed`, `discarded`, `active`, `consumedPct` (only when `consumed + discarded >= 3`), plus month-scoped variants.
- `queryKeys.pantry.events` added; mutations invalidate both `pantry.all` and `pantry.events`.

### Components / screens
- **New** `src/pages/app/PantryHistoryScreen.tsx` — grouped by day (most recent first), filter by `consumed` / `discarded` / `deleted`, uses shared `LoadingState` / `EmptyState` / `ErrorState`.
- `PantryScreen.tsx` header now has a History button linking to `/app/pantry/history`.
- `HomeScreen.tsx` impact card rewritten: real counts of items consumed / discarded / active, and a `consumedPct` line only when data is sufficient. Starter state with CTA when there is no data yet. No more hardcoded kg / € / CO₂ / streak claims.
- `ProfileScreen.tsx` top stats replaced with `Consumed`, `Discarded`, `Used %` from live events.
- Route added: `/app/pantry/history`.

### Known limitations / trade-offs
- No kg / € / CO₂ / streak metrics — the data model can't compute those accurately yet, so we intentionally omit them.
- No restore action from history (deferred).
- History dates use the browser locale; the underlying `occurred_at` is `timestamptz` so it renders in the user's local timezone.
- Event logging is client-side after each mutation; a hard crash between mutation success and event insert can drop an event. Acceptable for MVP — inserts are fast and same-origin. A DB trigger can enforce this later without changing the client.

### Planned future
- Barcode scan / camera capture / receipt parsing (separate future slice).
- Restore-from-history action.
- Weight / cost estimates once we can attach reference data.



## Slice 1 — Functional Pantry MVP

### Database
- Added enum `pantry_item_status` (`active`, `consumed`, `discarded`).
- Extended `pantry_items` with `category` (text), `purchased_on` (date), `status` (defaults to `active`).
- Added indexes `pantry_items(user_id, status)` and `pantry_items(user_id, expires_on)`.
- Existing RLS unchanged — users still only see and manage their own rows.

### Repository & hooks
- `src/repositories/pantry.ts`: renamed list to `listActive` (filters `status = 'active'`), added `setStatus`, reordered by nearest expiry then recency.
- `src/hooks/queries/usePantryItems.ts`: added `useSetPantryItemStatus`; kept keys/invalidation on `queryKeys.pantry.all(userId)`.
- `src/lib/pantry.ts` (new): constants (`CATEGORIES`, `LOCATIONS`, `UNITS`) and timezone-safe helpers (`daysUntilExpiry`, `expiryBucket`, `expiryLabel`, `expiryTone`, `toLocalDateString`, `parseLocalDate`).

### Components
- **New** `src/components/app/pantry/PantryItemSheet.tsx` — mobile bottom sheet for add/edit with name, quantity, unit, category, location, expiry date, purchase date, notes; zod validation; disabled saving state; toast error feedback.
- **Rewrote** `src/pages/app/PantryScreen.tsx` — real data, search, category + location filters, expiry/recent sort, real category tile counts, real "needs attention" count, per-item menu (Edit / Consumed / Discarded / Delete with confirmation).
- **Rewrote** `src/pages/app/HomeScreen.tsx` "Use these soon" — real pantry data, next 7 days, max 5 items, nearest expiry first, empty-state CTA to Pantry.

### Functionality completed
- Add / edit / delete / consume / discard pantry items.
- Search by name, filter by category, filter by location, sort by expiry or recency.
- Timezone-safe local expiry buckets: expired / today / tomorrow / within 3 days / within 7 days / no expiry.
- Category tiles reflect live counts of active items.
- Loading, empty, error, no-search-results and no-filter-results states.
- Home screen "Use these soon" wired to real data with proper empty state.

### Known limitations / trade-offs
- Consumed/discarded items are retained in the database but hidden from the main pantry list; there is no dedicated history view yet.
- Category tiles show the first four canonical categories only (Produce, Dairy, Meat & Fish, Bakery); other categories are still filterable via the dropdown.
- No barcode / camera / receipt / AI-expiry — deferred as per slice scope.
- Impact card on Home is still a static placeholder (out of scope for Slice 1).

### Remaining Slice 2 work
- Spoonacular integration + recipe caching.
- AI Chef edge function using pantry context.
- Wire Chef conversation persistence to the screen.
