import { useEffect, useState } from "react";
import { useOnlineStatus } from "./usePwa";
import { WifiOff, Wifi } from "lucide-react";

const OfflineBanner = () => {
  const { online, wasOffline, clearWasOffline } = useOnlineStatus();
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (online && wasOffline) {
      setShowBackOnline(true);
      const t = setTimeout(() => {
        setShowBackOnline(false);
        clearWasOffline();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline, clearWasOffline]);

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-[70] bg-[hsl(var(--app-foreground))] text-white text-sm px-4 py-2 flex items-center justify-center gap-2 safe-top"
      >
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        <span>You're offline. Some Fuudit features need an internet connection.</span>
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-[70] bg-[hsl(var(--app-primary))] text-white text-sm px-4 py-2 flex items-center justify-center gap-2 safe-top"
      >
        <Wifi className="h-4 w-4" aria-hidden="true" />
        <span>Back online</span>
      </div>
    );
  }

  return null;
};

export default OfflineBanner;
