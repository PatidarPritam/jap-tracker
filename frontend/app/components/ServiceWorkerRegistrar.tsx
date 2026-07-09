"use client";

import { useEffect } from "react";

/** Registers the PWA service worker once, after the app has mounted. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration is best-effort; the app still works without the SW.
    });
  }, []);

  return null;
}
