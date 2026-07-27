# Fuudit Changelog

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
