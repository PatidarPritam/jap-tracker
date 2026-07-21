"use client";

import { daysBetween, useDevoteeData } from "../DevoteeDataProvider";
import { formatCount, formatDate, formatPercent } from "../../lib/api";
import {
  Badge,
  Card,
  EmptyState,
  Icon,
  ProgressBar,
  Skeleton,
} from "../../components/ui";
import { useT } from "../../components/LanguageProvider";

const MILESTONES = [25, 50, 75, 100];

export default function SankalpPage() {
  const { devotee, isLoading } = useDevoteeData();
  const t = useT();
  const sankalp = devotee?.activeSankalp ?? null;

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!sankalp) {
    return (
      <EmptyState
        icon={<Icon name="beads" className="h-6 w-6" />}
        title={t("sankalp.noneTitle")}
        description={t("sankalp.noneText")}
      />
    );
  }

  const remainingJap = Math.max(0, sankalp.targetCount - sankalp.completedCount);
  const daysLeft = daysBetween(sankalp.endDate);

  return (
    <div className="grid gap-5">
      <Card className="overflow-hidden bg-gradient-to-br from-surface to-saffron-50">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-saffron-700">
            {t("sankalp.mine")}
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{sankalp.title}</h2>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">
            <Icon name="calendar" className="h-4 w-4" />
            {formatDate(sankalp.startDate)} – {formatDate(sankalp.endDate)}
          </p>

          {sankalp.isCompleted ? (
            <Badge tone="success" className="mt-4 text-sm">
              <Icon name="trophy" className="h-4 w-4" /> {t("sankalp.completed")}
            </Badge>
          ) : (
            <p className="mt-4 text-5xl font-bold text-saffron-700">
              {formatPercent(sankalp.progressPercent)}
              <span className="text-2xl">%</span>
            </p>
          )}
        </div>

        <ProgressBar
          className="mt-5"
          size="lg"
          value={sankalp.progressPercent}
          tone={sankalp.isCompleted ? "success" : "saffron"}
          label={t("sankalp.progressLabel")}
        />

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: t("sankalp.tileCompleted"), value: formatCount(sankalp.completedCount) },
            { label: t("sankalp.tileTarget"), value: formatCount(sankalp.targetCount) },
            { label: t("sankalp.tileRemaining"), value: formatCount(remainingJap) },
            { label: t("sankalp.tileDaysLeft"), value: daysLeft },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-lg border border-line-soft bg-surface/70 p-3 text-center"
            >
              <p className="text-xl font-semibold text-ink">{tile.value}</p>
              <p className="text-xs font-medium text-muted">{tile.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t("sankalp.milestones")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MILESTONES.map((milestone) => {
            const reached = sankalp.progressPercent >= milestone;
            return (
              <span
                key={milestone}
                className={
                  reached
                    ? "inline-flex items-center gap-1 rounded-full bg-gold-300/40 px-3 py-1 text-xs font-semibold text-warning"
                    : "inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-xs font-medium text-subtle"
                }
              >
                {reached && <Icon name="check" className="h-3.5 w-3.5" />}
                {milestone}%
              </span>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
