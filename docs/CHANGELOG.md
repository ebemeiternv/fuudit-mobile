# Fuudit Changelog

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
