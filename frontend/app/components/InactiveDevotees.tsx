"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, formatCount, formatDate, InactiveReport } from "../lib/api";
import { locationText } from "../lib/devotee";
import { Badge, Button, Card, CardHeader, EmptyState, Icon, Skeleton } from "./ui";
import { useT } from "./LanguageProvider";
import type { TranslationKey } from "../lib/i18n";
import { cn } from "../lib/cn";

const WINDOWS: { days: number; labelKey: TranslationKey }[] = [
  { days: 7, labelKey: "admin.window7" },
  { days: 15, labelKey: "admin.window15" },
  { days: 30, labelKey: "admin.window30" },
];

/**
 * Devotees who have gone quiet, newest-lapsed first — someone who stopped last
 * week is far likelier to return than someone who never started, and the
 * ashram works this list top-down by phone.
 */
export function InactiveDevotees() {
  const t = useT();
  const [report, setReport] = useState<InactiveReport>({ items: [], days: 15, neverStarted: 0 });
  const [days, setDays] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<InactiveReport>(
        `/api/reports/inactive?days=${days}`,
        undefined,
        "admin"
      );
      setReport(data);
    } catch {
      setReport({ items: [], days, neverStarted: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader
        title={t("admin.inactiveTitle")}
        subtitle={t("admin.inactiveSub")}
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

      {!isLoading && report.neverStarted > 0 && (
        <p className="mt-4 rounded-md border border-line bg-surface-muted p-3 text-sm text-muted">
          {t("admin.neverStartedCount", { count: report.neverStarted })}
        </p>
      )}

      <div className="mt-4 grid max-h-[36rem] gap-2.5 overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)
        ) : report.items.length ? (
          report.items.map((devotee) => (
            <div
              key={devotee.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line-soft p-3.5 transition hover:border-saffron-200"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/devotees/${devotee.id}`}
                  className="truncate font-semibold hover:text-saffron-700"
                >
                  {devotee.name}
                </Link>
                <p className="truncate text-sm text-muted">{locationText(devotee)}</p>
                <p className="mt-1 text-sm text-muted">
                  {devotee.lastEntryDate
                    ? `${t("admin.lastEntry")}: ${formatDate(devotee.lastEntryDate)}`
                    : t("admin.neverStarted")}
                  {" · "}
                  {formatCount(devotee.totalJap)} jap
                </p>
              </div>

              <div className="flex flex-none flex-col items-end gap-2">
                {devotee.daysSince === null ? (
                  <Badge tone="neutral">{t("admin.neverStarted")}</Badge>
                ) : (
                  <Badge tone="gold">{t("admin.daysAgo", { count: devotee.daysSince })}</Badge>
                )}
                {devotee.hasActiveSankalp && (
                  <Badge tone="info">{t("admin.statusActive")}</Badge>
                )}
                {devotee.mobile ? (
                  <a href={`tel:${devotee.mobile}`}>
                    <Button size="sm" variant="secondary">
                      <Icon name="phone" className="h-4 w-4" />
                      {t("admin.call")}
                    </Button>
                  </a>
                ) : (
                  <span className="text-xs text-muted">{t("admin.noMobile")}</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Icon name="checkCircle" className="h-6 w-6" />}
            title={t("admin.noInactive")}
            description={t("admin.noInactiveText")}
          />
        )}
      </div>
    </Card>
  );
}
