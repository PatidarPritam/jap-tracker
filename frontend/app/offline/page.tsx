import type { Metadata } from "next";
import { Icon } from "../components/ui";

export const metadata: Metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <span
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-full bg-saffron-100 text-saffron-700"
      >
        <Icon name="beads" className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-2xl font-semibold text-ink">You&apos;re offline</h1>
        <p className="mt-2 max-w-sm text-muted">
          No internet connection right now. Your saved jap is safe on this device — reconnect to sync
          and see your latest progress.
        </p>
      </div>
      <p className="text-sm font-medium text-muted">
        This page will work again automatically once you&apos;re back online.
      </p>
    </main>
  );
}
