"use client";

import { useMemo } from "react";
import { formatCount, JapEntry } from "../lib/api";
import { Card, CardHeader } from "./ui";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DayBar = {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
};

function lastSevenDays(entries: JapEntry[]): DayBar[] {
  const sums = new Map<string, number>();
  for (const entry of entries) {
    const key = new Date(entry.entryDate).toISOString().slice(0, 10);
    sums.set(key, (sums.get(key) ?? 0) + entry.count);
  }

  const days: DayBar[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({
      key,
      label: DAY_LABELS[cursor.getDay()],
      count: sums.get(key) ?? 0,
      isToday: i === 6,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Simple last-7-days bar chart of daily jap counts. */
export function JapWeekChart({ entries }: { entries: JapEntry[] }) {
  const days = useMemo(() => lastSevenDays(entries), [entries]);
  const max = Math.max(...days.map((day) => day.count));
  const peakKey = max > 0 ? days.find((day) => day.count === max)?.key : undefined;

  return (
    <Card>
      <CardHeader title="Last 7 Days" subtitle="Your daily jap this week" />
      {max === 0 ? (
        <p className="mt-5 text-sm text-muted">
          No jap recorded this week yet — today is a good day to begin. 🙏
        </p>
      ) : (
        <div className="mt-5 flex items-end justify-between gap-2" role="img"
          aria-label={`Daily jap for the last 7 days: ${days
            .map((day) => `${day.label} ${day.count}`)
            .join(", ")}`}
        >
          {days.map((day) => {
            const heightPct = max > 0 ? Math.max((day.count / max) * 100, day.count > 0 ? 6 : 0) : 0;
            const showLabel = day.count > 0 && (day.isToday || day.key === peakKey);
            return (
              <div
                key={day.key}
                className="group relative flex flex-1 flex-col items-center gap-1.5"
                title={`${day.label}: ${formatCount(day.count)} jap`}
              >
                {/* Hover tooltip */}
                <span className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-white group-hover:block">
                  {formatCount(day.count)} jap
                </span>
                {showLabel && (
                  <span className="text-[11px] font-semibold tabular-nums text-ink">
                    {formatCount(day.count)}
                  </span>
                )}
                <div className="flex h-24 w-full max-w-9 items-end">
                  <div
                    className={`w-full rounded-t ${day.isToday ? "bg-saffron-700" : "bg-saffron-400"}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium ${day.isToday ? "font-semibold text-saffron-700" : "text-muted"}`}
                >
                  {day.isToday ? "Today" : day.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
