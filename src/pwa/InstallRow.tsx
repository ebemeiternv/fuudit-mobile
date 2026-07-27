import { useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "./useInstallPrompt";
import { isStandalone } from "./usePwa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Compact "Install Fuudit" row for the Profile screen.
 * - Standalone (already installed): hidden.
 * - Android/desktop with beforeinstallprompt: triggers native prompt.
 * - iOS Safari: opens instructions sheet.
 * - Otherwise: hidden.
 */
const InstallRow = () => {
  const { canPromptInstall, installed, isIos, promptInstall } = useInstallPrompt();
  const [showIos, setShowIos] = useState(false);

  if (installed || isStandalone()) return null;
  if (!canPromptInstall && !isIos) return null;

  const handleClick = async () => {
    if (canPromptInstall) {
      await promptInstall();
    } else if (isIos) {
      setShowIos(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-3 p-4 w-full text-left no-tap-highlight active:bg-[hsl(var(--app-subtle))] transition-colors"
      >
        <div className="h-9 w-9 rounded-xl bg-[hsl(var(--app-primary-soft))] text-[hsl(var(--app-primary))] grid place-items-center">
          <Download className="h-[18px] w-[18px]" />
        </div>
        <span className="flex-1 font-medium text-[hsl(var(--app-foreground))]">
          Install Fuudit
        </span>
        <span className="text-sm text-[hsl(var(--app-muted))]">
          Add to home screen
        </span>
      </button>

      <Dialog open={showIos} onOpenChange={setShowIos}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Fuudit to your home screen</DialogTitle>
            <DialogDescription>
              On iPhone and iPad, install Fuudit from Safari in three steps.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 mt-2">
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-[hsl(var(--app-subtle))] grid place-items-center text-sm font-semibold">
                1
              </span>
              <span className="text-sm pt-1 flex items-center gap-1">
                Tap the <Share className="inline h-4 w-4 mx-1" /> Share icon in Safari.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-[hsl(var(--app-subtle))] grid place-items-center text-sm font-semibold">
                2
              </span>
              <span className="text-sm pt-1 flex items-center gap-1">
                Choose <Plus className="inline h-4 w-4 mx-1" /> Add to Home Screen.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-[hsl(var(--app-subtle))] grid place-items-center text-sm font-semibold">
                3
              </span>
              <span className="text-sm pt-1">Tap Add. Fuudit will appear on your home screen.</span>
            </li>
          </ol>
          <Button onClick={() => setShowIos(false)} className="w-full h-11 rounded-xl mt-2">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallRow;

/**
 * Small floating install pill for the landing page.
 */
export const LandingInstallPill = () => {
  const { canPromptInstall, installed, isIos, promptInstall, dismiss, dismissed } =
    useInstallPrompt();
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (installed || isStandalone() || hidden || dismissed) return null;
  if (!canPromptInstall && !isIos) return null;

  const handle = async () => {
    if (canPromptInstall) {
      await promptInstall();
    } else {
      setShowIos(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[calc(100%-2rem)]">
        <div className="flex items-center gap-2 rounded-2xl bg-white shadow-lg border border-sage-100 pl-4 pr-2 py-2">
          <Download className="h-4 w-4 text-[hsl(var(--app-primary))]" />
          <span className="text-sm flex-1 text-nordic-700">Install Fuudit</span>
          <Button size="sm" onClick={handle} className="h-8 rounded-lg">
            Install
          </Button>
          <button
            onClick={() => {
              dismiss();
              setHidden(true);
            }}
            aria-label="Dismiss install prompt"
            className="p-1 text-nordic-500 hover:text-nordic-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={showIos} onOpenChange={setShowIos}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Fuudit to your home screen</DialogTitle>
            <DialogDescription>
              On iPhone and iPad, install Fuudit from Safari in three steps.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 mt-2">
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-sage-100 grid place-items-center text-sm font-semibold">1</span>
              <span className="text-sm pt-1">Tap the Share icon in Safari.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-sage-100 grid place-items-center text-sm font-semibold">2</span>
              <span className="text-sm pt-1">Choose Add to Home Screen.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-sage-100 grid place-items-center text-sm font-semibold">3</span>
              <span className="text-sm pt-1">Tap Add.</span>
            </li>
          </ol>
          <Button onClick={() => setShowIos(false)} className="w-full h-11 rounded-xl mt-2">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
