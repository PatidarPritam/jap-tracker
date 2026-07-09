"use client";

import { useEffect, useState } from "react";
import { Button, Icon } from "./ui";

/** Chrome's install event — not yet in the TS DOM lib. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "jap-tracker:install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes a non-standard flag when launched from the home screen.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Shows a small "Install app" banner once the browser says the PWA is
 * installable (Android/Chrome), or a one-time hint on iOS Safari.
 * Hidden forever after install or dismiss.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) || isStandalone()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowIosHint(true);
    }

    const onInstalled = () => {
      setInstallEvent(null);
      setShowIosHint(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setInstallEvent(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    setInstallEvent(null);
  }

  if (!installEvent && !showIosHint) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-lg sm:inset-x-auto sm:left-4">
      <span
        aria-hidden
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-saffron-100 text-saffron-700"
      >
        <Icon name="phone" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Install Jap Tracker</p>
        <p className="text-xs text-muted">
          {installEvent
            ? "Add it to your home screen for a full-screen, app-like experience."
            : "Open the Share menu and tap “Add to Home Screen” to use it like an app."}
        </p>
      </div>
      {installEvent && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-muted transition-colors hover:bg-saffron-50 hover:text-ink"
      >
        <span aria-hidden className="text-lg leading-none">×</span>
      </button>
    </div>
  );
}
