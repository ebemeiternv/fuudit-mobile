# Fuudit Changelog

## Mobile Beta UX Audit — Round 2 (Deferred Friction)

Follow-up to Round 1. Fixes the medium-friction items logged for a second pass. No new features, no redesign, no changes to database / auth / Product Intelligence / service-worker strategy / navigation structure.

### Shared foundations

- **`src/index.css`** — introduced a shared `--app-nav-h: 68px` variable on `.app-shell`, a `.pb-nav` utility (content padding that clears bottom nav + iOS home indicator), and a `.hide-when-modal` utility that fades floating chrome when Radix locks the body (Dialog / Sheet open). Update prompt and Recipe Detail sticky bar both use this.
- **`tailwind.config.ts`** — added an `xs: 360px` breakpoint (inside `extend.screens`, so default `sm/md/lg` are preserved). Used to collapse BottomNav labels and Grocery header text on the tightest phones.

### Priority 1 — Auth screen and iOS keyboard

- `src/pages/Auth.tsx` no longer relies on `flex-1 justify-center` inside a `100dvh` shell. That combination re-centered the form when the iOS keyboard shrank the visual viewport, hiding social buttons above and pushing the submit CTA down. The layout is now top-aligned with `min-h-[100dvh]` so the whole page scrolls above the keyboard, with `safe-top` and `paddingBottom: calc(env(safe-area-inset-bottom) + 1.5rem)`. Back link is a 44 px min-height row. No visual redesign.

### Priority 2 — ScreenHeader narrow-width resilience

- `src/components/app/ScreenHeader.tsx` reworked as the shared responsive rule:
  - Left and right slots use `shrink-0` and never squeeze.
  - Title column uses `min-w-0 flex-1` and truncates by default. Screens that need wrapping opt in with the new `allowTitleWrap` prop.
  - Subtitle uses `line-clamp-2`.
  - Title steps down from 28 px to 26 px on `<sm` widths.
- `src/pages/app/GroceryScreen.tsx` — narrow-width polish: the "Generate" button is icon-only under `xs` (label appears at 360 px and up), preserving the "+" tap target and the "Grocery" title.

### Priority 3 — Bottom navigation crowding

