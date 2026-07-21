"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import {
  apiRequest,
  Devotee,
  formatCount,
  formatPercent,
  formatDate,
  JapEntry,
} from "../../../lib/api";
import { locationText } from "../../../lib/devotee";
import { useAdminGuard } from "../../../hooks/useAdminGuard";
import { TrustShell } from "../../../components/TrustShell";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  ProgressBar,
  Skeleton,
  StatCard,
  type IconName,
} from "../../../components/ui";
import { useT } from "../../../components/LanguageProvider";

/**
 * Read-only view of one devotee for the admin. The devotee app resolves the
 * signed-in devotee from their session, so an admin needs this separate route
 * to look at somebody else's progress.
 */
export default function AdminDevoteePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasToken, handleAuthError } = useAdminGuard();
  const t = useT();
  const [devotee, setDevotee] = useState<Devotee | null>(null);
  const [entries, setEntries] = useState<JapEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [devoteeData, entryData] = await Promise.all([
        apiRequest<Devotee>(`/api/devotees/${id}`, undefined, "admin"),
        apiRequest<JapEntry[]>(`/api/jap-entries?devoteeId=${id}`, undefined, "admin"),
      ]);
      setDevotee(devoteeData);
      setEntries(entryData);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t("admin.loadFailed");
      if (!handleAuthError(message)) setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id, handleAuthError, t]);

  useEffect(() => {
    if (!hasToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [hasToken, loadData]);

  const sankalp = devotee?.activeSankalp ?? null;

  const details: { icon: IconName; label: string; value: string }[] = devotee
    ? [
        { icon: "phone", label: t("admin.mobile"), value: devotee.mobile || t("me.notAdded") },
        { icon: "mail", label: t("admin.email"), value: devotee.email },
        { icon: "key", label: t("admin.loginPin"), value: devotee.accessCode || "—" },
        { icon: "link", label: t("me.location"), value: locationText(devotee) },
      ]
    : [];

  return (
    <TrustShell active="devotees">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <Link
            href="/admin/devotees"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
          >
            {t("admin.back")}
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        ) : error ? (
          <EmptyState
            icon={<Icon name="alert" className="h-6 w-6" />}
            title={t("admin.loadFailed")}
            description={error}
          />
        ) : devotee ? (
          <>
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-saffron-700 text-xl font-semibold text-white"
                  >
                    {devotee.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold">{devotee.name}</h1>
                    <p className="truncate text-sm text-muted">{locationText(devotee)}</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void loadData()}>
                  <Icon name="refresh" className="h-4 w-4" />
                  {t("admin.refresh")}
                </Button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {details.map((detail) => (
                  <div key={detail.label} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-saffron-100 text-saffron-700"
                    >
                      <Icon name={detail.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {detail.label}
                      </p>
                      <p className="break-words font-medium">{detail.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <section className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label={t("admin.lifetimeJap")}
                value={formatCount(devotee.totalJap)}
                icon={<Icon name="trophy" />}
                tone="success"
              />
              <StatCard
                label={t("admin.entriesRecorded")}
                value={formatCount(entries.length)}
                icon={<Icon name="beads" />}
                tone="saffron"
              />
            </section>

            {sankalp ? (
              <Card>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-saffron-700">
                      {t("admin.activeSankalp")}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">{sankalp.title}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <Icon name="calendar" className="h-4 w-4" />
                      {formatDate(sankalp.startDate)} – {formatDate(sankalp.endDate)}
                    </p>
                  </div>
                  {sankalp.isCompleted ? (
                    <Badge tone="success">
                      <Icon name="trophy" className="h-4 w-4" /> {t("admin.completed")}
                    </Badge>
                  ) : (
                    <p className="text-3xl font-bold text-saffron-700">
                      {formatPercent(sankalp.progressPercent)}%
                    </p>
                  )}
                </div>
                <ProgressBar
                  className="mt-4"
                  size="lg"
                  value={sankalp.progressPercent}
                  tone={sankalp.isCompleted ? "success" : "saffron"}
                  label={t("admin.sankalpProgress")}
                />
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: t("admin.completed"), value: formatCount(sankalp.completedCount) },
                    { label: t("admin.target"), value: formatCount(sankalp.targetCount) },
                    {
                      label: t("admin.remaining"),
                      value: formatCount(
                        Math.max(0, sankalp.targetCount - sankalp.completedCount)
                      ),
                    },
                  ].map((tile) => (
                    <div
                      key={tile.label}
                      className="rounded-lg border border-line-soft bg-surface/70 p-3 text-center"
                    >
                      <p className="text-lg font-semibold">{tile.value}</p>
                      <p className="text-xs text-muted">{tile.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={<Icon name="target" className="h-6 w-6" />}
                title={t("admin.noActiveSankalp")}
                description={t("admin.assignFromSankalp")}
              />
            )}

            <Card>
              <CardHeader
                title={t("admin.japHistory")}
                subtitle={entries.length ? t("admin.entries", { count: entries.length }) : undefined}
              />
              <div className="mt-4 grid max-h-[32rem] gap-2.5 overflow-y-auto pr-1">
                {entries.length ? (
                  entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line-soft p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">{formatCount(entry.count)} jap</p>
                        <p className="text-sm text-muted">{formatDate(entry.entryDate)}</p>
                        {entry.notes && (
                          <p className="mt-0.5 truncate text-sm text-muted">{entry.notes}</p>
                        )}
                      </div>
                      <Badge tone="neutral">{entry.sankalp?.title ?? t("admin.general")}</Badge>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={<Icon name="clock" className="h-6 w-6" />}
                    title={t("admin.noJapTitle")}
                    description={t("admin.noJapText")}
                  />
                )}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </TrustShell>
  );
}
