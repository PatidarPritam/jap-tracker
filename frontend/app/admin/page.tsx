"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  apiRequest,
  asPage,
  Dashboard,
  defaultDashboard,
  Devotee,
  formatCount,
  Paginated,
} from "../lib/api";
import { locationText } from "../lib/devotee";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { TrustShell } from "../components/TrustShell";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  type IconName,
  ProgressBar,
  Skeleton,
  StatCard,
} from "../components/ui";
import { useT } from "../components/LanguageProvider";
import type { TranslationKey } from "../lib/i18n";

const QUICK_ACTIONS: {
  href: string;
  icon: IconName;
  titleKey: TranslationKey;
  textKey: TranslationKey;
}[] = [
  {
    href: "/admin/devotees",
    icon: "plus",
    titleKey: "admin.qaRegisterTitle",
    textKey: "admin.qaRegisterText",
  },
  {
    href: "/admin/sankalp",
    icon: "target",
    titleKey: "admin.qaAssignTitle",
    textKey: "admin.qaAssignText",
  },
  {
    href: "/admin/reports",
    icon: "chart",
    titleKey: "admin.qaReportsTitle",
    textKey: "admin.qaReportsText",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminPage() {
  const { hasToken, handleAuthError, logout } = useAdminGuard();
  const t = useT();
  const [dashboard, setDashboard] = useState<Dashboard>(defaultDashboard);
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!hasToken) return;

    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [dashboardData, devoteeData] = await Promise.all([
          apiRequest<Dashboard>("/api/dashboard", undefined, "admin"),
          apiRequest<Paginated<Devotee> | Devotee[]>(
            "/api/devotees?pageSize=6",
            undefined,
            "admin"
          ),
        ]);
        if (cancelled) return;
        setDashboard(dashboardData);
        setDevotees(asPage(devoteeData).items);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : t("admin.backendUnreachable");
        if (!handleAuthError(message)) {
          setErrorMessage(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [hasToken, handleAuthError, t]);

  return (
    <TrustShell active="admin">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
              Admin Dashboard
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl">
              Overview for sankalp seva &amp; devotee progress
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted">
              <span
                className={`h-2 w-2 rounded-full ${
                  errorMessage ? "bg-danger" : "bg-success"
                }`}
              />
              {isLoading ? t("admin.syncing") : errorMessage ? t("admin.offline") : t("admin.synced")}
            </span>
            <Button variant="secondary" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        {errorMessage && (
          <Card className="border-danger/30 bg-danger-soft">
            <p className="text-sm font-medium text-danger">{errorMessage}</p>
          </Card>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))
          ) : (
            <>
              <StatCard
                label={t("admin.devotees")}
                value={formatCount(dashboard.devotees)}
                icon={<Icon name="users" />}
                tone="saffron"
              />
              <StatCard
                label={t("admin.totalJap")}
                value={formatCount(dashboard.totalJap)}
                icon={<Icon name="beads" />}
                tone="gold"
              />
              <StatCard
                label={t("admin.activeSankalp")}
                value={formatCount(dashboard.activeSankalps)}
                icon={<Icon name="flame" />}
                tone="info"
              />
              <StatCard
                label={t("admin.completed")}
                value={formatCount(dashboard.completedSankalps)}
                icon={<Icon name="checkCircle" />}
                tone="success"
              />
            </>
          )}
        </section>

        {/* Quick actions */}
        <section className="grid gap-4 md:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="block">
              <Card interactive className="h-full">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700"
                >
                  <Icon name={action.icon} />
                </span>
                <p className="mt-3 text-lg font-semibold text-saffron-800">{t(action.titleKey)}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{t(action.textKey)}</p>
              </Card>
            </Link>
          ))}
        </section>

        {/* Recent devotees + active sankalp */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader
              title={t("admin.recentDevotees")}
              action={
                <Link
                  href="/admin/devotees"
                  className="text-sm font-semibold text-saffron-700 hover:text-saffron-800"
                >
                  View all →
                </Link>
              }
            />
            <div className="mt-5 grid gap-2.5">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16" />
                ))
              ) : devotees.length ? (
                devotees.slice(0, 6).map((devotee) => (
                  <div
                    key={devotee.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line-soft p-3.5 transition hover:border-saffron-200"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-saffron-100 text-sm font-semibold text-saffron-700"
                      >
                        {initials(devotee.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{devotee.name}</p>
                        <p className="truncate text-sm text-muted">{locationText(devotee)}</p>
                      </div>
                    </div>
                    <Badge tone="gold">{formatCount(devotee.totalJap)} jap</Badge>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Icon name="users" className="h-6 w-6" />}
                  title={t("admin.noDevoteesTitle")}
                  description={t("admin.noDevoteesText")}
                  action={
                    <Link href="/admin/devotees">
                      <Button size="sm">Register Devotee</Button>
                    </Link>
                  }
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("admin.activeSankalp")} subtitle={t("admin.progressTowardTargets")} />
            <div className="mt-5 grid gap-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20" />
                ))
              ) : dashboard.sankalps.length ? (
                dashboard.sankalps.slice(0, 5).map((sankalp) => (
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
                      tone={sankalp.isCompleted ? "success" : "saffron"}
                      label={`${sankalp.devoteeName} sankalp progress`}
                    />
                    <p className="mt-2 text-sm text-muted">
                      {formatCount(sankalp.completedCount)} / {formatCount(sankalp.targetCount)} jap
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Icon name="beads" className="h-6 w-6" />}
                  title={t("admin.noActiveSankalp")}
                  description={t("admin.noSankalpText")}
                />
              )}
            </div>
          </Card>
        </section>
      </div>
    </TrustShell>
  );
}
