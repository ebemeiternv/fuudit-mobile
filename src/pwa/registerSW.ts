// Guarded service-worker registration.
// Registers ONLY in production on the real Fuudit origin.
// Refuses (and cleans up) in dev, previews, iframes, and when ?sw=off is set.

const APP_SW_PATH = "/sw.js";

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

type UpdateHandler = (reload: () => void) => void;

let onUpdateAvailable: UpdateHandler | null = null;

export function setUpdateHandler(handler: UpdateHandler | null) {
  onUpdateAvailable = handler;
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
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox(APP_SW_PATH);

    wb.addEventListener("waiting", () => {
      if (onUpdateAvailable) {
        onUpdateAvailable(() => {
          wb.addEventListener("controlling", () => {
            window.location.reload();
          });
          wb.messageSkipWaiting();
        });
      }
    });

    await wb.register();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[PWA] SW registration failed", err);
  }
}
