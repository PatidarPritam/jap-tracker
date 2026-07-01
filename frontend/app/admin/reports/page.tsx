"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  emptyLocationOptions,
  formatCount,
  LocationOptions,
  LocationReport,
} from "../../lib/api";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { TrustShell } from "../../components/TrustShell";
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
  useToast,
} from "../../components/ui";

const emptyReport: LocationReport = {
  summary: { devotees: 0, totalJap: 0, activeSankalps: 0, completedSankalps: 0 },
  grouped: [],
  devotees: [],
};

const FILTER_FIELDS = ["state", "district", "tehsil", "village", "city"] as const;

const OPTION_KEY: Record<(typeof FILTER_FIELDS)[number], keyof LocationOptions> = {
  state: "states",
  district: "districts",
  tehsil: "tehsils",
  village: "villages",
  city: "cities",
};

function areaLabel(row: {
  village: string | null;
  city: string | null;
  tehsil: string | null;
  district: string | null;
  state: string | null;
}) {
  return (
    [row.village || row.city, row.tehsil, row.district, row.state].filter(Boolean).join(", ") ||
    "Location not added"
  );
}

function ReportsFallback() {
  return (
    <TrustShell active="reports">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-40" />
      </div>
    </TrustShell>
  );
}

export default function LocationReportsPage() {
  return (
    <Suspense fallback={<ReportsFallback />}>
      <LocationReportsContent />
    </Suspense>
  );
}

