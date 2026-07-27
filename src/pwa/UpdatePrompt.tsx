import { useEffect, useRef, useState } from "react";
import { setUpdateHandler } from "./registerSW";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Activate = () => Promise<void>;

const UpdatePrompt = () => {
  const [activate, setActivate] = useState<Activate | null>(null);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const clickedRef = useRef(false);

  useEffect(() => {
    setUpdateHandler((doActivate) => {
      // Only set once — guards against duplicate prompts.
      setActivate((prev) => prev ?? (() => doActivate()));
    });
    return () => setUpdateHandler(null);
  }, []);

  if (!activate) return null;

  const handleClick = async () => {
    if (clickedRef.current) return;
    clickedRef.current = true;
    setBusy(true);

    // If activation stalls (e.g. no controllerchange on iOS), offer a hard reload.
    const fallbackTimer = window.setTimeout(() => setFallback(true), 6000);

    try {
      await activate();
    } catch {
      setFallback(true);
    } finally {
      window.clearTimeout(fallbackTimer);
    }
  };

  const handleHardReload = () => {
    window.location.reload();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="hide-when-modal fixed left-1/2 -translate-x-1/2 z-[80] max-w-sm w-[calc(100%-2rem)] px-4 py-3 rounded-2xl bg-[hsl(var(--app-foreground))] text-white shadow-xl flex items-center gap-3"
      style={{
        // Sit clearly above the bottom nav (var --app-nav-h) + iOS home indicator.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + var(--app-nav-h, 68px) + 0.75rem)",
      }}
    >
      <RefreshCw
        className={`h-4 w-4 shrink-0 ${busy ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <span className="text-sm flex-1">
        {fallback
          ? "Almost there — reload to finish updating."
          : "A new version of Fuudit is ready."}
      </span>
      <Button
        size="sm"
        onClick={fallback ? handleHardReload : handleClick}
        disabled={busy && !fallback}
        aria-label={fallback ? "Reload Fuudit" : "Update Fuudit to the latest version"}
        className="h-8 rounded-lg bg-white text-[hsl(var(--app-foreground))] hover:bg-white/90 disabled:opacity-70"
      >
        {fallback ? "Reload Fuudit" : busy ? "Updating…" : "Update"}
      </Button>
    </div>
  );
};

export default UpdatePrompt;
