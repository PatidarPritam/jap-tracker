"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, ExpiringReport, formatCount, formatDate, formatPercent } from "../lib/api";
import { Badge, Button, Card, CardHeader, EmptyState, Icon, ProgressBar, Skeleton } from "./ui";
import { useT } from "./LanguageProvider";
import type { TranslationKey } from "../lib/i18n";
import { cn } from "../lib/cn";

const WINDOWS: { days: number; labelKey: TranslationKey }[] = [
  { days: 30, labelKey: "admin.window30" },
  { days: 60, labelKey: "admin.window60" },
  { days: 90, labelKey: "admin.window90" },
];

/**
 * Active sankalps running out of time. The end date was stored from the start
 * but never surfaced anywhere, so a sankalp could quietly lapse unfinished —
 * this is the screen that turns it into a follow-up call.
 */
export function ExpiringSankalps() {
  const t = useT();
  const [report, setReport] = useState<ExpiringReport>({ items: [], days: 30 });
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<ExpiringReport>(
        `/api/reports/expiring?days=${days}`,
        undefined,
        "admin"
      );
      setReport(data);
    } catch {
      // Secondary panel: a failure here must not blank the dashboard.
      setReport({ items: [], days });
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function urgencyLabel(daysLeft: number) {
    if (daysLeft < 0) return t("admin.overdueDays", { count: Math.abs(daysLeft) });
    if (daysLeft === 0) return t("admin.endsToday");
    return t("admin.daysLeft", { count: daysLeft });
  }

  return (
    <Card>
      <CardHeader
        title={t("admin.expiringTitle")}
        subtitle={t("admin.expiringSub")}
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

      <div className="mt-5 grid gap-2.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24" />)
        ) : report.items.length ? (
          report.items.map((sankalp) => (
            <div
              key={sankalp.id}
              className={cn(
                "rounded-lg border p-3.5",
                sankalp.daysLeft < 0 ? "border-danger/30 bg-danger-soft" : "border-line-soft"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/devotees/${sankalp.devoteeId}`}
                    className="truncate font-semibold hover:text-saffron-700"
                  >
                    {sankalp.devoteeName}
                  </Link>
                  <p className="truncate text-sm text-muted">{sankalp.title}</p>
                </div>
                <Badge tone={sankalp.daysLeft < 0 ? "danger" : "gold"}>
                  {urgencyLabel(sankalp.daysLeft)}
                </Badge>
              </div>

              {/* ProgressBar has no danger tone; the card's red border and the
                  overdue badge already carry the urgency. */}
              <ProgressBar
                className="mt-2.5"
                value={sankalp.progressPercent}
                tone={sankalp.daysLeft < 0 ? "gold" : "saffron"}
                label={`${sankalp.devoteeName} sankalp progress`}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                <span>
                  {formatCount(sankalp.completedCount)} / {formatCount(sankalp.targetCount)} jap (
                  {formatPercent(sankalp.progressPercent)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" className="h-4 w-4" />
                  {formatDate(sankalp.endDate)}
                </span>
              </div>

              {sankalp.mobile && (
                <a href={`tel:${sankalp.mobile}`} className="mt-2 inline-block">
                  <Button size="sm" variant="secondary">
                    <Icon name="phone" className="h-4 w-4" />
                    {sankalp.mobile}
                  </Button>
                </a>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Icon name="checkCircle" className="h-6 w-6" />}
            title={t("admin.noExpiring")}
            description={t("admin.noExpiringText")}
          />
        )}
      </div>
    </Card>
  );
}
