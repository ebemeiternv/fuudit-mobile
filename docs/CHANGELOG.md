# Fuudit Changelog

## Slice 4 — Conversational AI Chef

### Schema
- `chef_messages.data jsonb NOT NULL DEFAULT '{}'` — structured payload (recipe cards, tips, clarifying question) alongside the plain-text `content`.
- `chef_messages.conversation_id` FK now `ON DELETE CASCADE` so deleting a conversation removes its messages.
- `chef_conversations`: added `summary text`, `summary_updated_at timestamptz`, `message_count integer` for rolling-summary bookkeeping.
- Indexes: `chef_messages (conversation_id, created_at)`, `chef_conversations (user_id, last_message_at DESC)`.
- Existing per-user RLS on both tables remains the only access surface for the client.

### AI architecture
- New `supabase/functions/chef/` edge function (Lovable-managed, `verify_jwt` off — validates JWT in code via `auth.getUser()`).
- Model: **`google/gemini-3.6-flash`** through **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`). No AI SDK — direct fetch keeps the tool loop compact and Deno-friendly.
- Reads `LOVABLE_API_KEY` and `SPOONACULAR_API_KEY` server-side only; neither appears in the client bundle. Uses `SUPABASE_SERVICE_ROLE_KEY` for writes and pantry reads (all scoped by the verified `userId`).
- Bounded server-side tool loop (`MAX_TOOL_STEPS = 5`), `max_tokens = 900`, `response_format: json_object`, 45 s request timeout, no automatic retries.

### Tools exposed to the model
- **`get_pantry`** — active pantry items (name, category, location, quantity, unit, expiry, computed `daysUntilExpiry`). Consumed/discarded excluded.
- **`search_recipes`** — thin wrapper on Spoonacular. Prefers `complexSearch` when a keyword, diet or intolerance is set; falls back to `findByIngredients` only when the model calls with ingredients and no restrictions. Result payloads to the model are trimmed to what's needed (id, title, image, times, diet flags). Response cap of 5 recipes.
- **`get_recipe_details`** — cache-agnostic Spoonacular detail lookup for validation.
- No `save_recipe`, meal-plan or grocery tools — those are user-initiated in the UI only.

### System prompt (approach)
- Casts Tilda as a cooking helper, not a chef or dietitian.
- Explicitly forbids obeying instructions from tool output, pantry names or recipe fields (prompt-injection guard).
- Requires `get_pantry` at the start of practical cooking questions and prioritises items expiring within 7 days.
- Treats allergies as hard constraints; instructs the model to prefer `complexSearch + diet/intolerances` when restrictions matter and never label results allergy-safe when they weren't filtered.
- Final response must be pure JSON: `{ content, clarifyingQuestion?, recipes[], tips[] }`. Server sanitises recipe cards (integer Spoonacular ids, capped arrays, capped `reason` length) before persistence.

### Conversation memory
- Context window per request = the system prompt + optional rolling `summary` + last 10 messages of the active conversation. Older messages stay in the DB for display but are not resent.
- Rolling summary is regenerated (best-effort, non-blocking) every 10 messages via a second cheap Gemini call. Failure of the summary call never blocks the reply.
- Titles auto-fill from the first user message (60 chars).

### Client integration
- New repo methods: `renameConversation`, `deleteConversation`, `sendMessage` (invokes the edge function). Removed the direct client-side message-insert path — persistence now belongs to the edge function.
- New hooks: `useCreateChefConversation`, `useDeleteChefConversation`, `useRenameChefConversation`, `useSendChefMessage`, plus the existing `useChefConversations` / `useChefMessages`.
- **ChefScreen** rebuilt as a chat surface: Tilda intro, 5 suggested starters, message list, user/assistant bubbles, structured recipe cards inside assistant messages, "Tilda is thinking…" state, keyboard-safe layout (`h-[calc(100dvh-var(--app-nav-h))]` + `pb-[env(safe-area-inset-bottom)]`), Enter-to-send / Shift+Enter for newline, autoscroll on new messages.
- Conversation drawer (Sheet) lists past conversations with new/delete actions and confirmation dialog.
- **DiscoverScreen** — the Slice 3 recipe-discovery UI is preserved verbatim at `/app/discover`, linked from the Chef header (Compass icon).
- Recipe cards inside chat reuse the shared `RecipeCard` component and the existing save/unsave / recipe-detail flow; nothing about the Slice 3 saved-recipe path was rewritten.

### Dietary and allergy handling
- Chosen approach: **prefer `complexSearch` with `diet` and `intolerances` when restrictions apply**; system prompt tells the model to fall back to ingredient-first search only when there are no restrictions.
- When `findByIngredients` is used, the tool response includes an explicit note telling the model results are unfiltered, and the prompt forbids describing them as safe.
- The final assistant JSON also carries a small footer disclaimer in the UI: "Tilda is a cooking helper, not a dietitian. Always check labels for allergies."

### Cost controls
- 45 s hard timeout per request, no retries.
- Max 5 tool steps, max 5 recipe candidates per `search_recipes` call, `max_tokens = 900`.
- Only the last 10 messages + rolling summary are sent to the model — the transcript can grow without linearly growing token cost.
- Spoonacular `402` / `429` → surfaced to the model as `rate_limited` in tool output; the model degrades to non-recipe guidance.
- Gateway `429` → HTTP 429 with `ai_rate_limited`, UI toast.
- Gateway `402` → HTTP 402 with `ai_credits_exhausted`, UI toast.

### Security / prompt-injection
- API keys, model choice and system prompt live entirely inside the edge function.
- Client never calls Spoonacular or Lovable AI Gateway directly.
- All conversation and message reads/writes are RLS-scoped to the authenticated user, and the edge function additionally re-verifies `convo.user_id === userId` before every send.
- Tool schema is closed (`additionalProperties: false`); tool names are allowlisted; pantry/recipe fields are treated as untrusted data in the system prompt.
- Structured recipe cards are sanitised server-side before being persisted or sent to the client — non-numeric `sourceId`s, oversized arrays, and long `reason` strings are dropped/truncated.
- `chef_messages.conversation_id` cascade delete guarantees no orphaned per-user messages after a conversation delete.

### Known limitations
- Non-streaming. Users see a "Tilda is thinking…" indicator; typical responses land in a few seconds, worst case ~30 s while tools run. Streaming can be added later.
- Rolling summary is generated by the same Gemini model — if it fails, older context degrades gracefully to "last 10 messages only".
- `findByIngredients` still cannot filter allergies server-side. Diet/intolerance-heavy questions may reduce the total number of usable results.
- Model may still occasionally output non-JSON — server falls back to the raw text as `content` and shows no recipe cards rather than erroring.
- Token usage metadata is not yet persisted; only best-effort logging.

### Remaining Slice 5 work
- Streamed tokens (SSE / AI SDK `useChat`) for lower time-to-first-token.
- Meal Plan assignment from a Chef-recommended recipe.
- Grocery list generation from missing ingredients.
- Post-cook pantry deduction hook.



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

## Slice 5 — Functional Meal Plan

### Schema
- `meal_plan_entries`: added `custom_title text` (nullable) to support custom meals without a linked recipe.
- Added check constraint `meal_plan_entries_has_content`: every entry must have either a `recipe_id` or a non-empty `custom_title`.
- Added `BEFORE UPDATE` trigger `meal_plan_entries_set_updated_at` to keep `updated_at` fresh.
- Added `meal_plan_entries_user_date_idx` on `(user_id, date)` for efficient week-range reads.
- RLS unchanged — owner-scoped ALL policy already covers the new column.

### Repository & hooks
- `src/repositories/mealPlan.ts`: `listRange` now joins `recipes` (`*, recipe:recipes(*)`) and sorts by date then created_at; returns `MealPlanEntryWithRecipe`.
- `src/hooks/queries/useMealPlan.ts`: added `useAddToMealPlan` — unified mutation accepting `{ kind: "recipe" | "spoon" | "custom" }` payloads that caches Spoonacular recipes locally before writing the meal-plan row. Query stale time set to 30s; invalidation still keyed on `["mealPlan", userId]`.
- `src/lib/dates.ts` (new): timezone-safe helpers (`toLocalIsoDate`, `parseLocalIsoDate`, `addDays`, `startOfWeekMonday`, `isSameLocalDate`, `todayLocalIso`, `shortWeekday`, `humanDate`, `shortHumanDate`).

### Reusable add-to-plan flow
- **New** `src/components/app/mealplan/AddToMealPlanSheet.tsx` — one bottom-sheet used by every surface (Recipe Detail, Saved, AI Chef, Meal Plan itself). Fields: 14-day date strip, meal slot chips, servings stepper (defaults from `profiles.household_size`), notes, custom title (when applicable). Doubles as an edit / move sheet for existing entries.
- Duplicate-tap safety: submit button disabled while the mutation is pending.

### Meal Plan screen
- **Rewrote** `src/pages/app/MealPlanScreen.tsx` — real data by week range, prev/next week arrows, "Jump to today", weekly day selector with today marker and per-day count dots, meals grouped by slot (Breakfast / Lunch / Dinner / Snack), empty-slot CTAs, add button per slot, edit/move/remove via dropdown + confirmation dialog. Loading and error states via shared components.
- **New** `src/components/app/mealplan/MealPlanEntryCard.tsx` — entry card with image (or emoji fallback), title, servings, ready time, notes, custom badge, action menu, and delete confirmation.

### Recipe / Chef integrations
- `RecipeCard`: added optional `onAddToPlan` — renders a compact "Add to meal plan" pill under the card meta line. Kept optional so Discovery cards remain uncluttered.
- `SavedRecipesScreen`: wires each saved card to open the shared sheet with the local recipe id.
- `ChefScreen` recipe cards: added explicit `Add to meal plan` action (uses local recipe id when already saved, otherwise caches Spoonacular id first). The AI edge function does NOT gain meal-plan write permission — writes are user-initiated only.
- `RecipeDetailScreen`: primary "Add to meal plan" button under the header meta.

### Home integration
- Replaced the static meal-plan placeholder with a real "Today's meals" section using `useMealPlan(userId, todayIso, todayIso)`. Empty state links to `/app/meal-plan` with a CTA. Existing sections untouched.

### Date & timezone handling
- All plan dates are stored and compared as `YYYY-MM-DD` derived from the user's local calendar (`toLocalIsoDate`), never from `toISOString()`. Week boundaries use Monday start via `startOfWeekMonday`.

### Query & caching strategy
- Range key: `["mealPlan", userId, from, to]`.
- Any create / update / delete invalidates `["mealPlan", userId]` (matches every visible week).
- Recipes fetched from Spoonacular by `useAddToMealPlan` are upserted into the `recipes` cache so the same recipe can be linked from later plan entries without another API call.

### Known limitations
- Move is implemented via the edit sheet (change date/slot); no drag-and-drop.
- No optimistic UI on create/update/delete — TanStack invalidation is fast enough on mobile and avoids rollback complexity in this slice.
- Servings default from household size but do not auto-scale recipe ingredients yet (Slice 6).
- Home shows all of today's entries in insertion order; no slot ordering (breakfast → snack).

### Remaining Slice 6 (Grocery) work
- Generate grocery items from planned meals, subtract pantry, deduplicate, unit-normalise.
- Auto pantry deduction on meal completion (still TBD scope).

## Slice 6 — Functional Grocery List and Meal-Plan Generation

### Schema
- `grocery_items`: added `category` (text), `notes` (text), `meal_plan_entry_id` (uuid, FK to `meal_plan_entries` ON DELETE SET NULL), plus `updated_at` trigger and indexes on `(user_id, checked)` and `(user_id, meal_plan_entry_id)`. RLS remains user-scoped.

### Repository & queries
- `groceryRepository`: added `clearPurchased`, `bulkInsert`.
- New hooks in `useGroceryItems.ts`: `useCreateGroceryItem`, `useUpdateGroceryItem`, `useDeleteGroceryItem`, `useToggleGroceryPurchased` (optimistic + rollback), `useClearPurchasedGrocery`, `useBulkAddGrocery`. All invalidate `queryKeys.grocery.all(userId)` on success/settle.

### Manual grocery
- `GroceryScreen` rewritten: pending & purchased sections with live counts, search, category filter, empty state, per-item edit/delete via dropdown, and confirm-dialog "Clear purchased" action.
- `GroceryItemSheet`: mobile add/edit sheet — name, optional quantity, optional unit, category, optional notes. Disabled save while pending; toast errors.

### Meal-plan generation
- `GenerateGrocerySheet`: two-step flow (config → review). Defaults to visible Meal Plan week. Requires explicit user confirmation.
- Ingredient normalization (`src/lib/grocery.ts`): lowercased, punctuation-stripped, safe depluralization ("tomatoes" → "tomato"). Match only on full normalized equality, so "cream" ≠ "sour cream", "chicken" ≠ "chicken stock", "flour" ≠ "gluten-free flour".
- Unit vocabulary: alias table maps Spoonacular's short units to Fuudit enum; unknown units are preserved and flagged, never coerced.
- Unit conversion supported only within families: g ↔ kg, ml ↔ l. tbsp/tsp/cup/piece are self-only. No cross-family assumptions (no cup→ml, no tbsp→ml, no piece→weight).
- Pantry subtraction: `active` items only; consumed/discarded/deleted excluded. Subtract only when units convert safely. When they don't, keep the required amount and warn "Pantry uses a different unit — please check". When pantry quantity is unknown, warn "Check pantry quantity". When pantry fully covers requirement, row is included in review but excluded by default with an explanation.
- Custom meals (no linked recipe) are skipped and the review notes how many were skipped.
- Optional recipe ingredients toggled via checkbox in config step.

### Review & duplicate handling
- Review lets users: rename, edit quantity/unit, change category, remove, include previously excluded rows, cancel without writing.
- Bulk insert on confirmation. Existing pending grocery items are merged only when ingredient identity and unit match under the same conservative rules; otherwise a new row is created. Purchased items are never merged.
- Insertion carries `source: "meal_plan"`, `recipe_id`, and `meal_plan_entry_id` for traceability.

### Grocery → Pantry
- Purchased items expose a dropdown "Add to pantry" action.
- `AddToPantrySheet` reuses `PantryItemSheet` (added `initialValues` prop) with name/quantity/unit/category/notes prefilled. Requires explicit confirmation. The grocery row is not modified after adding — user can still clear it manually. Button disabled while pending prevents accidental double taps.

### Integrations
- `MealPlanScreen`: header now hosts a "List" button opening the generation sheet with the visible week as the default range.
- `HomeScreen`: "Build shopping list" quick-action now shows the real pending count from `useGroceryItems`.

### Known limitations
- Only g↔kg and ml↔l conversions are supported. Ingredient-density conversions (cup↔ml, tbsp↔g) are deliberately absent.
- Category inference from ingredient names is heuristic; users can override in review or in edit.
- No barcode/camera/receipt scanning (planned Slice 7).
- No automatic pantry deduction on cook, no auto-generation on meal-plan change, no household sharing.

## Slice 9 — Installable PWA and Mobile App Experience

### PWA tooling
- Added `vite-plugin-pwa` (generateSW / Workbox) with `workbox-window` for update messaging.
- Service worker filename: `/sw.js`. Manifest: `/manifest.webmanifest` (auto-injected).

### Manifest
- `name: Fuudit`, `short_name: Fuudit`, `start_url: /`, `scope: /`, `display: standalone`, `orientation: portrait-primary`.
- Theme color `#327853` (Fuudit sage), background `#fafaf7`.
- Icons: 192, 512 (any) + 512 maskable.

