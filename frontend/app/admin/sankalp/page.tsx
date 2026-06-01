"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  Dashboard,
  defaultDashboard,
  Devotee,
  formatCount,
  today,
  threeMonthsFromToday,
} from "../../lib/api";
import { TrustShell } from "../../components/TrustShell";

function locationText(devotee: Pick<Devotee, "village" | "city" | "tehsil" | "district" | "state">) {
  return (
    [devotee.village || devotee.city, devotee.tehsil, devotee.district, devotee.state]
      .filter(Boolean)
      .join(", ") || "Location not added"
  );
}

function devoteeLabel(devotee: Devotee) {
  return [
    devotee.name,
    devotee.email,
    devotee.mobile ? `Mobile ${devotee.mobile}` : null,
    locationText(devotee),
  ]
    .filter(Boolean)
    .join(" - ");
}

export default function AdminSankalpPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard>(defaultDashboard);
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigningSankalp, setIsAssigningSankalp] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDevotees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return devotees;
    }

    return devotees.filter((devotee) =>
      [
        devotee.name,
        devotee.email,
        devotee.mobile,
        devotee.accessCode,
        devotee.village,
        devotee.city,
        devotee.tehsil,
        devotee.district,
        devotee.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [devotees, searchQuery]);

  async function loadData() {
    if (!window.localStorage.getItem("adminToken")) {
      router.replace("/admin/login");
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
      setHasAdminAccess(true);
      setStatus("Synced");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backend not reachable";
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

  useEffect(() => {
    if (!window.localStorage.getItem("adminToken")) {
      router.replace("/admin/login");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSankalp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);

    try {
      setIsAssigningSankalp(true);
      setStatus("Assigning sankalp...");
      await apiRequest(
        "/api/sankalps",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId: String(form.get("devoteeId") ?? ""),
            title: String(form.get("title") ?? ""),
            targetCount: Number(form.get("targetCount") ?? 0),
            startDate: String(form.get("startDate") ?? ""),
            endDate: String(form.get("endDate") ?? ""),
          }),
        },
        "admin"
      );
      formElement.reset();
      setStatus("Sankalp assigned");
      await loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not assign sankalp");
    } finally {
      setIsAssigningSankalp(false);
    }
  }

  if (!hasAdminAccess) {
    return (
      <TrustShell active="sankalp">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md border border-[#eadcc2] bg-white p-6 shadow-sm">
            <p className="font-semibold">Checking admin login...</p>
          </div>
        </div>
      </TrustShell>
    );
  }

  return (
    <TrustShell active="sankalp">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid gap-5 border-b border-[#eadcc2] pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-[#8a3d16]">
              Admin Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Assign Sankalp</h1>
            <p className="mt-3 max-w-2xl text-[#6b6255]">
              Use this for an existing devotee. Search by name, mobile, email, PIN, or location to
              avoid confusion when names are the same.
            </p>
          </div>
          <p className="rounded-md border border-[#eadcc2] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-semibold">Status:</span>{" "}
            <span className="text-[#6b6255]">{isLoading ? "Loading..." : status}</span>
          </p>
        </header>

        <section className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.2fr]">
          <datalist id="sankalp-devotee-search-options">
            {devotees.map((devotee) => (
              <option key={devotee.id} value={devoteeLabel(devotee)} />
            ))}
          </datalist>
          <form
            onSubmit={createSankalp}
            className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm lg:sticky lg:top-28"
          >
            <h2 className="text-xl font-semibold">New Target</h2>
            <div className="mt-5 grid gap-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                list="sankalp-devotee-search-options"
                placeholder="Search existing devotee by name, mobile, email, PIN"
                className="h-11 rounded-md border border-[#cfc5b2] px-3"
              />
              <select
                name="devoteeId"
                className="h-11 rounded-md border border-[#cfc5b2] bg-white px-3"
                disabled={isAssigningSankalp}
                required
              >
                <option value="">Select devotee</option>
                {filteredDevotees.map((devotee) => (
                  <option key={devotee.id} value={devotee.id}>
                    {devoteeLabel(devotee)}
                  </option>
                ))}
              </select>
              {!filteredDevotees.length ? (
                <p className="text-sm text-[#8a3d16]">
                  No existing devotee found. Register new devotee first.
                </p>
              ) : null}
              <input
                name="title"
                defaultValue="3 Month Jap Sankalp"
                className="h-11 rounded-md border border-[#cfc5b2] px-3"
                disabled={isAssigningSankalp}
                required
              />
              <input
                name="targetCount"
                type="number"
                min="1"
                defaultValue="100000"
                className="h-11 rounded-md border border-[#cfc5b2] px-3"
                disabled={isAssigningSankalp}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="startDate"
                  type="date"
                  defaultValue={today()}
                  className="h-11 rounded-md border border-[#cfc5b2] px-3"
                  disabled={isAssigningSankalp}
                  required
                />
                <input
                  name="endDate"
                  type="date"
                  defaultValue={threeMonthsFromToday()}
                  className="h-11 rounded-md border border-[#cfc5b2] px-3"
                  disabled={isAssigningSankalp}
                  required
                />
              </div>
              <button
                disabled={isAssigningSankalp}
                className="h-11 rounded-md bg-[#1f4f70] px-4 font-semibold text-white transition hover:bg-[#173d56] disabled:cursor-not-allowed disabled:bg-[#8aa8bd]"
              >
                {isAssigningSankalp ? "Assigning..." : "Assign Target"}
              </button>
            </div>
          </form>

          <div className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Active Sankalp Progress</h2>
            <div className="mt-5 grid gap-4">
              {dashboard.sankalps.map((sankalp) => (
                <div key={sankalp.id} className="rounded-md border border-[#f0e3cc] p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{sankalp.devoteeName}</p>
                      <p className="text-sm text-[#6b6255]">{sankalp.title}</p>
                    </div>
                    <p className="text-sm font-semibold">{sankalp.progressPercent}%</p>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#eee4d3]">
                    <div
                      className="h-full bg-[#d7902f]"
                      style={{ width: `${sankalp.progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[#6b6255]">
                    {formatCount(sankalp.completedCount)} / {formatCount(sankalp.targetCount)} jap
                  </p>
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
