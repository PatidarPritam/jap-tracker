"use client";

import { type ReactNode } from "react";
import { DevoteeDataProvider, useDevoteeData } from "./DevoteeDataProvider";
import { BottomNav } from "../components/BottomNav";
import { trustName } from "../components/TrustShell";
import { Skeleton } from "../components/ui";

/**
 * App shell for every devotee screen: a compact header, the scrollable page
 * body, and the bottom tab bar. Kept deliberately light so each tab reads as
 * a screen in an app rather than a section of a long web page.
 */
function DevoteeShell({ children }: { children: ReactNode }) {
  const { devotee, isLoading } = useDevoteeData();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <div className="h-1 bg-gradient-to-r from-saffron-600 via-gold-500 to-saffron-600" />

      <header className="sticky top-0 z-30 border-b border-line bg-surface-muted/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface-muted/75">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-saffron-700 text-white shadow-sm"
          >
            ॐ
          </span>
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <p className="truncate font-semibold leading-tight">
                {devotee ? `Namaste, ${devotee.name}` : "Devotee"}
              </p>
            )}
            <p className="font-devanagari truncate text-xs text-muted">{trustName}</p>
          </div>
        </div>
      </header>

      {/* Bottom padding clears the fixed tab bar. */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-5">{children}</main>

      <BottomNav />
    </div>
  );
}

export default function DevoteeLayout({ children }: { children: ReactNode }) {
  return (
    <DevoteeDataProvider>
      <DevoteeShell>{children}</DevoteeShell>
    </DevoteeDataProvider>
  );
}
