"use client";

import { FormEvent, use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  Devotee,
  formatCount,
  formatDate,
  JapEntry,
  today,
} from "../../lib/api";
import { activeRole, clearSession, getToken, isAuthError } from "../../lib/auth";
import { TrustShell } from "../../components/TrustShell";
import { TapCounter } from "../../components/TapCounter";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
  ProgressBar,
  Skeleton,
  StatCard,
  Textarea,
  useToast,
} from "../../components/ui";

const QUOTES = [
  "“Chant the holy name with love, and the mind finds its home.”",
  "“Every bead is a step closer to the divine.”",
  "“Steadiness in sadhana turns effort into grace.”",
  "“The name you remember today shapes the peace you carry tomorrow.”",
  "“Small, daily devotion builds an unshakeable heart.”",
];

const MILESTONES = [25, 50, 75, 100];

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

/** Consecutive-day logging streak, counting back from today (or yesterday). */
function computeStreak(entries: JapEntry[]) {
  const days = new Set(entries.map((entry) => dayKey(entry.entryDate)));
  if (days.size === 0) return 0;

  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function daysBetween(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function DevoteePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const { id } = use(params);
  const [devotee, setDevotee] = useState<Devotee | null>(null);
  const [entries, setEntries] = useState<JapEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTriedLoad, setHasTriedLoad] = useState(false);
  const [isSavingJap, setIsSavingJap] = useState(false);

  const loadData = useCallback(async () => {
    const role = activeRole();
    if (role === "devotee" && !getToken("devotee")) {
      router.push("/devotee/login");
      return;
    }

    setIsLoading(true);
    setHasTriedLoad(false);
    try {
      const [devoteeData, entryData] = await Promise.all([
        apiRequest<Devotee>(`/api/devotees/${id}`, undefined, role),
        apiRequest<JapEntry[]>(`/api/jap-entries?devoteeId=${id}`, undefined, role),
      ]);
      setDevotee(devoteeData);
      setEntries(entryData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load devotee";
      if (isAuthError(message)) {
        clearSession("devotee");
        router.push("/devotee/login");
      } else {
        toast.error(message);
      }
    } finally {
      setHasTriedLoad(true);
      setIsLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    // Fetch-on-mount: loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const todayKey = today();
  const todayCount = useMemo(
    () =>
      entries
        .filter((entry) => dayKey(entry.entryDate) === todayKey)
        .reduce((sum, entry) => sum + entry.count, 0),
    [entries, todayKey]
  );
  const streak = useMemo(() => computeStreak(entries), [entries]);

  const sankalp = devotee?.activeSankalp ?? null;
  const remainingJap = sankalp ? Math.max(0, sankalp.targetCount - sankalp.completedCount) : 0;
  const daysLeft = sankalp ? daysBetween(sankalp.endDate) : 0;
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  async function saveTappedJap(count: number) {
    try {
      setIsSavingJap(true);
      await apiRequest(
        "/api/jap-entries",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId: id,
            sankalpId: sankalp?.id,
            count,
            entryDate: today(),
            notes: "Tap counter",
          }),
        },
        activeRole()
      );
      await loadData();
      toast.success(`${formatCount(count)} jap saved. Keep going! 🙏`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save jap");
      return false;
    } finally {
      setIsSavingJap(false);
    }
  }

  async function createJapEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      setIsSavingJap(true);
      await apiRequest(
        "/api/jap-entries",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId: id,
            sankalpId: sankalp?.id,
            count: form.get("count"),
            entryDate: form.get("entryDate"),
            notes: form.get("notes"),
          }),
        },
        activeRole()
      );
      formElement.reset();
      await loadData();
      toast.success("Jap saved. Keep going! 🙏");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save jap");
    } finally {
      setIsSavingJap(false);
    }
  }

  return (
    <TrustShell active="devotee">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
              Devotee Panel
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              {devotee ? `Namaste, ${devotee.name}` : "Devotee dashboard"}
            </h1>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              clearSession("devotee");
              router.push("/devotee/login");
            }}
          >
            <Icon name="logout" className="h-4 w-4" />
            Logout
          </Button>
        </header>

        {isLoading ? (
          <div className="grid gap-6">
            <Skeleton className="h-56" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          </div>
        ) : devotee ? (
          <>
            {/* Sankalp hero */}
            {sankalp ? (
              <Card className="overflow-hidden bg-gradient-to-br from-surface to-saffron-50">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-saffron-700">
                      My Sankalp
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">{sankalp.title}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <Icon name="calendar" className="h-4 w-4" />
                      {formatDate(sankalp.startDate)} – {formatDate(sankalp.endDate)}
                    </p>
                  </div>
                  {sankalp.isCompleted ? (
                    <Badge tone="success" className="text-sm">
                      <Icon name="trophy" className="h-4 w-4" /> Completed
                    </Badge>
                  ) : (
                    <div className="text-right">
                      <p className="text-4xl font-bold text-saffron-700">
                        {sankalp.progressPercent}%
                      </p>
                      <p className="text-xs font-medium text-muted">complete</p>
                    </div>
                  )}
                </div>

                <ProgressBar
                  className="mt-5"
                  size="lg"
                  value={sankalp.progressPercent}
                  tone={sankalp.isCompleted ? "success" : "saffron"}
                  label="Sankalp progress"
                />

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Completed", value: formatCount(sankalp.completedCount) },
                    { label: "Target", value: formatCount(sankalp.targetCount) },
                    { label: "Remaining", value: formatCount(remainingJap) },
                    { label: "Days Left", value: daysLeft },
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

                {/* Milestones */}
                <div className="mt-5 flex flex-wrap gap-2">
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
            ) : (
              <EmptyState
                icon={<Icon name="beads" className="h-6 w-6" />}
                title="No active sankalp yet"
                description="The ashram admin has not assigned an active sankalp. You can still record general jap below."
              />
            )}

            {/* Quick stats */}
            <section className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Today's Jap"
                value={formatCount(todayCount)}
                icon={<Icon name="beads" />}
                tone="saffron"
              />
              <StatCard
                label="Current Streak"
                value={`${streak} ${streak === 1 ? "day" : "days"}`}
                icon={<Icon name="flame" />}
                tone="gold"
                hint={streak > 0 ? "Keep it alive!" : "Log today to start"}
              />
              <StatCard
                label="Lifetime Jap"
                value={formatCount(devotee.totalJap)}
                icon={<Icon name="trophy" />}
                tone="success"
              />
            </section>

            {/* Motivational quote */}
            <div className="rounded-xl border border-gold-300/50 bg-gradient-to-r from-gold-300/15 to-saffron-50 px-5 py-4">
              <p className="font-display text-lg italic text-saffron-900">{quote}</p>
            </div>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Tap counter + manual entry */}
              <div className="grid content-start gap-6">
              <TapCounter
                storageKey={`jap-tap-count:${id}`}
                isSaving={isSavingJap}
                onSave={saveTappedJap}
              />
              {/* Add jap */}
              <Card>
                <CardHeader title="Add Daily Jap" subtitle="Record what you completed today" />
                <form onSubmit={createJapEntry} className="mt-5 grid gap-4">
                  <Field label="Jap count" required>
                    <Input
                      name="count"
                      type="number"
                      min="1"
                      inputMode="numeric"
                      placeholder="e.g. 1100"
                      autoFocus
                      disabled={isSavingJap}
                      required
                    />
                  </Field>
                  <Field label="Date" required>
                    <Input
                      name="entryDate"
                      type="date"
                      defaultValue={today()}
                      max={today()}
                      disabled={isSavingJap}
                      required
                    />
                  </Field>
                  <Field label="Notes" hint="Optional — any reflection on today's practice">
                    <Textarea name="notes" placeholder="Notes" disabled={isSavingJap} />
                  </Field>
                  <Button type="submit" variant="success" isLoading={isSavingJap} fullWidth>
                    {isSavingJap ? "Saving…" : "Save Jap"}
                  </Button>
                </form>
              </Card>
              </div>

              {/* History */}
              <Card>
                <CardHeader
                  title="My Jap History"
                  subtitle={entries.length ? `${entries.length} entries` : undefined}
                />
                <div className="mt-5 grid max-h-[34rem] gap-2.5 overflow-y-auto pr-1">
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
            </section>
          </>
        ) : hasTriedLoad ? (
          <EmptyState
            icon={<Icon name="alert" className="h-6 w-6" />}
            title="No devotee found for this link"
            description="Please ask the ashram admin to create or resend your correct devotee access link."
          />
        ) : null}
      </div>
    </TrustShell>
  );
}
