"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DevoteeDataProvider, useDevoteeData } from "./DevoteeDataProvider";
import { BottomNav } from "../components/BottomNav";
import { SankalpCelebration } from "../components/SankalpCelebration";
import { trustName } from "../components/TrustShell";
import { Icon, Skeleton } from "../components/ui";
import { formatCount } from "../lib/api";
import { useT } from "../components/LanguageProvider";

const CELEBRATED_KEY = "celebratedSankalps";

function alreadyCelebrated(sankalpId: string): boolean {
  try {
    const raw = window.localStorage.getItem(CELEBRATED_KEY);
    return raw ? (JSON.parse(raw) as string[]).includes(sankalpId) : false;
  } catch {
    return false;
  }
}

function markCelebrated(sankalpId: string) {
  try {
    const raw = window.localStorage.getItem(CELEBRATED_KEY);
    const seen = raw ? (JSON.parse(raw) as string[]) : [];
    window.localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...seen, sankalpId]));
  } catch {
    // Storage unavailable — worst case the badhai shows again next open.
  }
}

/**
 * App shell for every devotee screen: a compact header, the scrollable page
 * body, and the bottom tab bar. Kept deliberately light so each tab reads as
 * a screen in an app rather than a section of a long web page.
 */
function DevoteeShell({ children }: { children: ReactNode }) {
  const { devotee, isLoading, pendingCount } = useDevoteeData();
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const t = useT();

  const sankalp = devotee?.activeSankalp ?? null;
  const completedSankalpId = sankalp?.isCompleted ? sankalp.id : null;

  useEffect(() => {
    if (!completedSankalpId || alreadyCelebrated(completedSankalpId)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCelebrating(completedSankalpId);
  }, [completedSankalpId]);

  function dismissCelebration() {
    if (celebrating) markCelebrated(celebrating);
    setCelebrating(null);
  }

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
                {devotee ? t("shell.greeting", { name: devotee.name }) : t("shell.devotee")}
              </p>
            )}
            <p className="font-devanagari truncate text-xs text-muted">{trustName}</p>
          </div>
        </div>
      </header>

      {pendingCount > 0 && (
        <p
          role="status"
          className="flex items-center justify-center gap-1.5 bg-gold-300/30 px-4 py-2 text-center text-xs font-semibold text-warning"
        >
          <Icon name="clock" className="h-3.5 w-3.5" />
          {t("shell.pendingSync", { count: formatCount(pendingCount) })}
        </p>
      )}

      {/* Bottom padding clears the fixed tab bar. */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-5">{children}</main>

      <BottomNav />

      {celebrating && sankalp && (
        <SankalpCelebration
          title={sankalp.title}
          targetCount={sankalp.targetCount}
          onDismiss={dismissCelebration}
        />
      )}
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
