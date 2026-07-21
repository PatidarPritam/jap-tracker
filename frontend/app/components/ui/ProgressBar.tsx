import { cn } from "../../lib/cn";

type ProgressTone = "saffron" | "gold" | "success" | "info";

const TONES: Record<ProgressTone, string> = {
  saffron: "bg-saffron-500",
  gold: "bg-gold-500",
  success: "bg-success",
  info: "bg-info",
};

const SIZES = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
} as const;

export function ProgressBar({
  value,
  tone = "success",
  size = "md",
  className,
  label,
}: {
  /** Percentage 0–100. Clamped defensively. */
  value: number;
  tone?: ProgressTone;
  size?: keyof typeof SIZES;
  className?: string;
  /** Optional accessible label describing what the bar measures. */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  // Any real progress gets a visible sliver: a 0.3% bar would otherwise be
  // sub-pixel, so months of early sadhana would look like nothing at all.
  const width = pct > 0 ? Math.max(pct, 1.5) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("overflow-hidden rounded-full bg-line-soft", SIZES[size], className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", TONES[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
