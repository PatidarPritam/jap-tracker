"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  emptyLocationOptions,
  formatCount,
  LocationOptions,
  LocationReport,
} from "../../lib/api";
import { TrustShell } from "../../components/TrustShell";

const emptyReport: LocationReport = {
  summary: {
    devotees: 0,
    totalJap: 0,
    activeSankalps: 0,
    completedSankalps: 0,
  },
  grouped: [],
  devotees: [],
};

export default function LocationReportsPage() {
  return (
    <Suspense
      fallback={
        <TrustShell active="reports">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-md border border-[#d8d0c0] bg-white p-6 shadow-sm">
              <p className="font-semibold">Loading reports...</p>
            </div>
          </div>
        </TrustShell>
      }
    >
      <LocationReportsContent />
    </Suspense>
  );
}

function LocationReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<LocationReport>(emptyReport);
  const [locationOptions, setLocationOptions] =
    useState<LocationOptions>(emptyLocationOptions);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  async function loadReport() {
    if (!window.localStorage.getItem("adminToken")) {
      router.replace("/admin/login");
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiRequest<LocationReport>(
        `/api/reports/location${queryString ? `?${queryString}` : ""}`,
        undefined,
        "admin"
      );
      setReport(data);
      setHasAdminAccess(true);
      setStatus("Synced");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load report";
      setStatus(message);

      if (message === "Login required" || message === "Access denied") {
        window.localStorage.removeItem("adminToken");
        setHasAdminAccess(false);
        router.replace("/admin/login");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLocationOptions() {
    try {
      const options = await apiRequest<LocationOptions>(
        "/api/locations/options",
        undefined,
        "admin"
      );
      setLocationOptions(options);
    } catch {
      setLocationOptions(emptyLocationOptions);
    }
  }

  useEffect(() => {
    if (!window.localStorage.getItem("adminToken")) {
      router.replace("/admin/login");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReport();
    void loadLocationOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const field of ["state", "district", "tehsil", "village", "city"]) {
      const value = String(form.get(field) ?? "").trim();

      if (value) {
        params.set(field, value);
      }
    }

    router.push(`/admin/reports${params.toString() ? `?${params.toString()}` : ""}`);
  }

  if (!hasAdminAccess) {
    return (
      <TrustShell active="reports">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md border border-[#d8d0c0] bg-white p-6 shadow-sm">
            <p className="font-semibold">Checking admin login...</p>
          </div>
        </div>
      </TrustShell>
    );
  }

  return (
    <TrustShell active="reports">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-[#d8d0c0] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-[#8b5b29]">
              Admin Panel
            </Link>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              Location wise devotee and jap report.
            </h1>
          </div>
          <div className="rounded-md border border-[#d8d0c0] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-semibold">Status:</span>{" "}
            <span className="text-[#6b6255]">{isLoading ? "Loading..." : status}</span>
          </div>
        </header>

        <form
          onSubmit={applyFilters}
          className="grid gap-3 rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm md:grid-cols-5"
        >
          <datalist id="report-state-options">
            {locationOptions.states.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          <datalist id="report-district-options">
            {locationOptions.districts.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          <datalist id="report-tehsil-options">
            {locationOptions.tehsils.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          <datalist id="report-village-options">
            {locationOptions.villages.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          <datalist id="report-city-options">
            {locationOptions.cities.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          {["state", "district", "tehsil", "village", "city"].map((field) => (
            <input
              key={field}
              name={field}
              list={`report-${field}-options`}
              defaultValue={searchParams.get(field) ?? ""}
              placeholder={field[0].toUpperCase() + field.slice(1)}
              className="h-11 rounded-md border border-[#cfc5b2] px-3"
            />
          ))}
          <button className="h-11 rounded-md bg-[#1f4f70] px-4 font-semibold text-white md:col-span-2">
            Apply Filters
          </button>
          <Link
            href="/admin/reports"
            className="h-11 rounded-md border border-[#cfc5b2] px-4 py-3 text-center font-semibold md:col-span-1"
          >
            Clear
          </Link>
        </form>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Devotees", report.summary.devotees],
            ["Total Jap", report.summary.totalJap],
            ["Active Sankalp", report.summary.activeSankalps],
            ["Completed", report.summary.completedSankalps],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#6b6255]">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{formatCount(Number(value))}</p>
            </div>
          ))}
        </section>

        <section className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Area Summary</h2>
            <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-2">
              {report.grouped.length ? (
                report.grouped.map((row, index) => (
                  <div key={index} className="rounded-md border border-[#e5dccd] p-4">
                    <p className="font-semibold">
                      {[row.village || row.city, row.tehsil, row.district, row.state]
                        .filter(Boolean)
                        .join(", ") || "Location not added"}
                    </p>
                    <p className="mt-2 text-sm text-[#6b6255]">
                      {formatCount(row.devotees)} devotees · {formatCount(row.totalJap)} jap
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#6b6255]">No area data for this filter.</p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Devotees In Filter</h2>
            <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-2">
              {report.devotees.length ? (
                report.devotees.map((devotee) => (
                  <div key={devotee.id} className="rounded-md border border-[#e5dccd] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{devotee.name}</p>
                        <p className="text-sm text-[#6b6255]">{devotee.email}</p>
                        {devotee.mobile ? (
                          <p className="text-sm text-[#6b6255]">Mobile: {devotee.mobile}</p>
                        ) : null}
                        <p className="mt-1 text-sm text-[#6b6255]">
                          {[devotee.village || devotee.city, devotee.tehsil, devotee.district, devotee.state]
                            .filter(Boolean)
                            .join(", ") || "Location not added"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCount(devotee.totalJap)} jap
                      </p>
                    </div>
                    {devotee.activeTarget ? (
                      <div className="mt-3">
                        <div className="mb-2 flex justify-between text-sm">
                          <span>
                            {formatCount(devotee.completedCount)} /{" "}
                            {formatCount(devotee.activeTarget)}
                          </span>
                          <span>{devotee.progressPercent}%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-[#ebe4d7]">
                          <div
                            className="h-full bg-[#1f6f5b]"
                            style={{ width: `${devotee.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[#8b5b29]">No active sankalp</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#6b6255]">No devotees found.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </TrustShell>
  );
}
