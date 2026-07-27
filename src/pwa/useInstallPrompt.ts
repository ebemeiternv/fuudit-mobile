import { useEffect, useState, useCallback } from "react";
import { isStandalone, isIos } from "./usePwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "fuudit:install-dismissed-at";
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissed = (() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || "0");
      return at > 0 && Date.now() - at < COOLDOWN_MS;
    } catch {
      return false;
    }
  })();

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome;
  }, [deferred]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setDeferred(null);
  }, []);

  return {
    canPromptInstall: Boolean(deferred),
    installed,
    dismissed,
    isIos: isIos(),
    promptInstall,
    dismiss,
  };
}
