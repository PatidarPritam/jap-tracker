"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  apiRequest,
  Dashboard,
  defaultDashboard,
  Devotee,
  formatCount,
} from "../lib/api";
import { TrustShell } from "../components/TrustShell";

export default function AdminPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard>(defaultDashboard);
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    if (!window.localStorage.getItem("adminToken")) {
      router.push("/admin/login");
      return;
    }

    setIsLoading(true);
    try {
      const [dashboardData, devoteeData] = await Promise.all([
        apiRequest<Dashboard>("/api/dashboard", undefined, "admin"),
        apiRequest<Devotee[]>("/api/devotees", undefined, "admin"),
      ]);
      setDashboard(dashboardData);
      setDevotees(devoteeData);
      setStatus("Synced");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Backend not reachable");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TrustShell active="admin">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid gap-5 border-b border-[#eadcc2] pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a3d16]">
              Admin Dashboard
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal sm:text-5xl">
              Overview for sankalp seva and devotee progress.
            </h1>
          </div>
          <div className="rounded-md border border-[#eadcc2] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-semibold">Status:</span>{" "}
            <span className="text-[#6b6255]">{isLoading ? "Loading..." : status}</span>
            <button
              className="ml-4 font-semibold text-[#8a3d16]"
              onClick={() => {
                window.localStorage.removeItem("adminToken");
                router.push("/admin/login");
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Devotees", dashboard.devotees],
            ["Total Jap", dashboard.totalJap],
            ["Active Sankalp", dashboard.activeSankalps],
            ["Completed", dashboard.completedSankalps],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#6b6255]">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{formatCount(Number(value))}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["/admin/devotees", "Devotees", "Add devotees, view access codes, and open panels."],
            ["/admin/sankalp", "Assign Sankalp", "Create targets and review active progress."],
            ["/admin/reports", "Reports", "Filter progress by location and participation."],
          ].map(([href, title, text]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm transition hover:border-[#d7902f]"
            >
              <p className="text-xl font-semibold text-[#8a3d16]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[#6b6255]">{text}</p>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Recent Devotees</h2>
            <div className="mt-5 grid gap-3">
              {devotees.slice(0, 6).map((devotee) => (
                <div
                  key={devotee.id}
                  className="flex flex-col gap-2 rounded-md border border-[#f0e3cc] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{devotee.name}</p>
                    <p className="text-sm text-[#6b6255]">{devotee.email}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#8a3d16]">
                    {formatCount(devotee.totalJap)} jap
                  </p>
                </div>
              ))}
              {!devotees.length ? (
                <p className="text-sm text-[#6b6255]">No devotees added yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Active Sankalp</h2>
            <div className="mt-5 grid gap-4">
              {dashboard.sankalps.slice(0, 5).map((sankalp) => (
                <div key={sankalp.id} className="rounded-md border border-[#f0e3cc] p-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-base">{sankalp.devoteeName}</p>
                      <p className="text-[#6b6255]">{sankalp.title}</p>
                    </div>
                    <p className="font-semibold">{sankalp.progressPercent}%</p>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#eee4d3]">
                    <div
                      className="h-full bg-[#1f6f5b]"
                      style={{ width: `${sankalp.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
              {!dashboard.sankalps.length ? (
                <p className="text-sm text-[#6b6255]">No sankalp assigned yet.</p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </TrustShell>
  );
}
