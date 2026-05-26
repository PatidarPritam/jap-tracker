"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  defaultDashboard,
  Devotee,
  Dashboard,
  emptyLocationOptions,
  formatCount,
  LocationOptions,
  today,
  threeMonthsFromToday,
} from "../lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard>(defaultDashboard);
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [selectedDevoteeId, setSelectedDevoteeId] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDevotee, setIsAddingDevotee] = useState(false);
  const [isAssigningSankalp, setIsAssigningSankalp] = useState(false);
  const [locationOptions, setLocationOptions] = useState<LocationOptions>(emptyLocationOptions);

  const selectedDevotee = useMemo(
    () => devotees.find((devotee) => devotee.id === selectedDevoteeId),
    [devotees, selectedDevoteeId]
  );

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
      setSelectedDevoteeId((current) => current || devoteeData[0]?.id || "");
      setStatus("Synced");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Backend not reachable");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    loadLocationOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDevotee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);

    try {
      setIsAddingDevotee(true);
      setStatus("Creating devotee...");
      const createdDevotee = await apiRequest<
        Pick<
          Devotee,
          | "id"
          | "name"
          | "email"
          | "accessCode"
          | "village"
          | "city"
          | "tehsil"
          | "district"
          | "state"
        >
      >(
        "/api/devotees",
        {
          method: "POST",
          body: JSON.stringify({
            name: String(form.get("name") ?? "").trim(),
            email: String(form.get("email") ?? "").trim(),
            village: String(form.get("village") ?? "").trim(),
            city: String(form.get("city") ?? "").trim(),
            tehsil: String(form.get("tehsil") ?? "").trim(),
            district: String(form.get("district") ?? "").trim(),
            state: String(form.get("state") ?? "").trim(),
          }),
        },
        "admin"
      );
      const newDevotee: Devotee = {
        ...createdDevotee,
        totalJap: 0,
        activeSankalp: null,
      };
      setDevotees((current) => [newDevotee, ...current]);
      setSelectedDevoteeId(newDevotee.id);
      setDashboard((current) => ({
        ...current,
        devotees: current.devotees + 1,
      }));
      formElement.reset();
      setStatus("Devotee added");
      void loadData();
      void loadLocationOptions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add devotee");
    } finally {
      setIsAddingDevotee(false);
    }
  }

  async function createSankalp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const devoteeId = String(form.get("devoteeId") ?? "");
    const title = String(form.get("title") ?? "");
    const targetCount = Number(form.get("targetCount") ?? 0);
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");

    try {
      setIsAssigningSankalp(true);
      setStatus("Assigning sankalp...");
      const createdSankalp = await apiRequest<{
        id: string;
        title: string;
        targetCount: number;
        startDate: string;
        endDate: string;
        createdAt: string;
      }>(
        "/api/sankalps",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId,
            title,
            targetCount,
            startDate,
            endDate,
          }),
        },
        "admin"
      );
      setDevotees((current) =>
        current.map((devotee) =>
          devotee.id === devoteeId
            ? {
                ...devotee,
                activeSankalp: {
                  id: createdSankalp.id,
                  title,
                  targetCount,
                  completedCount: 0,
                  progressPercent: 0,
                  startDate,
                  endDate,
                  assignedAt: createdSankalp.createdAt,
                  isCompleted: false,
                },
              }
            : devotee
        )
      );
      setStatus("Sankalp assigned");
      formElement.reset();
      void loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not assign sankalp");
    } finally {
      setIsAssigningSankalp(false);
    }
  }

  const devoteeUrl =
    selectedDevotee && typeof window !== "undefined"
      ? `${window.location.origin}/devotee/${selectedDevotee.id}`
      : "";

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#211f1a]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-[#d8d0c0] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-[#8b5b29]">
              Jap Tracker
            </Link>
            <Link href="/admin/reports" className="ml-4 text-sm font-semibold text-[#1f4f70]">
              Reports
            </Link>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              Admin panel for devotee sankalp assignment and progress tracking.
            </h1>
          </div>
          <div className="rounded-md border border-[#d8d0c0] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-semibold">Status:</span>{" "}
            <span className="text-[#6b6255]">{isLoading ? "Loading..." : status}</span>
            <button
              className="ml-4 font-semibold text-[#8b5b29]"
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
            <div key={label} className="rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#6b6255]">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{formatCount(Number(value))}</p>
            </div>
          ))}
        </section>

        <section className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.4fr]">
          <div className="grid gap-6 lg:sticky lg:top-6">
            <div className="self-start rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Admin Actions</h2>
              <datalist id="village-options">
                {locationOptions.villages.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="city-options">
                {locationOptions.cities.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="tehsil-options">
                {locationOptions.tehsils.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="district-options">
                {locationOptions.districts.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="state-options">
                {locationOptions.states.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <div className="mt-5 grid gap-5">
                <form onSubmit={createDevotee} className="grid gap-3">
                  <p className="font-semibold">Add Devotee</p>
                  <input
                    name="name"
                    placeholder="Devotee name"
                    className="h-11 rounded-md border border-[#cfc5b2] px-3"
                    disabled={isAddingDevotee}
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="devotee@example.com"
                    className="h-11 rounded-md border border-[#cfc5b2] px-3"
                    disabled={isAddingDevotee}
                    required
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="village"
                      list="village-options"
                      placeholder="Village"
                      className="h-11 rounded-md border border-[#cfc5b2] px-3"
                      disabled={isAddingDevotee}
                    />
                    <input
                      name="city"
                      list="city-options"
                      placeholder="City"
                      className="h-11 rounded-md border border-[#cfc5b2] px-3"
                      disabled={isAddingDevotee}
                    />
                    <input
                      name="tehsil"
                      list="tehsil-options"
                      placeholder="Tehsil"
                      className="h-11 rounded-md border border-[#cfc5b2] px-3"
                      disabled={isAddingDevotee}
                    />
                    <input
                      name="district"
                      list="district-options"
                      placeholder="District"
                      className="h-11 rounded-md border border-[#cfc5b2] px-3"
                      disabled={isAddingDevotee}
                    />
                    <input
                      name="state"
                      list="state-options"
                      placeholder="State"
                      className="h-11 rounded-md border border-[#cfc5b2] px-3 sm:col-span-2"
                      disabled={isAddingDevotee}
                    />
                  </div>
                  <button
                    disabled={isAddingDevotee}
                    className="h-11 rounded-md bg-[#6f3f1f] px-4 font-semibold text-white transition hover:bg-[#553018] disabled:cursor-not-allowed disabled:bg-[#b99a83]"
                  >
                    {isAddingDevotee ? "Adding..." : "Add Devotee"}
                  </button>
                </form>

                <form onSubmit={createSankalp} className="grid gap-3 border-t border-[#e5dccd] pt-5">
                  <p className="font-semibold">Assign Sankalp</p>
                  <select
                    name="devoteeId"
                    className="h-11 rounded-md border border-[#cfc5b2] bg-white px-3"
                    disabled={isAssigningSankalp}
                    required
                  >
                    <option value="">Select devotee</option>
                    {devotees.map((devotee) => (
                      <option key={devotee.id} value={devotee.id}>
                        {devotee.name}
                      </option>
                    ))}
                  </select>
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
                </form>
              </div>
            </div>

            <div className="self-start rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Devotee Access</h2>
              <label className="mt-4 grid gap-2 text-sm font-medium">
                Select devotee
                <select
                  value={selectedDevoteeId}
                  onChange={(event) => setSelectedDevoteeId(event.target.value)}
                  className="h-11 rounded-md border border-[#cfc5b2] bg-white px-3"
                >
                  <option value="">Select devotee</option>
                  {devotees.map((devotee) => (
                    <option key={devotee.id} value={devotee.id}>
                      {devotee.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedDevotee ? (
                <div className="mt-4 grid gap-3">
                  <p className="text-sm text-[#6b6255]">{selectedDevotee.email}</p>
                  <p className="rounded-md border border-[#e5dccd] bg-[#faf8f3] px-3 py-2 text-sm">
                    Access code: <span className="font-semibold">{selectedDevotee.accessCode}</span>
                  </p>
                  <Link
                    href={`/devotee/${selectedDevotee.id}`}
                    className="h-11 rounded-md bg-[#1f6f5b] px-4 py-3 text-center font-semibold text-white transition hover:bg-[#185746]"
                  >
                    Open Devotee Panel
                  </Link>
                  <input
                    readOnly
                    value={devoteeUrl}
                    className="h-11 rounded-md border border-[#cfc5b2] bg-[#faf8f3] px-3 text-sm"
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#6b6255]">Add a devotee to generate a link.</p>
              )}
            </div>
          </div>

          <div className="grid min-w-0 gap-6">
            <div className="self-start rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">All Devotees</h2>
              <div className="mt-5 grid max-h-[560px] gap-3 overflow-y-auto pr-2">
                {devotees.length ? (
                  devotees.map((devotee) => (
                    <div
                      key={devotee.id}
                      className="grid gap-3 rounded-md border border-[#e5dccd] p-4 sm:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-semibold">{devotee.name}</p>
                        <p className="text-sm text-[#6b6255]">{devotee.email}</p>
                        <p className="mt-1 text-sm text-[#6b6255]">
                          {[devotee.village || devotee.city, devotee.tehsil, devotee.district, devotee.state]
                            .filter(Boolean)
                            .join(", ") || "Location not added"}
                        </p>
                        {devotee.activeSankalp ? (
                          <div className="mt-3">
                            <div className="mb-2 flex justify-between text-sm">
                              <span>{devotee.activeSankalp.title}</span>
                              <span>
                                {devotee.activeSankalp.isCompleted
                                  ? "Completed"
                                  : `${devotee.activeSankalp.progressPercent}%`}
                              </span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-[#ebe4d7]">
                              <div
                                className="h-full bg-[#1f6f5b]"
                                style={{ width: `${devotee.activeSankalp.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[#8b5b29]">No active sankalp</p>
                        )}
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold">{formatCount(devotee.totalJap)}</p>
                        <p className="text-sm text-[#6b6255]">total jap</p>
                        <p className="mt-2 text-sm text-[#6b6255]">
                          Code: <span className="font-semibold">{devotee.accessCode}</span>
                        </p>
                        <Link
                          href={`/devotee/${devotee.id}`}
                          className="mt-3 inline-flex rounded-md border border-[#cfc5b2] px-3 py-2 text-sm font-semibold"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#6b6255]">No devotees added yet.</p>
                )}
              </div>
            </div>

            <div className="self-start rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Active Sankalp Progress</h2>
              <div className="mt-5 grid gap-4">
                {dashboard.sankalps.length ? (
                  dashboard.sankalps.map((sankalp) => (
                    <div key={sankalp.id} className="rounded-md border border-[#e5dccd] p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">{sankalp.devoteeName}</p>
                          <p className="text-sm text-[#6b6255]">{sankalp.title}</p>
                        </div>
                        <p className="text-sm font-semibold">{sankalp.progressPercent}%</p>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#ebe4d7]">
                        <div
                          className="h-full bg-[#d7902f]"
                          style={{ width: `${sankalp.progressPercent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-[#6b6255]">
                        {formatCount(sankalp.completedCount)} /{" "}
                        {formatCount(sankalp.targetCount)} jap
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#6b6255]">No sankalp assigned yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
