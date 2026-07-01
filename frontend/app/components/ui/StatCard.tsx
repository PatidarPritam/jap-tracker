import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type StatTone = "saffron" | "gold" | "success" | "info";

const TONES: Record<StatTone, { ring: string; icon: string; accent: string }> = {
  saffron: { ring: "ring-saffron-100", icon: "bg-saffron-100 text-saffron-700", accent: "text-saffron-700" },
  gold: { ring: "ring-gold-300/40", icon: "bg-gold-300/40 text-warning", accent: "text-warning" },
  success: { ring: "ring-success-soft", icon: "bg-success-soft text-success", accent: "text-success" },
  info: { ring: "ring-info-soft", icon: "bg-info-soft text-info", accent: "text-info" },
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "saffron",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
}) {
  const styles = TONES[tone];

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card transition hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 flex-none items-center justify-center rounded-lg text-lg ring-4 ring-inset",
              styles.icon,
              styles.ring
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className={cn("mt-1 text-xs font-medium", styles.accent)}>{hint}</p>}
    </div>
  );
}
