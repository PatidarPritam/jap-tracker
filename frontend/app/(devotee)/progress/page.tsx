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

export default function ProgressPage() {
  const { devotee, entries, isLoading, todayCount, streak } = useDevoteeData();

  function shareProgress() {
    const malas = Math.floor(todayCount / 108);
    const malaText = malas > 0 ? ` (${malas} ${malas === 1 ? "mala" : "malas"})` : "";
    const streakText = streak > 1 ? ` My streak: ${streak} days 🔥` : "";
    const text = `🙏 Today I completed ${formatCount(todayCount)} jap${malaText} on Jap Tracker.${streakText}`;

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

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <StatCard
          label="Today's Jap"
          value={formatCount(todayCount)}
          icon={<Icon name="beads" />}
          tone="saffron"
        />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Current Streak"
            value={`${streak} ${streak === 1 ? "day" : "days"}`}
            icon={<Icon name="flame" />}
            tone="gold"
          />
          <StatCard
            label="Lifetime Jap"
            value={formatCount(devotee?.totalJap ?? 0)}
            icon={<Icon name="trophy" />}
            tone="success"
          />
        </div>
      </div>

      <JapWeekChart entries={entries} />

      <Button variant="ghost" fullWidth onClick={shareProgress} disabled={todayCount === 0}>
        <Icon name="sparkles" className="h-4 w-4" />
        Share today&apos;s progress
      </Button>

      <Card>
        <CardHeader
          title="My Jap History"
          subtitle={entries.length ? `${entries.length} entries` : undefined}
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
                    <p className="font-semibold">{formatCount(entry.count)} jap</p>
                    <p className="text-sm text-muted">{formatDate(entry.entryDate)}</p>
                    {entry.notes && (
                      <p className="mt-0.5 truncate text-sm text-muted">{entry.notes}</p>
                    )}
                  </div>
                </div>
                <Badge tone="neutral">{entry.sankalp?.title ?? "General"}</Badge>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Icon name="clock" className="h-6 w-6" />}
              title="No jap entries yet"
              description="Your recorded jap will appear here. Add your first entry to begin."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
