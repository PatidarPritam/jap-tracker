"use client";

import { useMemo } from "react";
import { Button, Icon } from "./ui";
import { formatCount } from "../lib/api";
import { useT } from "./LanguageProvider";

const PETALS = 18;

type SankalpCelebrationProps = {
  title: string;
  targetCount: number;
  onDismiss: () => void;
};

/**
 * Full-screen badhai shown once, the first time a devotee opens the app after
 * completing their sankalp. Finishing a months-long vow deserves a moment —
 * previously the progress bar just quietly reached 100%.
 */
export function SankalpCelebration({ title, targetCount, onDismiss }: SankalpCelebrationProps) {
  const t = useT();

  // Scattered deterministically: varied enough to look natural, but stable
  // across renders and identical on server and client.
  const petals = useMemo(
    () =>
      Array.from({ length: PETALS }, (_, index) => {
        const spread = (index * 37) % 100;
        return {
          left: spread,
          delay: ((index * 13) % 25) / 10,
          duration: 3.5 + ((index * 7) % 25) / 10,
          scale: 0.6 + ((index * 17) % 7) / 10,
        };
      }),
    []
  );

  function share() {
    const text = t("celebrate.shareText", { title, count: formatCount(targetCount) });
    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        // Share sheet dismissed — nothing to do.
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sankalp complete"
      className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-saffron-900/95 to-[#2b170b]/95 px-6 text-center backdrop-blur-sm"
    >
      {/* Falling marigold petals */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {petals.map((petal, index) => (
          <span
            key={index}
            className="animate-petal-fall absolute top-0 text-2xl"
            style={{
              left: `${petal.left}%`,
              animationDelay: `${petal.delay}s`,
              animationDuration: `${petal.duration}s`,
              animationIterationCount: "infinite",
              transform: `scale(${petal.scale})`,
            }}
          >
            🌼
          </span>
        ))}
      </div>

      <div className="animate-trophy-rise relative flex flex-col items-center">
        <span
          aria-hidden
          className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-saffron-500 text-5xl shadow-float"
        >
          🏆
        </span>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
          {t("celebrate.eyebrow")}
        </p>
        <h2 className="font-devanagari mt-2 text-3xl font-semibold text-white">
          {t("celebrate.heading")}
        </h2>
        <p className="mt-3 max-w-xs text-saffron-50">
          {t("celebrate.body", { title, count: formatCount(targetCount) })}
        </p>
        <p className="mt-2 max-w-xs text-sm text-saffron-100/80">
          {t("celebrate.blessing")}
        </p>

        <div className="mt-8 grid w-full max-w-xs gap-3">
          <Button variant="success" fullWidth onClick={share}>
            <Icon name="sparkles" className="h-4 w-4" />
            {t("celebrate.share")}
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-3 py-2 text-sm font-semibold text-saffron-100 transition hover:text-white"
          >
            {t("celebrate.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
