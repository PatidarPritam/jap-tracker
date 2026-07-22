"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, formatCount, TrendsReport } from "../lib/api";
import { Badge, Card, CardHeader, EmptyState, Icon, Skeleton, StatCard } from "./ui";
import { useT } from "./LanguageProvider";
import type { TranslationKey } from "../lib/i18n";
import { cn } from "../lib/cn";

const WINDOWS: { days: number; labelKey: TranslationKey }[] = [
  { days: 30, labelKey: "admin.window30" },
  { days: 60, labelKey: "admin.window60" },
  { days: 90, labelKey: "admin.window90" },
];

const EMPTY: TrendsReport = {
  days: 30,
  daily: [],
  thisMonth: 0,
  lastMonth: 0,
  activeDevotees: 0,
  changePercent: null,
  topDevotees: [],
};

/** Short date label for the x-axis, e.g. "12 Jul". */
function shortDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
    new Date(iso)
  );
}

/**
 * Movement over time. The dashboard counters say how much jap has been offered
 * in total but never whether it is growing — this answers that, and names the
 * devotees carrying the month.
 */
export function JapTrends() {
  const t = useT();
  const [report, setReport] = useState<TrendsReport>(EMPTY);
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<TrendsReport>(
        `/api/reports/trends?days=${days}`,
        undefined,
        "admin"
      );
      setReport(data);
    } catch {
      // Secondary panel — never blank the dashboard over a failed chart.
      setReport({ ...EMPTY, days });
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const max = Math.max(0, ...report.daily.map((day) => day.count));
  const hasData = max > 0;

  return (
    <Card>
      <CardHeader
        title={t("admin.trendsTitle")}
        subtitle={t("admin.trendsSub", { days: report.days })}
        action={
          <div className="flex gap-1">
            {WINDOWS.map((window) => (
              <button
                key={window.days}
                type="button"
                onClick={() => setDays(window.days)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                  days === window.days
                    ? "bg-saffron-700 text-white"
                    : "text-muted hover:bg-saffron-50 hover:text-saffron-800"
                )}
              >
                {t(window.labelKey)}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="mt-5 grid gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatCard
              label={t("admin.thisMonth")}
              value={formatCount(report.thisMonth)}
              icon={<Icon name="beads" />}
              tone="saffron"
            />
            <StatCard
              label={t("admin.lastMonth")}
              value={formatCount(report.lastMonth)}
              icon={<Icon name="clock" />}
              tone="gold"
            />
            <StatCard
              label={t("admin.activeThisMonth")}
              value={formatCount(report.activeDevotees)}
              icon={<Icon name="users" />}
              tone="info"
            />
          </div>

          {/* Hidden when last month had no jap — a delta off a zero baseline
              would read as a meaningless +100%. */}
          {report.changePercent !== null && (
            <p className="mt-3">
              <Badge tone={report.changePercent >= 0 ? "success" : "danger"}>
                {report.changePercent >= 0 ? "▲" : "▼"} {Math.abs(report.changePercent)}%{" "}
                {t("admin.lastMonth")}
              </Badge>
            </p>
          )}

          {hasData ? (
            <div
              className="mt-6 flex h-40 items-end gap-px overflow-x-auto"
              role="img"
              aria-label={`Daily jap over the last ${report.days} days, peak ${formatCount(max)}`}
            >
              {report.daily.map((day) => {
                // Any non-zero day keeps a visible sliver, else quiet days
                // vanish next to a large peak.
                const heightPct = day.count > 0 ? Math.max((day.count / max) * 100, 3) : 0;
                return (
                  <div
                    key={day.date}
                    className="group relative flex min-w-[6px] flex-1 items-end self-stretch"
                    title={`${shortDate(day.date)}: ${formatCount(day.count)} jap`}
                  >
                    <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-white group-hover:block">
                      {shortDate(day.date)} · {formatCount(day.count)}
                    </span>
                    <div
                      className="w-full rounded-t bg-saffron-400 transition group-hover:bg-saffron-700"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              className="mt-6"
              icon={<Icon name="chart" className="h-6 w-6" />}
              title={t("admin.noTrendData")}
              description={t("admin.noTrendDataText")}
            />
          )}

          {report.topDevotees.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                {t("admin.topDevotees")}
              </p>
              <div className="mt-3 grid gap-2">
                {report.topDevotees.map((devotee, index) => (
                  <div
                    key={devotee.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line-soft p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-saffron-100 text-sm font-semibold text-saffron-700"
                      >
                        {index + 1}
                      </span>
                      <Link
                        href={`/admin/devotees/${devotee.id}`}
                        className="truncate font-medium hover:text-saffron-700"
                      >
                        {devotee.name}
                      </Link>
                    </div>
                    <span className="flex-none text-sm font-semibold tabular-nums">
                      {formatCount(devotee.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
