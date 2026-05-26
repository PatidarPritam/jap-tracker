"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  Devotee,
  formatCount,
  formatDate,
  JapEntry,
  today,
} from "../../lib/api";

export default function DevoteePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [devotee, setDevotee] = useState<Devotee | null>(null);
  const [entries, setEntries] = useState<JapEntry[]>([]);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(true);
  const [hasTriedLoad, setHasTriedLoad] = useState(false);
  const [isSavingJap, setIsSavingJap] = useState(false);

  async function loadData() {
    const authRole = window.localStorage.getItem("adminToken") ? "admin" : "devotee";

    if (authRole === "devotee" && !window.localStorage.getItem("devoteeToken")) {
      router.push("/devotee/login");
      return;
    }

    setIsLoading(true);
    setHasTriedLoad(false);
    try {
      const [devoteeData, entryData] = await Promise.all([
        apiRequest<Devotee>(`/api/devotees/${id}`, undefined, authRole),
        apiRequest<JapEntry[]>(`/api/jap-entries?devoteeId=${id}`, undefined, authRole),
      ]);
      setDevotee(devoteeData);
      setEntries(entryData);
      setStatus("Synced");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load devotee";
      setStatus(message);

      if (message === "Login required" || message === "Access denied") {
        window.localStorage.removeItem("devoteeToken");
        window.localStorage.removeItem("devoteeId");
        router.push("/devotee/login");
      }
    } finally {
      setHasTriedLoad(true);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function createJapEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);

    try {
      setIsSavingJap(true);
      setStatus("Saving jap...");
      await apiRequest(
        "/api/jap-entries",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId: id,
            sankalpId: devotee?.activeSankalp?.id,
            count: form.get("count"),
            entryDate: form.get("entryDate"),
            notes: form.get("notes"),
          }),
        },
        window.localStorage.getItem("adminToken") ? "admin" : "devotee"
      );
      formElement.reset();
      await loadData();
      setStatus("Jap saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save jap");
    } finally {
      setIsSavingJap(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#211f1a]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-[#d8d0c0] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-[#8b5b29]">
              Jap Tracker
            </Link>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              {devotee ? `Jap dashboard for ${devotee.name}` : "Devotee dashboard"}
            </h1>
          </div>
          <div className="rounded-md border border-[#d8d0c0] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-semibold">Status:</span>{" "}
            <span className="text-[#6b6255]">{isLoading ? "Loading..." : status}</span>
            <button
              className="ml-4 font-semibold text-[#8b5b29]"
              onClick={() => {
                window.localStorage.removeItem("devoteeToken");
                window.localStorage.removeItem("devoteeId");
                router.push("/devotee/login");
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-md border border-[#d8d0c0] bg-white p-6 shadow-sm">
            <p className="font-semibold">Loading devotee dashboard...</p>
            <p className="mt-2 text-sm text-[#6b6255]">Fetching latest sankalp and jap entries.</p>
          </div>
        ) : devotee ? (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.2fr]">
            <div className="grid gap-6">
              <div className="rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold">My Sankalp</h2>
                {devotee.activeSankalp ? (
                  <div className="mt-5">
                    <p className="text-lg font-semibold">{devotee.activeSankalp.title}</p>
                    <p className="mt-1 text-sm text-[#6b6255]">
                      {formatDate(devotee.activeSankalp.startDate)} to{" "}
                      {formatDate(devotee.activeSankalp.endDate)}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-[#e5dccd] p-4">
                        <p className="text-sm text-[#6b6255]">Completed</p>
                        <p className="mt-1 text-2xl font-semibold">
                          {formatCount(devotee.activeSankalp.completedCount)}
                        </p>
                      </div>
                      <div className="rounded-md border border-[#e5dccd] p-4">
                        <p className="text-sm text-[#6b6255]">Target</p>
                        <p className="mt-1 text-2xl font-semibold">
                          {formatCount(devotee.activeSankalp.targetCount)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {devotee.activeSankalp.isCompleted
                            ? "Completed"
                            : `${devotee.activeSankalp.progressPercent}%`}
                        </span>
                      </div>
                      <div className="h-4 overflow-hidden rounded-full bg-[#ebe4d7]">
                        <div
                          className="h-full bg-[#1f6f5b]"
                          style={{ width: `${devotee.activeSankalp.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#6b6255]">
                    Admin has not assigned an active sankalp yet.
                  </p>
                )}
              </div>

              <form
                onSubmit={createJapEntry}
                className="rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm"
              >
                <h2 className="text-xl font-semibold">Add Daily Jap</h2>
                <div className="mt-5 grid gap-4">
                  <input
                    name="count"
                    type="number"
                    min="1"
                    placeholder="Jap count"
                    className="h-11 rounded-md border border-[#cfc5b2] px-3"
                    disabled={isSavingJap}
                    required
                  />
                  <input
                    name="entryDate"
                    type="date"
                    defaultValue={today()}
                    className="h-11 rounded-md border border-[#cfc5b2] px-3"
                    disabled={isSavingJap}
                    required
                  />
                  <input
                    name="notes"
                    placeholder="Notes"
                    className="h-11 rounded-md border border-[#cfc5b2] px-3"
                    disabled={isSavingJap}
                  />
                  <button
                    type="submit"
                    disabled={isSavingJap}
                    className="h-11 rounded-md bg-[#1f6f5b] px-4 font-semibold text-white transition hover:bg-[#185746] disabled:cursor-not-allowed disabled:bg-[#8bb5a8]"
                  >
                    {isSavingJap ? "Saving..." : "Save Jap"}
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-md border border-[#d8d0c0] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">My Jap History</h2>
              <div className="mt-5 grid gap-3">
                {entries.length ? (
                  entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-2 rounded-md border border-[#e5dccd] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">{formatCount(entry.count)} jap</p>
                        <p className="text-sm text-[#6b6255]">{formatDate(entry.entryDate)}</p>
                        {entry.notes ? (
                          <p className="mt-1 text-sm text-[#6b6255]">{entry.notes}</p>
                        ) : null}
                      </div>
                      <p className="text-sm text-[#8b5b29]">{entry.sankalp?.title ?? "General"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#6b6255]">No jap entries yet.</p>
                )}
              </div>
            </div>
          </section>
        ) : hasTriedLoad ? (
          <div className="rounded-md border border-[#d8d0c0] bg-white p-6 shadow-sm">
            <p className="font-semibold">No devotee found for this link.</p>
            <p className="mt-2 text-sm text-[#6b6255]">
              Please ask admin to create or resend the correct devotee access link.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