- `src/components/app/BottomNav.tsx`:
  - `<nav aria-label="Primary">` for screen readers.
  - Every `NavLink` has an explicit `aria-label` (inactive tabs stay named even when the visible label is hidden).
  - Row is `min-h-11` so every tap target clears 44 px vertically, and each tab is `min-w-0` so long labels can't push neighbours off-screen.
  - Below `xs` (≤360 px) only the active tab shows its label; inactive tabs are icon-only visually but retain their accessible name. At 360 px+, all six labels return.
  - Decorative icon chips and label spans are marked `aria-hidden="true"` (the accessible name comes from the link's `aria-label`).

### Priority 4 — Update prompt vs floating actions

- `src/pwa/UpdatePrompt.tsx` now anchors to `calc(env(safe-area-inset-bottom) + var(--app-nav-h) + 0.75rem)` — a single source of truth shared with the bottom nav. That guarantees the prompt sits above the nav (and above iOS home indicator) but does not overlap Radix sheets: it now carries the shared `.hide-when-modal` class, so any open Sheet / Dialog / AlertDialog (which Radix locks the body for) hides it. The user-controlled update behaviour is unchanged.

### Priority 5 — Recipe Detail primary action

- `src/pages/app/RecipeDetailScreen.tsx`:
  - The mid-page "Add to meal plan" button is replaced by a persistent sticky bottom action bar. Same handler, same sheet — one primary CTA, always reachable with one hand.
  - The bar sits at `calc(env(safe-area-inset-bottom) + var(--app-nav-h))`, `z-30`, behind the Add-to-Meal-Plan sheet (`z-50`), and hides when a modal is open via `.hide-when-modal`.
  - Page uses the new `.pb-nav` utility so ingredients / nutrition / credits are not covered.
  - Back and Save buttons bumped to 44 px, both get `focus-visible:ring-2`, and Save gains `aria-pressed={isSaved}` plus an action-oriented label ("Save recipe" / "Remove from saved recipes").

### Priority 6 — Meal Plan action affordance

- `src/components/app/mealplan/MealPlanEntryCard.tsx` kebab trigger: bumped from 36 px to 44 px, changed from muted grey chip to a white surface with border + shadow so the affordance reads as tappable, kept the same menu contents (Edit / Move / Remove). `aria-label` is now action-specific — "Meal options for {title}" — and `aria-haspopup="menu"` is set. Focus ring added.

### Priority 7 — Accessibility cleanup

- Every icon in the changed components is now `aria-hidden="true"` (BottomNav icons and labels, MealPlanEntryCard kebab, Recipe Detail header + sticky bar, Grocery header, Auth back arrow).
- Icon-only buttons carry action-oriented `aria-label`s ("Save recipe" / "Remove from saved recipes", "Meal options for …", "Generate grocery list from meal plan", "Add grocery item").
- BottomNav uses `aria-label="Primary"` on the `<nav>` landmark.
- Radix Sheet / Dialog / AlertDialog components already provide announced titles via shadcn primitives — untouched.

### Remaining deferred / cosmetic

Still logged, not touched this round:
- Grocery row check circle visual size (32 px inside a 44 px row) — reads fine in testing.
- Chef send button visual size (40 px circle inside padded hit area).
- Empty-state copy tone consistency across Pantry / Meal Plan / Grocery.
- Offline banner + Update prompt vertical stacking when both appear (rare in beta; prompt now hides behind sheets, banner remains at top).
- Onboarding "skip for now" hit area.

### Manual iPhone testing checklist

1. Auth: open sign-in, tap email field — keyboard opens, "Sign in" button reachable by scrolling; social buttons never cover the CTA.
2. Auth: switch to signup — Name / Email / Password all scroll above keyboard.
3. Home / Pantry / Chef / Meals / Grocery / Profile at 320 px width: BottomNav shows six icons; the active tab's label appears; no clipping; every icon hit is at least 44 px.
4. Same screens at 375 px: all six labels appear, no overlap with headers.
5. Grocery header at 320 px: "Grocery" title + count fit on one line; "Generate" is icon-only; "+" is 44 px.
6. Pantry header: "Pantry" title + counts fit; "Scan" and "+" both remain tappable.
7. Recipe Detail: sticky "Add to meal plan" bar visible without scrolling. Tap it → sheet opens above the bar; the bar fades under the sheet; primary action inside the sheet reachable with keyboard open (dvh + hide-when-modal).
8. Meal Plan card: kebab now reads as a button (border + shadow); VoiceOver reads "Meal options for {title}, button, pop-up menu"; Edit / Move / Remove all fire.
9. Deploy new build → foreground the app → "A new version of Fuudit is ready" prompt sits above bottom nav but under any open sheet; tapping Update reloads once on same route.
10. Airplane mode + open a sheet: offline banner still visible at top; update prompt (if armed) hides under the sheet.
11. VoiceOver rotor: `nav` landmark named "Primary"; six tab links each announce their destination even when only the icon is visible.



## Mobile Beta UX Audit — Round 1

Audit of the installed PWA on iPhone-sized screens across all 16 flows. Focus: real-use friction, not redesign. Blocker and high-friction items are fixed in this pass; medium/cosmetic items are logged for a follow-up.

### Blocker / high-friction — fixed

**1. Barcode scan sheet claimed camera scanning as the primary path on iPhone.**
- User-facing problem: on iPhone Safari and the installed PWA the sheet still opened with "Scan product / Point the camera at the barcode" but the camera never appears (Apple ships no `BarcodeDetector` in the web view). The manual-entry fallback was rendered as a small grey helper note, and the "unsupported" copy read as an error.
- Severity: high friction (feature appears broken on the platform most beta testers use).
- Fix: `BarcodeScanSheet` now detects iOS/iPadOS and, when scanning capability is missing, (a) retitles the sheet to "Enter barcode / Type the number under the barcode to fetch product details.", (b) replaces the grey error card with a friendly primary-tinted block explaining that live scanning isn't available in the current iPhone web version and that native scanning is coming with the iPhone app, and (c) keeps standard manual Pantry entry reachable via the existing "Add manually" path in `PantryScreen`. No claim is made that camera scanning works on the iPhone PWA.

**2. Bottom sheets used `vh` instead of `dvh` — iOS keyboard clipped the submit button.**
- User-facing problem: on iPhone, opening the software keyboard inside Add-to-Meal-Plan and Profile sheets ("Household", "Dietary preferences", "Privacy", "Help") pushed the "Save" / primary action off-screen because `100vh` doesn't shrink with the keyboard on iOS Safari.
- Severity: high friction (users couldn't complete the flow without dismissing the keyboard).
- Fix: swapped every `max-h-[92vh]` / `max-h-[90vh]` sheet to `max-h-[92dvh]` / `max-h-[90dvh]` so the sheet resizes with the visible viewport. Affects `AddToMealPlanSheet` and all four `ProfileSheets` (`Household`, `Dietary`, `Privacy`, `Help`). Pantry, Grocery, Generate, and Barcode sheets already used `dvh` and are unchanged.

### Medium / cosmetic — deferred (not changed this pass)

Listed for approval before any edit lands:

- **BottomNav uses six equal columns.** On 320 px screens ("AI Chef", "Grocery") the labels sit close to the tab edges. Fix candidate: shrink label to 9 px on `<360 px` or drop the label to icon-only under a threshold.
- **`ScreenHeader` right slot can overlap the title on narrow widths.** Grocery header ("Generate" + "+") occupies ~120 px and can push the "Grocery" title to two lines on 320 px. Fix candidate: hide the "Generate" label under 360 px, keep the icon.
- **Update prompt bottom offset is `calc(env(safe-area-inset-bottom) + 6rem)`.** Correct above the bottom nav but sits over the FAB on Pantry/Grocery when the prompt appears. Fix candidate: shift the FAB up when the update handler is armed.
- **Recipe Detail "Add to meal plan" is a full-width secondary button below the fold.** Users must scroll past the ingredients list. Fix candidate: sticky bottom action bar with primary CTA.
- **Meal Plan entry menu ("Edit / Move / Remove") is behind a 32 px kebab button.** Meets 44 px hit area via padding but visual affordance is small. Fix candidate: swap for a right-side chevron with clearer semantics.
- **Grocery row check circle is 32 px.** Hits 44 px only via row padding; consider bumping the visible circle to 36 px.
- **Onboarding "skip for now" is a small underline.** Meets AA contrast but not 44 px. Fix candidate: pad to a full-width ghost button.
- **Auth screen keyboard scroll:** on iPhone the "Continue with Google" button can sit behind the keyboard when the email field has focus. Fix candidate: scroll target into view on focus.
- **Chef composer:** send button uses a 40 px circle; hit area is fine via padding but visual size could grow to 44 px for symmetry with pantry FAB.
- **Empty states across Pantry, Meal Plan, Grocery** share the same icon-in-tile pattern but with slightly different copy tones. Cosmetic consistency pass suggested.
- **Offline banner + Update prompt stacking:** if both appear together the update prompt is readable but the offline banner covers the "Discover" header. Fix candidate: push main content down by banner height when banner is visible.
- **Save-to-favourites heart on Recipe Detail** is unlabeled; add `aria-label="Save recipe" / "Unsave recipe"`.

### Preserved

Visual identity, navigation, authentication, database, Product Intelligence, Recipe Discovery, AI Chef, Meal Plan, Grocery loop, and the PWA service-worker update strategy are unchanged.

### iPhone PWA manual test checklist

Run on a real iPhone with the installed PWA (Add to Home Screen). Sign in as a beta account with at least one pantry item.

1. Cold launch from the home-screen icon → Home renders greeting + Recommended for you + Quick Actions without horizontal overflow.
2. Sign out → sign back in → session returns to Home; no re-onboarding.
3. Pantry → **+** → add an item manually. Confirm date picker, category, unit, and expiry chip are all reachable above the keyboard.
4. Pantry → **Scan** → confirm the sheet says "Enter barcode" (not "Scan product"), shows the iPhone explanation block, and the numeric keypad opens.
5. Enter a real EAN-13 (e.g. an item from your fridge) → prefill flows into `PantryItemSheet`.
6. Smart expiry chips appear on second-add of the same category; tapping updates the expiry field.
7. Pantry item → swipe/tap actions: Edit, Consumed, Discarded, Delete each show a toast and update counts.
8. AI Chef → send a message with the software keyboard open; composer sits above the keyboard; response card renders; "Try again" works after forced error.
9. Discover → search "chicken"; open a recipe; Save; Unsave; Add to meal plan → date + slot + servings all above keyboard.
10. Meal Plan → tap a slot → change date and slot via chips; Move + Remove work; custom-title flow works.
11. Grocery → Generate from this week's plan → confirm ingredients merge and Pantry subtraction removes already-owned items.
12. Grocery → tick an item → **Add to pantry** from row menu → item appears in Pantry with correct quantity.
13. Profile → each row opens its sheet; primary action button visible with the keyboard open (dvh fix).
14. Airplane mode → offline banner appears; return online → "Back online" banner clears after 3 s.
15. Deploy a new build → within 60 s of foreground, "A new version of Fuudit is ready" prompt appears; Update reloads once with the same route; Build ID in Profile changes.
16. `?sw=off` kill switch loads the app without registering a service worker; existing registration is unregistered.



## Profile — Interactive rows fix

**Symptom.** On iPhone Safari and the installed PWA, Profile rows (Household, Dietary preferences, Notifications, Privacy, Preferences, Help & support) looked tappable but did nothing. Only "Saved recipes" navigated.

**Root cause.** The rows were rendered as `<button>` elements but had no `onClick` handler and no destination. There was no overlay, z-index, or pointer-events issue — the handlers were simply never wired up. The stray `Preferences` row also had no home in the current data model.

**Rows implemented.**
- **Saved recipes** — unchanged; navigates to `/app/saved`.
- **Household** — opens `HouseholdSheet`. Edits `display_name` and `household_size` via the existing `useUpdateProfile` mutation. Cache is updated on success so the row and greeting refresh immediately.
- **Dietary preferences** — opens `DietarySheet`. Multi-select chips for diet and allergies mapped to Spoonacular's `diet` / `intolerances` values, so Discover and AI Chef pick the new settings up on their next request (they read `profile.dietary_preferences` / `profile.allergies` live from the same query). Includes a self-verification disclaimer.
- **Notifications** — opens `NotificationsSheet` labeled "Coming later". No fake switches. Explains that web push is unreliable on iOS home-screen apps today.
- **Privacy** — opens `PrivacySheet` with sections for stored data, adaptive learning, AI processing, a link to the full policy on the marketing site, and a `hello@fuudit.com` mailto for manual data/account removal during beta.
- **Help & support** — opens `HelpSheet` with a `hello@fuudit.com` feedback mailto, FAQ link, install instructions (iOS / Android / Desktop), stuck-on-old-version guidance including the `?sw=off` kill switch, and the current build identifier.

**Rows removed.** `Preferences` — no supported settings distinct from Household; removed rather than shown as broken.

**Accessibility.**
- Every row is a real `<button type="button">` with an `aria-label` including its current value.
- Minimum height 52px (rows) / 44px (chips and steppers) to satisfy touch targets.
- Visible pressed state (`active:bg-app-subtle`) and keyboard focus ring.
- Icons marked `aria-hidden`; chevrons only appear on rows that open something.

**Data & cache.**
- All edits go through `profilesRepository` + `useUpdateProfile`, which writes to the `profile(userId)` query cache. Discover (`DiscoverScreen`) and Home (`HomeScreen`) both read from `useProfile` and re-derive Spoonacular params on each request, so updated diet/allergy values take effect on the next Discover query.
- AI Chef loads the profile on each invocation server-side, so the next AI Chef message uses the latest values.

**Mobile / PWA.** Sheets use shadcn `Sheet side="bottom"` which portals above the bottom nav; `safe-bottom` inset applied to sheet footers.

**Known limitations.**
- Account deletion is not exposed as a button — done manually via `hello@fuudit.com` for beta; a self-serve delete flow is remaining work.
- Native notifications intentionally deferred.
- Privacy sheet links to the marketing-site policy anchor; a dedicated in-app Privacy Policy page is still to come.

---



## AI Chef — Reliability fix

**Symptom.** Users often saw *"Sorry — I couldn't put a suggestion together just now. Try rephrasing your request."* even for simple prompts. Gateway logs showed every request returning HTTP 200 with healthy token usage — the model was answering. The bug was in the edge function.

**Root causes.**
1. **Tool-loop budget broke a batch mid-way.** `MAX_TOOL_STEPS = 5` counted individual tool calls, and `if (toolStepsUsed >= MAX_TOOL_STEPS) break;` broke out of the inner `for (const call of toolCalls)` loop. When the model emitted 3 parallel calls near the cap, we pushed the assistant message carrying **all 3** `tool_call` ids but only pushed 2 `tool` responses. The next turn hit the OpenAI-compatible protocol's unresolved-tool_call_id path, so Gemini returned an assistant with `content: null` (or minimal filler).
2. **`response_format: { type: "json_object" }` + `tools` on Gemini via OpenRouter** intermittently returns empty content on the final "no more tools" step.
3. **The fallback string was persisted** as a real assistant message, so it reappeared on reload and there was no retry action.

**Fixes (server — `supabase/functions/chef/index.ts` rewritten).**
- Tool-loop budget counts **iterations, not tool calls**. Every batch of `tool_calls` from a single step is resolved fully before the next iteration.
- **Final pass forces `tool_choice: "none"`** so the last permitted turn MUST return text/JSON — no more "one more tool call" empty-content path.
- **Removed `response_format: json_object`.** The system prompt still mandates strict JSON, and a tolerant `extractJson()` handles markdown fences and prose-wrapped JSON.
- **Text-only reply fallback.** If the model returns plain prose instead of JSON, we accept that as the assistant answer rather than surfacing the generic error.
- **Typed error taxonomy** with `requestId` per request: `unauthenticated`, `invalid_request`, `conversation_not_found`, `model_unavailable`, `gateway_unauthorized`, `gateway_rate_limited`, `gateway_credits_exhausted`, `gateway_timeout`, `gateway_upstream`, `invalid_model_response`, `message_persistence_failed`, `unknown_error`. Correct HTTP status per code (402 for credits, 429 for rate limit, 504 for timeout, etc.).
- **Structured single-line JSON logs** keyed by `requestId` and `stage` — request received, tool invoked/failed, gateway status, completed. Only non-sensitive metadata (truncated user id, iteration count, tools invoked, duration, recipe count). Never prompts, pantry contents, or recipe payloads.
- **User-message rollback on failure.** If generation fails after the user message was persisted, we delete it, so the client can retry with the same text without producing a duplicate.
- **Resilient recipe sanitisation.** Accepts `sourceId` as string OR number; keeps otherwise-useful cards when optional fields are missing; validates that `sourceId` is numeric (blocks hallucinated ids).
- **Explicit 45 s timeout** with `AbortController` maps cleanly to `gateway_timeout`.
- **Model confirmed:** `google/gemini-3.6-flash` (current-generation Flash) — verified live in `ai_gateway_logs` (recent chat_completions calls succeeded 200 with 4–5 s latency).

**Fixes (client — `ChefScreen.tsx`, `useChef.ts`, `chef` repo).**
- Introduced a typed `ChefError` (code, message, requestId) parsed from the edge function's JSON error body.
- **Inline error card** replaces the generic toast: shows the mapped user message, the shortened `requestId` for support, **Try again**, **Dismiss**, and **Discover recipes** shortcut. Rate-limit errors additionally get a toast.
- **User-driven retry only.** The mutation has `retry: false` (no TanStack auto-retry). Retry sends `retry: true` so the server does not re-insert the user message.
- **Composer text is preserved** on failure so nothing typed is lost; on success it clears as before.
- **Double-tap guard** via an `inFlightRef` ref in addition to `send.isPending`.
- Inline error is scoped to the active conversation and cleared automatically when switching threads.
- Only `pantry_events`-style append-only tables were touched: **no** schema, RLS, storage, or auth changes.

**How to correlate a failure.** Every response — success or error — carries a `requestId` (UUID). The Profile screen still shows the Build id. For support, quote both.





## PWA — Reliable update flow (iPhone Safari + installed PWA)

- **Proactive update checks.** `registration.update()` now runs on initial load, on `visibilitychange` when the tab becomes visible, on `focus`, on `pageshow` (including bfcache restores common on iOS Safari), and on `online`. Checks are throttled to at most once per 60 s.
- **Waiting-worker detection covers every path:** (a) already-waiting on boot, (b) `updatefound` → `installing` → `installed` while a controller exists, (c) waiting appearing after a foreground update check. First install (no existing controller) does not show the prompt.
- **User-controlled activation preserved.** `skipWaiting: false` stays. The Update button posts `SKIP_WAITING`, listens for `controllerchange`, and reloads exactly once. Double-tap guarded; 8 s activation timeout; 6 s UI fallback pill becomes **Reload Fuudit** if activation stalls.
- **Prompt visibility.** Positioned above bottom nav and safe-area inset (`bottom: calc(env(safe-area-inset-bottom) + 6rem)`, z-index 80), works in Safari browser and installed standalone, accessible button labels.
- **Removed `workbox-window`** — replaced by a small native `ServiceWorkerRegistration` wrapper. Kill switch `?sw=off` preserved.
- **HTML shell strategy simplified.** `index.html` is no longer precached and `navigateFallback` is removed. Navigations always go through the NetworkFirst runtime route (`fuudit-html`, 4 s timeout), which populates the offline cache on first successful load. This removes the class of bug where a stale active worker serves an old precached shell.
- **Build identifier.** `Profile` now shows `Fuudit · Beta · Build <id>` where `<id>` is a base36 build timestamp injected via Vite `define` (`__BUILD_ID__`). No commit hash, no secrets.
- Docs: `docs/PWA.md` updated with update-check triggers, throttling, iOS Safari vs standalone context separation, activation flow, HTML-shell decision, and troubleshooting.



## UX — Home: Recipe Discovery as primary entry point

- Replaced the impact hero card on Home with a **Recommended for you** featured recipe pulled from the user's pantry via the existing `useRecipesByIngredients` hook (shared TanStack cache with Discover — no duplicate requests).
- Featured card reuses the existing `RecipeCard` design (image, title, used/missing counts) and is fully tappable to the recipe detail.
- Empty-pantry state: "Your next favourite recipe starts here" with a primary action to open Pantry.
- Discovery failure shows the standard `ErrorState` with retry instead of a blank card.
- Added a **Browse all recipes →** link under the featured recipe, routing to `/app/discover`.
- Added **Discover recipes** to Quick Actions (Sparkles icon, matches Discover screen).
- No backend, repository, API, RLS, or schema changes. AI Chef Discover shortcut unchanged.



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
