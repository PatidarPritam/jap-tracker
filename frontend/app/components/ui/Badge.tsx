import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type BadgeTone = "saffron" | "gold" | "success" | "info" | "danger" | "neutral";

const TONES: Record<BadgeTone, string> = {
  saffron: "bg-saffron-100 text-saffron-800",
  gold: "bg-gold-300/40 text-warning",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-line-soft text-muted",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
