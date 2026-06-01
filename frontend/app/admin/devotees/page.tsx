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

export default function AdminDevoteesPage() {
  const router = useRouter();
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [selectedDevoteeId, setSelectedDevoteeId] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDevotee, setIsAddingDevotee] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationOptions>(emptyLocationOptions);

  const selectedDevotee = useMemo(
    () => devotees.find((devotee) => devotee.id === selectedDevoteeId),
    [devotees, selectedDevoteeId]
  );
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
      const [devoteeData, options] = await Promise.all([
        apiRequest<Devotee[]>("/api/devotees", undefined, "admin"),
        apiRequest<LocationOptions>("/api/locations/options", undefined, "admin").catch(
          () => emptyLocationOptions
        ),
      ]);
      setDevotees(devoteeData);
      setSelectedDevoteeId((current) => current || devoteeData[0]?.id || "");
      setLocationOptions(options);
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
          | "mobile"
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
            mobile: String(form.get("mobile") ?? "").trim(),
            village: String(form.get("village") ?? "").trim(),
            city: String(form.get("city") ?? "").trim(),
            tehsil: String(form.get("tehsil") ?? "").trim(),
            district: String(form.get("district") ?? "").trim(),
            state: String(form.get("state") ?? "").trim(),
          }),
        },
        "admin"
      );
      await apiRequest(
        "/api/sankalps",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId: createdDevotee.id,
            title: String(form.get("title") ?? ""),
            targetCount: Number(form.get("targetCount") ?? 0),
            startDate: String(form.get("startDate") ?? ""),
            endDate: String(form.get("endDate") ?? ""),
          }),
        },
        "admin"
      );
      const newDevotee: Devotee = {
        ...createdDevotee,
        totalJap: 0,
        activeSankalp: {
          id: "new",
          title: String(form.get("title") ?? ""),
          targetCount: Number(form.get("targetCount") ?? 0),
          completedCount: 0,
          progressPercent: 0,
          startDate: String(form.get("startDate") ?? ""),
          endDate: String(form.get("endDate") ?? ""),
          assignedAt: new Date().toISOString(),
          isCompleted: false,
        },
      };
      setDevotees((current) => [newDevotee, ...current]);
      setSelectedDevoteeId(newDevotee.id);
      formElement.reset();
      setStatus("Devotee registered and sankalp assigned");
      void loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not register devotee";
      setStatus(
        message.includes("already exists")
          ? "This email already exists. Search the devotee and use Assign Sankalp."
          : message
      );
    } finally {
      setIsAddingDevotee(false);
    }
  }

  async function resetLoginPin() {
    if (!selectedDevotee) {
      return;
    }

    try {
      setIsResettingPin(true);
      setStatus("Resetting login PIN...");
      const updatedDevotee = await apiRequest<Pick<Devotee, "id" | "accessCode">>(
        `/api/devotees/${selectedDevotee.id}/reset-pin`,
        { method: "POST" },
        "admin"
      );
      setDevotees((current) =>
        current.map((devotee) =>
          devotee.id === updatedDevotee.id
            ? { ...devotee, accessCode: updatedDevotee.accessCode }
            : devotee
        )
      );
      setStatus("Login PIN reset");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not reset login PIN");
    } finally {
      setIsResettingPin(false);
    }
  }

  const devoteeUrl =
    selectedDevotee && typeof window !== "undefined"
      ? `${window.location.origin}/devotee/${selectedDevotee.id}`
      : "";

  if (!hasAdminAccess) {
    return (
      <TrustShell active="devotees">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md border border-[#eadcc2] bg-white p-6 shadow-sm">
            <p className="font-semibold">Checking admin login...</p>
          </div>
        </div>
      </TrustShell>
    );
  }

  return (
    <TrustShell active="devotees">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid gap-5 border-b border-[#eadcc2] pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-[#8a3d16]">
              Admin Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Register New Devotee</h1>
            <p className="mt-3 max-w-2xl text-[#6b6255]">
              For first-time devotees, create their profile and first sankalp together. For an
              existing devotee, search below and assign a new sankalp from the Sankalp page.
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
        <datalist id="devotee-search-options">
          {devotees.map((devotee) => (
            <option key={devotee.id} value={devoteeLabel(devotee)} />
          ))}
        </datalist>

        <section className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.25fr]">
          <form
            onSubmit={createDevotee}
            className="rounded-md border border-[#eadcc2] bg-white p-5 shadow-sm lg:sticky lg:top-28"
          >
            <h2 className="text-xl font-semibold">New Devotee + First Sankalp</h2>
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
              <input
                name="mobile"
                type="tel"
                inputMode="tel"
                placeholder="Mobile number"
                className="h-11 rounded-md border border-[#cfc5b2] px-3"
                disabled={isAddingDevotee}
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
              <div className="my-2 border-t border-[#f0e3cc]" />
              <input
                name="title"
                defaultValue="3 Month Jap Sankalp"
                className="h-11 rounded-md border border-[#cfc5b2] px-3"
                disabled={isAddingDevotee}
                required
              />
              <input
                name="targetCount"
                type="number"
                min="1"
                defaultValue="100000"
                className="h-11 rounded-md border border-[#cfc5b2] px-3"
                disabled={isAddingDevotee}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="startDate"
                  type="date"
                  defaultValue={today()}
                  className="h-11 rounded-md border border-[#cfc5b2] px-3"
                  disabled={isAddingDevotee}
                  required
                />
                <input
                  name="endDate"
                  type="date"
                  defaultValue={threeMonthsFromToday()}
                  className="h-11 rounded-md border border-[#cfc5b2] px-3"
                  disabled={isAddingDevotee}
                  required
                />
              </div>
              <button
                disabled={isAddingDevotee}
                className="h-11 rounded-md bg-[#8a3d16] px-4 font-semibold text-white transition hover:bg-[#6f3011] disabled:cursor-not-allowed disabled:bg-[#b99a83]"
              >
                {isAddingDevotee ? "Registering..." : "Register & Assign Sankalp"}
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
                      {devoteeLabel(devotee)}
                    </option>
                  ))}
                </select>
              </label>
              {selectedDevotee ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <p className="text-sm text-[#6b6255] sm:col-span-2">
                    {selectedDevotee.email}
                    {selectedDevotee.mobile ? ` | Mobile: ${selectedDevotee.mobile}` : ""}
                  </p>
                  <p className="rounded-md border border-[#f0e3cc] bg-[#fffaf1] px-3 py-2 text-sm">
                    Login PIN: <span className="font-semibold">{selectedDevotee.accessCode}</span>
                  </p>
                  <Link
                    href={`/devotee/${selectedDevotee.id}`}
                    className="rounded-md bg-[#1f6f5b] px-4 py-2 text-center font-semibold text-white transition hover:bg-[#185746]"
                  >
                    Open Panel
                  </Link>
                  <button
                    type="button"
                    disabled={isResettingPin}
                    onClick={resetLoginPin}
                    className="rounded-md border border-[#cfc5b2] px-4 py-2 text-center font-semibold transition hover:border-[#8a3d16] disabled:cursor-not-allowed disabled:text-[#9a8f7f] sm:col-span-2"
                  >
                    {isResettingPin ? "Resetting..." : "Reset Login PIN"}
                  </button>
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
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                list="devotee-search-options"
                placeholder="Search by name, mobile, email, PIN, village, city, district..."
                className="mt-4 h-11 w-full rounded-md border border-[#cfc5b2] px-3"
              />
              <div className="mt-5 grid gap-3">
                {filteredDevotees.map((devotee) => (
                  <div
                    key={devotee.id}
                    className="grid gap-3 rounded-md border border-[#f0e3cc] p-4 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-semibold">{devotee.name}</p>
                      <p className="text-sm text-[#6b6255]">{devotee.email}</p>
                      {devotee.mobile ? (
                        <p className="text-sm text-[#6b6255]">Mobile: {devotee.mobile}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-[#6b6255]">
                        {locationText(devotee)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold">{formatCount(devotee.totalJap)}</p>
                      <p className="text-sm text-[#6b6255]">total jap</p>
                      <p className="mt-2 text-sm text-[#6b6255]">
                        PIN: <span className="font-semibold">{devotee.accessCode}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {!filteredDevotees.length ? (
                  <p className="text-sm text-[#6b6255]">
                    {devotees.length ? "No devotees match this search." : "No devotees added yet."}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </TrustShell>
  );
}
