# Fuudit PWA — Install & Update Guide

## Install on iPhone / iPad
1. Open **fuudit.com** in **Safari**.
2. Tap the **Share** icon → **Add to Home Screen** → **Add**.

Chrome/Firefox on iOS cannot install PWAs — this is an Apple restriction. Use Safari.

## Install on Android
1. Open Fuudit in **Chrome** (or another Chromium browser).
2. Tap the **Install Fuudit** pill on the landing page, or the **Install Fuudit** row in **Profile**.
3. Confirm in the native browser prompt.

## Remove the installed PWA
- **iOS**: long-press the Fuudit icon → *Remove App* → *Delete App*.
- **Android**: long-press the icon → *Uninstall*.

## Standalone mode
When launched from the home screen, Fuudit runs without browser navigation. Verify with `window.matchMedia('(display-mode: standalone)').matches === true`.

## Offline mode
The app shell (JS, CSS, fonts, icons) is cached and loads without a connection. `index.html` is served by a runtime **NetworkFirst** route (`fuudit-html`, 4 s timeout) which populates on first successful load — so a first-ever visit made entirely offline will fail, but any subsequent offline visit works.

The following always require internet:
- AI Chef
- Recipe search (Spoonacular)
- Barcode lookup (Open Food Facts)
- All Pantry / Grocery / Meal Plan / Profile writes and syncs

An offline banner explains the state; reconnection shows a brief "Back online" flash.

## Update flow

### How new versions are detected
The app no longer relies on the browser's ~24 h automatic update cycle. `ServiceWorkerRegistration.update()` is called:

- once on initial launch, after registration;
- on `visibilitychange` when the document becomes visible;
- on window `focus`;
- on `pageshow` (also handles iOS Safari bfcache restores);
- on `online`.

All triggers are throttled: at most one real update check per **60 seconds**.

### Waiting-worker detection
The Update prompt appears in every state:
1. A waiting worker is already present when the app boots.
2. A new worker moves through `updatefound` → `installing` → `installed` while an existing controller is active.
3. A worker becomes waiting after a foreground update check.

The prompt is suppressed on first install (no existing controller) because there is nothing to "update to".

### Activation flow
When the user taps **Update**:
1. `SKIP_WAITING` is posted to the waiting worker.
2. The app listens for `controllerchange`.
3. On controller change, the page reloads exactly once, preserving the current URL/route.
4. The button is disabled during activation to prevent double-taps.
5. If activation does not complete within 8 seconds, the prompt swaps to a friendly **Reload Fuudit** button that performs a hard reload.

Activation is **never automatic** — the user must tap Update, so the app will not reload while they are editing Pantry, Grocery, Meal Plan, or Profile data. `skipWaiting: false` is deliberate.

### Prompt visibility
The prompt renders unconditionally in both Safari browser mode and installed standalone mode. It is positioned above the bottom navigation and iOS safe-area inset (`bottom: calc(env(safe-area-inset-bottom) + 6rem)`, z-index 80), has an accessible `aria-label`, and does not block normal app use.

## iOS Safari vs installed PWA — separate contexts
On iOS, **Safari browser tabs and the installed Home-Screen PWA maintain separate service-worker registrations and caches**. Updating one does not update the other. The update logic above runs independently in both contexts — you may need to open Update once in Safari and once in the installed app after a deployment.

Also note: an installed iOS PWA is rarely "fully closed" (backgrounding it is not enough). The proactive update triggers above are what get a new version noticed; without user interaction the app may sit indefinitely on an old worker.

## Build identifier
The Profile screen shows `Fuudit · Beta · Build <id>`. `<id>` is a base36 timestamp injected at build time via Vite `define` (`__BUILD_ID__`). It is safe to share — no commit hashes, no secrets. Testers can quote this string to confirm which build they are on.

## Kill switch — `?sw=off`
Append `?sw=off` to any Fuudit URL to unregister the service worker on that device:

```
https://fuudit.com/?sw=off
```

On load the wrapper unregisters the app's `/sw.js` and does not re-register for that session. Use this during beta troubleshooting when a device is stuck on a bad worker. The kill switch is preserved across all future deployments.

## Troubleshooting install eligibility
- The **Install** button appears only when the browser fires `beforeinstallprompt` (HTTPS, valid manifest, registered SW, not already installed).
- On iOS, only Safari supports Add to Home Screen.
- If a device is stuck on an old version: open the site, then visit `?sw=off` once, then a normal URL again — the next production visit will register the fresh worker.

## Features that require internet
| Feature | Requires internet |
| --- | --- |
| AI Chef | Yes |
| Recipe search / detail fetch | Yes |
| Barcode lookup | Yes |
| Pantry / Grocery / Meal Plan mutations | Yes |
| Viewing already-loaded lists in the same session | Cached in-memory only |