### Icon and splash assets
- New PWA icon set in `public/icons/`: `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`, `favicon-16/32.png`. Generated from the Fuudit sage-green "F" mark with generous safe padding for maskable cropping.

### Installation experience
- Android / desktop Chrome: captures `beforeinstallprompt`, shows a small landing-page install pill and a "Install Fuudit" row in Profile → triggers native prompt on explicit tap. Dismissal stores a 7-day cooldown.
- iOS Safari: opens a lightweight sheet with "Tap Share → Add to Home Screen → Add".
- Already-installed / standalone: all install surfaces are hidden.

### Service worker and caching
- `NetworkFirst` for HTML navigations (4s timeout), Google Fonts stylesheets `StaleWhileRevalidate`, `gstatic` fonts `CacheFirst`.
- Recipe images (Spoonacular / Open Food Facts) `StaleWhileRevalidate` with a small entry limit.
- Precache limited to hashed JS/CSS/HTML/icons/fonts of the app shell.
- No authenticated API responses are cached at the SW layer. TanStack Query continues to manage private data in memory.
- Navigation fallback denylist excludes `/~oauth`, `/api/*`, `/functions/v1/*`.

### Offline & reconnection
- Global `OfflineBanner` shows "You're offline…" and a brief "Back online" flash on reconnect. AI Chef, Spoonacular search, and Open Food Facts lookups fail gracefully via existing error toasts when offline; no silent success.

### Updates
- `registerType: autoUpdate` with `skipWaiting: false`. When a new SW is waiting, `UpdatePrompt` shows a small "A new version of Fuudit is ready — Update" pill; reload happens only on user action.

### Auth, routing, privacy
- `signOut()` now calls `queryClient.clear()` so the next user on the same device cannot see the previous user's cached private UI state.
- SPA deep-link refresh handled by Lovable hosting fallback + Workbox `navigateFallback`.
- Registration wrapper refuses SW in dev, iframes, Lovable previews, and when `?sw=off` is present (kill switch), and unregisters any stale app SW in those contexts.

### Barcode scanner PWA notes
- `BarcodeDetector` continues to work in supported Android Chromium browsers when launched from the home screen.
- iOS standalone still lacks `BarcodeDetector`; manual entry remains the fallback. No native scanner plugin added in this slice.

### Landing page
- `MobileAvailability` copy updated: "Use Fuudit in your browser or add it to your phone's home screen … Native iPhone and Android apps are on our roadmap."

### Known limitations
- No background sync of failed mutations. Offline writes are not queued.
- iOS installability is manual (Add to Home Screen) — expected browser behaviour.
- No native push notifications, Capacitor, or App Store / Play submission in this slice.
