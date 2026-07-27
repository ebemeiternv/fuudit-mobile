import { useEffect, useState } from "react";
import { setUpdateHandler } from "./registerSW";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const UpdatePrompt = () => {
  const [reload, setReload] = useState<null | (() => void)>(null);

  useEffect(() => {
    setUpdateHandler((doReload) => setReload(() => doReload));
    return () => setUpdateHandler(null);
  }, []);

  if (!reload) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] max-w-sm w-[calc(100%-2rem)] px-4 py-3 rounded-2xl bg-[hsl(var(--app-foreground))] text-white shadow-xl flex items-center gap-3"
    >
      <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-sm flex-1">A new version of Fuudit is ready.</span>
      <Button
        size="sm"
        onClick={reload}
        className="h-8 rounded-lg bg-white text-[hsl(var(--app-foreground))] hover:bg-white/90"
      >
        Update
      </Button>
    </div>
  );
};

export default UpdatePrompt;
