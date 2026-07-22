"use client";

import { useDevoteeData } from "../DevoteeDataProvider";
import { JapWeekChart } from "../../components/JapWeekChart";
import { formatCount, formatDate } from "../../lib/api";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  Skeleton,
  StatCard,
} from "../../components/ui";
import { NoticeBoard } from "../../components/NoticeBoard";
import { DarshanCard } from "../../components/DarshanCard";
import { SankalpCertificate } from "../../components/SankalpCertificate";
import { useT } from "../../components/LanguageProvider";

export default function ProgressPage() {
  const { devotee, entries, isLoading, todayCount, streak } = useDevoteeData();
  const t = useT();

  function shareProgress() {
    const malas = Math.floor(todayCount / 108);
    const malaText = malas > 0 ? ` (${t(malas === 1 ? "jap.mala" : "jap.malas", { count: malas })})` : "";
    const streakText = streak > 1 ? t("progress.shareStreak", { days: streak }) : "";
    const text = t("progress.shareText", {
      count: formatCount(todayCount),
      mala: malaText,
      streak: streakText,
    });

    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        // User closed the share sheet — nothing to do.
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const completedSankalp = devotee?.activeSankalp?.isCompleted ? devotee.activeSankalp : null;

  return (
    <div className="grid gap-5">
      <DarshanCard />

      {devotee && completedSankalp && (
        <Card className="border-success/30 bg-success-soft">
          <p className="text-lg font-semibold text-success">{t("devotee.certificateReady")}</p>
          <p className="mt-1 text-sm text-muted">{t("devotee.certificateSub")}</p>
          <div className="mt-3">
            <SankalpCertificate devotee={devotee} label={t("devotee.getCertificate")} />
          </div>
        </Card>
      )}

      <NoticeBoard />
      <div className="grid gap-3">
        <StatCard
          label={t("progress.todayJap")}
          value={formatCount(todayCount)}
          icon={<Icon name="beads" />}
          tone="saffron"
        />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={t("progress.currentStreak")}
            value={t(streak === 1 ? "progress.day" : "progress.days", { count: streak })}
            icon={<Icon name="flame" />}
            tone="gold"
          />
          <StatCard
            label={t("progress.lifetimeJap")}
            value={formatCount(devotee?.totalJap ?? 0)}
            icon={<Icon name="trophy" />}
            tone="success"
          />
        </div>
      </div>

      <JapWeekChart entries={entries} />

      <Button variant="ghost" fullWidth onClick={shareProgress} disabled={todayCount === 0}>
        <Icon name="sparkles" className="h-4 w-4" />
        {t("progress.share")}
      </Button>

      <Card>
        <CardHeader
          title={t("progress.historyTitle")}
          subtitle={entries.length ? t("progress.entries", { count: entries.length }) : undefined}
        />
        <div className="mt-5 grid gap-2.5">
          {entries.length ? (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line-soft p-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-saffron-100 text-saffron-700"
                  >
                    <Icon name="beads" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {formatCount(entry.count)} {t("progress.japUnit")}
                    </p>
                    <p className="text-sm text-muted">{formatDate(entry.entryDate)}</p>
                    {entry.notes && (
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {/* Entries are stored with an English marker note; show
                            it in the reader's language without rewriting data. */}
                        {entry.notes === "Tap counter" ? t("common.tapCounterNote") : entry.notes}
                      </p>
                    )}
                  </div>
                </div>
                <Badge tone="neutral">{entry.sankalp?.title ?? t("progress.general")}</Badge>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Icon name="clock" className="h-6 w-6" />}
              title={t("progress.noEntriesTitle")}
              description={t("progress.noEntriesText")}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
