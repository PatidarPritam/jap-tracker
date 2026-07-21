"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  apiRequest,
  Dashboard,
  defaultDashboard,
  Devotee,
  formatCount,
  today,
  threeMonthsFromToday,
} from "../../lib/api";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { TrustShell } from "../../components/TrustShell";
import { DevoteePicker } from "../../components/DevoteePicker";
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
  useToast,
} from "../../components/ui";
import { useT } from "../../components/LanguageProvider";

export default function AdminSankalpPage() {
  const { hasToken, handleAuthError } = useAdminGuard();
  const t = useT();
  const toast = useToast();
  const [dashboard, setDashboard] = useState<Dashboard>(defaultDashboard);
  const [selectedDevotee, setSelectedDevotee] = useState<Devotee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigningSankalp, setIsAssigningSankalp] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dashboardData = await apiRequest<Dashboard>("/api/dashboard", undefined, "admin");
      setDashboard(dashboardData);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.backendUnreachable");
      if (!handleAuthError(message)) toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthError, toast, t]);

  useEffect(() => {
    if (!hasToken) return;
    // Fetch-on-mount: loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [hasToken, loadData]);

  async function createSankalp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDevotee) {
      toast.error(t("admin.selectDevoteeFirst"));
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      setIsAssigningSankalp(true);
      await apiRequest(
        "/api/sankalps",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId: selectedDevotee.id,
            title: String(form.get("title") ?? ""),
            targetCount: Number(form.get("targetCount") ?? 0),
            startDate: String(form.get("startDate") ?? ""),
            endDate: String(form.get("endDate") ?? ""),
          }),
        },
        "admin"
      );
      formElement.reset();
      setSelectedDevotee(null);
      toast.success(t("admin.sankalpAssigned"));
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.assignFailed");
      if (!handleAuthError(message)) toast.error(message);
    } finally {
      setIsAssigningSankalp(false);
    }
  }

  if (!hasToken) {
    return (
      <TrustShell active="sankalp">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-40" />
        </div>
      </TrustShell>
    );
  }

  return (
    <TrustShell active="sankalp">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-7">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
          >
            ← Admin Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Assign Sankalp</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Use this for an existing devotee. Search by name, mobile, email, PIN, or location to
            avoid confusion when names are the same. Assigning a new sankalp supersedes the current
            active one.
          </p>
        </header>

        <section className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.2fr]">
          <Card className="lg:sticky lg:top-24">
            <CardHeader title={t("admin.newTarget")} />
            <form onSubmit={createSankalp} className="mt-5 grid gap-4">
              <Field label={t("admin.devotee")} required>
                <DevoteePicker
                  selected={selectedDevotee}
                  onSelect={setSelectedDevotee}
                  disabled={isAssigningSankalp}
                />
              </Field>
              <Field label={t("admin.sankalpTitle")} required>
                <Input
                  name="title"
                  defaultValue="3 Month Jap Sankalp"
                  disabled={isAssigningSankalp}
                  required
                />
              </Field>
              <Field label={t("admin.targetCount")} required>
                <Input
                  name="targetCount"
                  type="number"
                  min="1"
                  defaultValue="100000"
                  disabled={isAssigningSankalp}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("admin.startDate")} required>
                  <Input
                    name="startDate"
                    type="date"
                    defaultValue={today()}
                    disabled={isAssigningSankalp}
                    required
                  />
                </Field>
                <Field label={t("admin.endDate")} required>
                  <Input
                    name="endDate"
                    type="date"
                    defaultValue={threeMonthsFromToday()}
                    disabled={isAssigningSankalp}
                    required
                  />
                </Field>
              </div>
              <Button
                type="submit"
                variant="info"
                isLoading={isAssigningSankalp}
                disabled={!selectedDevotee}
                fullWidth
              >
                {isAssigningSankalp ? t("admin.assigning") : t("admin.assignTarget")}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title={t("admin.activeProgress")} subtitle={t("admin.allTargets")} />
            <div className="mt-5 grid gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24" />
                ))
              ) : dashboard.sankalps.length ? (
                dashboard.sankalps.map((sankalp) => (
                  <div key={sankalp.id} className="rounded-lg border border-line-soft p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{sankalp.devoteeName}</p>
                        <p className="truncate text-sm text-muted">{sankalp.title}</p>
                      </div>
                      {sankalp.isCompleted ? (
                        <Badge tone="success">Completed</Badge>
                      ) : (
                        <span className="flex-none text-sm font-semibold text-saffron-800">
                          {sankalp.progressPercent}%
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      className="mt-3"
                      value={sankalp.progressPercent}
                      tone={sankalp.isCompleted ? "success" : "gold"}
                      label={`${sankalp.devoteeName} progress`}
                    />
                    <p className="mt-2 text-sm text-muted">
                      {formatCount(sankalp.completedCount)} / {formatCount(sankalp.targetCount)} jap
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Icon name="target" className="h-6 w-6" />}
                  title={t("admin.noSankalpTitle")}
                  description={t("admin.assignToSee")}
                />
              )}
            </div>
          </Card>
        </section>
      </div>
    </TrustShell>
  );
}
