"use client";

import { useLanguage } from "./LanguageProvider";
import { LANGUAGES } from "../lib/i18n";
import { cn } from "../lib/cn";

/**
 * Segmented हिन्दी / English switch. Each label is written in its own script
 * so it is legible to someone who cannot read the other one.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex rounded-lg border border-line bg-surface p-0.5 text-sm font-semibold",
        className
      )}
    >
      {LANGUAGES.map((option) => {
        const isActive = language === option.code;
        return (
          <button
            key={option.code}
            type="button"
            lang={option.code}
            aria-pressed={isActive}
            onClick={() => setLanguage(option.code)}
            className={cn(
              "rounded-[0.4rem] px-3 py-1.5 transition",
              isActive
                ? "bg-saffron-700 text-white shadow-sm"
                : "text-ink-soft hover:bg-saffron-50 hover:text-saffron-800"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
