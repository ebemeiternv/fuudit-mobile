// Guarded service-worker registration with proactive update checks.
//
// - Registers ONLY in production on the real Fuudit origin.
// - Refuses (and cleans up) in dev, previews, iframes, and when ?sw=off is set.
// - Actively calls registration.update() on load / visibility / focus with a
//   throttle so iOS Safari and installed PWAs discover new versions quickly.
// - Detects a waiting worker in every relevant state (already-waiting on boot,
//   newly discovered via updatefound, and after a foreground update check).
// - Activation is user-driven: the UI calls `activateWaitingWorker()` which
//   posts SKIP_WAITING and reloads exactly once on `controllerchange`.

const APP_SW_PATH = "/sw.js";
const UPDATE_CHECK_THROTTLE_MS = 60_000;

function isPreviewOrDevHost(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return true;
  }
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) {
    return true;
  }
  if (hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com")) return true;
  if (hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com")) return true;
  if (hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(APP_SW_PATH);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // ignore
  }
}

type UpdateHandler = (activate: () => Promise<void>) => void;

let onUpdateAvailable: UpdateHandler | null = null;
let appRegistration: ServiceWorkerRegistration | null = null;
let lastUpdateCheck = 0;
let announcedWaiting = false;
let reloading = false;

export function setUpdateHandler(handler: UpdateHandler | null) {
  onUpdateAvailable = handler;
  // If a waiting worker is already present when the handler mounts, notify.
  if (handler && appRegistration?.waiting && navigator.serviceWorker.controller) {
    announcedWaiting = true;
    handler(activateWaitingWorker);
  }
}

function announceWaiting() {
  if (announcedWaiting) return;
  if (!appRegistration?.waiting) return;
  // Only show the prompt when there is already a controller — otherwise this
  // is the very first install and there is nothing to "update to".
  if (!navigator.serviceWorker.controller) return;
  announcedWaiting = true;
  onUpdateAvailable?.(activateWaitingWorker);
}

/**
 * Activate the waiting worker: post SKIP_WAITING, reload exactly once when
 * the new worker takes control. Times out after 8s with a fallback reload.
 */
export async function activateWaitingWorker(): Promise<void> {
  if (reloading) return;
  const waiting = appRegistration?.waiting;
  if (!waiting) {
    // Nothing waiting — best effort reload as fallback.
    reloading = true;
    window.location.reload();
    return;
  }

  reloading = true;

  const controllerChange = new Promise<void>((resolve) => {
    const handler = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handler);
      resolve();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handler);
  });

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 8000));

  try {
    waiting.postMessage({ type: "SKIP_WAITING" });
  } catch {
    // ignore — we still race timeout so the user gets a reload
  }

  await Promise.race([controllerChange, timeout]);
  // Preserve current route by using the current href.
  window.location.reload();
}

async function checkForUpdate(force = false) {
  if (!appRegistration) return;
  const now = Date.now();
  if (!force && now - lastUpdateCheck < UPDATE_CHECK_THROTTLE_MS) return;
  lastUpdateCheck = now;
  try {
    await appRegistration.update();
  } catch {
    // ignore transient network failures
  }
  // update() itself does not fire "waiting" — updatefound + statechange do.
  // But an already-waiting worker may need re-announcing.
  announceWaiting();
}

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";
  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const refuse =
    !import.meta.env.PROD ||
    inIframe ||
    killSwitch ||
    isPreviewOrDevHost(window.location.hostname);

  if (refuse) {
    await unregisterAppSW();
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
    appRegistration = reg;

    // Case A: a waiting worker is already present on boot.
    if (reg.waiting && navigator.serviceWorker.controller) {
      announceWaiting();
    }

    // Case B: a new worker is discovered → installed → waiting.
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          announceWaiting();
        }
      });
    });

    // Proactive update triggers — do not rely on the browser's ~24h cycle.
    lastUpdateCheck = Date.now();
    const trigger = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    document.addEventListener("visibilitychange", trigger);
    window.addEventListener("focus", trigger);
    window.addEventListener("pageshow", (e) => {
      // pageshow with persisted=true = bfcache restore (common on iOS Safari)
      if ((e as PageTransitionEvent).persisted) void checkForUpdate(true);
      else trigger();
    });
    window.addEventListener("online", () => void checkForUpdate());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[PWA] SW registration failed", err);
  }
}
