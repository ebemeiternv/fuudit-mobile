# Fuudit PWA — Install & Usage Guide

## Install on iPhone / iPad
1. Open **fuudit.com** (or your Fuudit URL) in **Safari**.
2. Tap the **Share** icon.
3. Choose **Add to Home Screen**.
4. Tap **Add**. The Fuudit icon appears on your home screen.

Chrome/Firefox on iOS cannot install PWAs — this is an Apple restriction. Use Safari.

## Install on Android
1. Open Fuudit in **Chrome** (or another Chromium browser).
2. Tap the **Install Fuudit** pill on the landing page, or the **Install Fuudit** row in **Profile**.
3. Confirm in the native browser prompt.

You can also use the browser menu → **Install app**.

## Remove the installed PWA
- **iOS**: long-press the Fuudit icon → *Remove App* → *Delete App*.
- **Android**: long-press the icon → *Uninstall*, or Settings → Apps → Fuudit → Uninstall.

## Standalone mode
When launched from the home screen, Fuudit runs without browser navigation. To verify:
- Chrome DevTools → Application → Manifest → **Add to home screen**, then relaunch.
- Or `window.matchMedia('(display-mode: standalone)').matches` should be `true`.

## Offline mode
The app shell (UI, fonts, icons) is cached and loads without a connection. The following require internet:
- AI Chef
- Recipe search (Spoonacular)
- Barcode lookup (Open Food Facts)
- All Pantry / Grocery / Meal Plan / Profile writes and syncs

When offline, a top banner explains the state. Reconnection shows a brief "Back online" flash and re-enables normal use.

## Service-worker updates
- New deployments show a "A new version of Fuudit is ready — Update" pill.
- The new version activates only when the user taps **Update** (no forced reloads mid-input).
- Kill switch: append `?sw=off` to any URL to unregister the service worker on that device.

## Features that require internet
| Feature | Requires internet |
| --- | --- |
| AI Chef | Yes |
| Recipe search / detail fetch | Yes |
| Barcode lookup | Yes |
| Pantry / Grocery / Meal Plan mutations | Yes |
| Viewing already-loaded lists in the same session | Cached in-memory only |

## Troubleshooting install eligibility
- The **Install** button appears only when the browser fires `beforeinstallprompt`. This typically requires:
  - HTTPS (or `localhost`)
  - A valid web app manifest and a registered service worker (production only)
  - Not already installed
- On iOS, only Safari supports Add to Home Screen.
- If the button never appears on Android Chrome, check `chrome://flags` and browser data, then reload.
