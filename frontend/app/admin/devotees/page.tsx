"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  Devotee,
  emptyLocationOptions,
  formatCount,
  LocationOptions,
} from "../../lib/api";
import { TrustShell } from "../../components/TrustShell";

export default function AdminDevoteesPage() {
  const router = useRouter();
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [selectedDevoteeId, setSelectedDevoteeId] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDevotee, setIsAddingDevotee] = useState(false);
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
      const [devoteeData, options] = await Promise.all([
        apiRequest<Devotee[]>("/api/devotees", undefined, "admin"),
        apiRequest<LocationOptions>("/api/locations/options", undefined, "admin").catch(
          () => emptyLocationOptions
        ),
      ]);
      setDevotees(devoteeData);
      setSelectedDevoteeId((current) => current || devoteeData[0]?.id || "");
      setLocationOptions(options);
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
      formElement.reset();
      setStatus("Devotee added");
      void loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add devotee");
    } finally {
      setIsAddingDevotee(false);
    }
  }

  const devoteeUrl =
    selectedDevotee && typeof window !== "undefined"
      ? `${window.location.origin}/devotee/${selectedDevotee.id}`
      : "";

  return (
    <TrustShell active="admin">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid gap-5 border-b border-[#eadcc2] pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-[#8a3d16]">
              Admin Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Devotee Management</h1>
            <p className="mt-3 max-w-2xl text-[#6b6255]">
              Add devotees once, then use their access code or panel link for daily jap entry.
            </p>
          </div>
          <p className="rounded-md border border-[#eadcc2] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-semibold">Status:</span>{" "}
            <span className="text-[#6b6255]">{isLoading ? "Loading..." : status}</span>
          </p>
        </header>

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

        <section className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.25fr]">
          <form
            onSubmit={createDevotee}
            className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm lg:sticky lg:top-28"
          >
            <h2 className="text-xl font-semibold">Add Devotee</h2>
            <div className="mt-5 grid gap-3">
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
                {[
                  ["village", "Village", "village-options"],
                  ["city", "City", "city-options"],
                  ["tehsil", "Tehsil", "tehsil-options"],
                  ["district", "District", "district-options"],
                ].map(([name, placeholder, list]) => (
                  <input
                    key={name}
                    name={name}
                    list={list}
                    placeholder={placeholder}
                    className="h-11 rounded-md border border-[#cfc5b2] px-3"
                    disabled={isAddingDevotee}
                  />
                ))}
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
                className="h-11 rounded-md bg-[#8a3d16] px-4 font-semibold text-white transition hover:bg-[#6f3011] disabled:cursor-not-allowed disabled:bg-[#b99a83]"
              >
                {isAddingDevotee ? "Adding..." : "Add Devotee"}
              </button>
            </div>
          </form>

          <div className="grid gap-6">
            <div className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm">
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
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <p className="text-sm text-[#6b6255] sm:col-span-2">{selectedDevotee.email}</p>
                  <p className="rounded-md border border-[#f0e3cc] bg-[#fffaf1] px-3 py-2 text-sm">
                    Access code: <span className="font-semibold">{selectedDevotee.accessCode}</span>
                  </p>
                  <Link
                    href={`/devotee/${selectedDevotee.id}`}
                    className="rounded-md bg-[#1f6f5b] px-4 py-2 text-center font-semibold text-white transition hover:bg-[#185746]"
                  >
                    Open Panel
                  </Link>
                  <input
                    readOnly
                    value={devoteeUrl}
                    className="h-11 rounded-md border border-[#cfc5b2] bg-[#fffaf1] px-3 text-sm sm:col-span-2"
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#6b6255]">Add a devotee to generate access.</p>
              )}
            </div>

            <div className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">All Devotees</h2>
              <div className="mt-5 grid gap-3">
                {devotees.map((devotee) => (
                  <div
                    key={devotee.id}
                    className="grid gap-3 rounded-md border border-[#f0e3cc] p-4 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-semibold">{devotee.name}</p>
                      <p className="text-sm text-[#6b6255]">{devotee.email}</p>
                      <p className="mt-1 text-sm text-[#6b6255]">
                        {[devotee.village || devotee.city, devotee.tehsil, devotee.district, devotee.state]
                          .filter(Boolean)
                          .join(", ") || "Location not added"}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold">{formatCount(devotee.totalJap)}</p>
                      <p className="text-sm text-[#6b6255]">total jap</p>
                      <p className="mt-2 text-sm text-[#6b6255]">
                        Code: <span className="font-semibold">{devotee.accessCode}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {!devotees.length ? (
                  <p className="text-sm text-[#6b6255]">No devotees added yet.</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </TrustShell>
  );
}