function LocationReportsContent() {
  const router = useRouter();
  const toast = useToast();
  const { hasToken, handleAuthError } = useAdminGuard();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<LocationReport>(emptyReport);
  const [locationOptions, setLocationOptions] = useState<LocationOptions>(emptyLocationOptions);
  const [isLoading, setIsLoading] = useState(true);

  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, options] = await Promise.all([
        apiRequest<LocationReport>(
          `/api/reports/location${queryString ? `?${queryString}` : ""}`,
          undefined,
          "admin"
        ),
        apiRequest<LocationOptions>("/api/locations/options", undefined, "admin").catch(
          () => emptyLocationOptions
        ),
      ]);
      setReport(data);
      setLocationOptions(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load report";
      if (!handleAuthError(message)) toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [queryString, handleAuthError, toast]);

  useEffect(() => {
    if (!hasToken) return;
    // Fetch-on-mount/filter-change: loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReport();
  }, [hasToken, loadReport]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const field of FILTER_FIELDS) {
      const value = String(form.get(field) ?? "").trim();
      if (value) params.set(field, value);
    }
    router.push(`/admin/reports${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function exportCsv() {
    if (!report.devotees.length) {
      toast.error("Nothing to export for this filter");
      return;
    }
    const headers = [
      "Name",
      "Email",
      "Mobile",
      "Village",
      "City",
      "Tehsil",
      "District",
      "State",
      "Total Jap",
      "Active Target",
      "Completed",
      "Progress %",
    ];
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = report.devotees.map((devotee) =>
      [
        devotee.name,
        devotee.email,
        devotee.mobile,
        devotee.village,
        devotee.city,
        devotee.tehsil,
        devotee.district,
        devotee.state,
        devotee.totalJap,
        devotee.activeTarget ?? "",
        devotee.completedCount,
        devotee.progressPercent,
      ]
        .map(escape)
        .join(",")
    );
    const csv = [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jap-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${report.devotees.length} devotees`);
  }

  if (!hasToken) return <ReportsFallback />;

  return (
    <TrustShell active="reports">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
            >
              ← Admin Dashboard
            </Link>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl">
              Location-wise devotee &amp; jap report
            </h1>
          </div>
          <Button variant="secondary" onClick={exportCsv} disabled={isLoading}>
            <Icon name="chart" className="h-4 w-4" />
            Export CSV
          </Button>
        </header>

        {/* Filters */}
        <Card>
          {FILTER_FIELDS.map((field) => (
            <datalist key={field} id={`report-${field}-options`}>
              {locationOptions[OPTION_KEY[field]].map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          ))}
          <form onSubmit={applyFilters} className="grid gap-4 md:grid-cols-5">
            {FILTER_FIELDS.map((field) => (
              <Field key={field} label={field[0].toUpperCase() + field.slice(1)}>
                <Input
                  name={field}
                  list={`report-${field}-options`}
                  defaultValue={searchParams.get(field) ?? ""}
                  placeholder={`Any ${field}`}
                />
              </Field>
            ))}
            <div className="flex items-end gap-2 md:col-span-5">
              <Button type="submit">
                <Icon name="search" className="h-4 w-4" />
                Apply Filters
              </Button>
              <Link href="/admin/reports">
                <Button type="button" variant="secondary">
                  Clear
                </Button>
              </Link>
            </div>
          </form>
        </Card>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)
          ) : (
            <>
              <StatCard
                label="Devotees"
                value={formatCount(report.summary.devotees)}
                icon={<Icon name="users" />}
                tone="saffron"
              />
              <StatCard
                label="Total Jap"
                value={formatCount(report.summary.totalJap)}
                icon={<Icon name="beads" />}
                tone="gold"
              />
              <StatCard
                label="Active Sankalp"
                value={formatCount(report.summary.activeSankalps)}
                icon={<Icon name="flame" />}
                tone="info"
              />
              <StatCard
                label="Completed"
                value={formatCount(report.summary.completedSankalps)}
                icon={<Icon name="checkCircle" />}
                tone="success"
              />
            </>
          )}
        </section>

        <section className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
          <Card>
            <CardHeader title="Area Summary" subtitle="Grouped by location" />
            <div className="mt-5 grid max-h-[34rem] gap-2.5 overflow-y-auto pr-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16" />
                ))
              ) : report.grouped.length ? (
                report.grouped.map((row, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line-soft p-3.5"
                  >
                    <p className="flex min-w-0 items-center gap-2 font-medium">
                      <Icon name="mapPin" className="h-4 w-4 flex-none text-saffron-600" />
                      <span className="truncate">{areaLabel(row)}</span>
                    </p>
                    <p className="flex-none text-sm text-muted">
                      {formatCount(row.devotees)} devotees · {formatCount(row.totalJap)} jap
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Icon name="mapPin" className="h-6 w-6" />}
                  title="No area data"
                  description="No locations match this filter."
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Devotees In Filter" subtitle={`${report.devotees.length} matched`} />
            <div className="mt-5 grid max-h-[34rem] gap-2.5 overflow-y-auto pr-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24" />
                ))
              ) : report.devotees.length ? (
                report.devotees.map((devotee) => (
                  <div key={devotee.id} className="rounded-lg border border-line-soft p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{devotee.name}</p>
                        <p className="truncate text-sm text-muted">{devotee.email}</p>
                        {devotee.mobile && (
                          <p className="text-sm text-muted">Mobile: {devotee.mobile}</p>
                        )}
                        <p className="mt-0.5 truncate text-sm text-muted">{areaLabel(devotee)}</p>
                      </div>
                      <Badge tone="gold">{formatCount(devotee.totalJap)} jap</Badge>
                    </div>
                    {devotee.activeTarget ? (
                      <div className="mt-3">
                        <div className="mb-1.5 flex justify-between text-sm text-muted">
                          <span>
                            {formatCount(devotee.completedCount)} /{" "}
                            {formatCount(devotee.activeTarget)}
                          </span>
                          <span className="font-semibold text-ink">{devotee.progressPercent}%</span>
                        </div>
                        <ProgressBar value={devotee.progressPercent} tone="saffron" />
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-saffron-800">No active sankalp</p>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Icon name="users" className="h-6 w-6" />}
                  title="No devotees found"
                  description="No devotees match the selected filters."
                />
              )}
            </div>
          </Card>
        </section>
      </div>
    </TrustShell>
  );
}
