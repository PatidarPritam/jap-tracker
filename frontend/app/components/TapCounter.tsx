"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardHeader, Icon } from "./ui";

const BEADS_PER_MALA = 108;

type TapCounterProps = {
  /** Used to keep an unsaved count safe across refreshes, per devotee. */
  storageKey: string;
  isSaving: boolean;
  onSave: (count: number) => Promise<boolean>;
};

export function TapCounter({ storageKey, isSaving, onSave }: TapCounterProps) {
  const [count, setCount] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [celebratedMala, setCelebratedMala] = useState(0);
  const hasHydrated = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const celebrationTimer = useRef<number | undefined>(undefined);

  // Keep the screen awake while a chanting session is in progress.
  const isChanting = count > 0;
  useEffect(() => {
    if (!isChanting || !("wakeLock" in navigator)) return;

    let cancelled = false;
    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        wakeLockRef.current = lock;
      } catch {
        // Not critical — e.g. low battery mode. Counting still works.
      }
    }

    void acquire();
    // The browser releases the lock when the tab is hidden; re-acquire on return.
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [isChanting]);

  useEffect(() => () => window.clearTimeout(celebrationTimer.current), []);

  useEffect(() => {
    const saved = Number(localStorage.getItem(storageKey));
    if (Number.isFinite(saved) && saved > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(saved);
    }
    hasHydrated.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!hasHydrated.current) return;
    if (count > 0) {
      localStorage.setItem(storageKey, String(count));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [count, storageKey]);

  const malas = Math.floor(count / BEADS_PER_MALA);
  const beads = count % BEADS_PER_MALA;
  const malaProgress = (beads / BEADS_PER_MALA) * 100;

  const tap = useCallback(() => {
    setCount((current) => {
      const next = current + 1;
      const malaDone = next % BEADS_PER_MALA === 0;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(malaDone ? [40, 60, 80] : 15);
      }
      if (malaDone) {
        setCelebratedMala(next / BEADS_PER_MALA);
        window.clearTimeout(celebrationTimer.current);
        celebrationTimer.current = window.setTimeout(() => setCelebratedMala(0), 1600);
      }
      return next;
    });
    setIsPressed(true);
    window.setTimeout(() => setIsPressed(false), 120);
  }, []);

  async function save() {
    if (count === 0) return;
    const ok = await onSave(count);
    if (ok) setCount(0);
  }

  return (
    <Card>
      <CardHeader
        title="Tap Counter"
        subtitle={`Tap the circle for each jap — ${BEADS_PER_MALA} taps complete one mala`}
      />
      <div className="relative mt-5 flex flex-col items-center gap-5">
        {/* Mala completion celebration */}
        {celebratedMala > 0 && (
          <div
            aria-hidden
            className="animate-mala-pop pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-saffron-700 px-4 py-1.5 text-sm font-semibold text-white shadow-lg"
          >
            🙏 Mala {celebratedMala} complete!
          </div>
        )}
        {/* Mala progress ring around the tap circle */}
        <button
          type="button"
          onClick={tap}
          disabled={isSaving}
          aria-label={`Tap to count jap. Current count ${count}`}
          className={`relative flex h-56 w-56 select-none items-center justify-center rounded-full transition-transform duration-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron-500 sm:h-64 sm:w-64 ${
            isPressed ? "scale-95" : "active:scale-95"
          }`}
          style={{
            background: `conic-gradient(var(--color-saffron-500) ${malaProgress}%, var(--color-saffron-100) ${malaProgress}%)`,
            touchAction: "manipulation",
          }}
        >
          <span className="flex h-[calc(100%-14px)] w-[calc(100%-14px)] flex-col items-center justify-center rounded-full bg-gradient-to-br from-saffron-50 to-gold-300/30 shadow-inner">
            <span className="text-6xl font-bold tabular-nums text-saffron-700 sm:text-7xl">
              {beads}
            </span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Tap to chant
            </span>
          </span>
        </button>

        <div className="flex items-center gap-6 text-center">
          <div>
            <p className="text-2xl font-semibold text-ink tabular-nums">{malas}</p>
            <p className="text-xs font-medium text-muted">
              {malas === 1 ? "Mala" : "Malas"} done
            </p>
          </div>
          <div className="h-8 w-px bg-line" aria-hidden />
          <div>
            <p className="text-2xl font-semibold text-ink tabular-nums">{count}</p>
            <p className="text-xs font-medium text-muted">Total taps</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-[auto_1fr] gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={count === 0 || isSaving}
            onClick={() => setCount(0)}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="success"
            isLoading={isSaving}
            disabled={count === 0}
            onClick={save}
          >
            <Icon name="beads" className="h-4 w-4" />
            {isSaving ? "Saving…" : `Save ${count > 0 ? `${count} jap` : "jap"}`}
          </Button>
        </div>
      </div>
    </Card>
  );
}
