"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiRequest, NetworkError, today, type Devotee, type JapEntry } from "../lib/api";
import { clearSession, getToken, isAuthError } from "../lib/auth";
import { enqueueJap, flushJapQueue, pendingJapCount } from "../lib/japQueue";
import { useToast } from "../components/ui";

/**
 * Consecutive-day logging streak, counting back from today (or yesterday).
 * `extraDay` lets a jap that is only queued offline still hold the streak.
 */
function computeStreak(entries: JapEntry[], extraDay?: string) {
  const days = new Set(entries.map((entry) => dayKey(entry.entryDate)));
  if (extraDay) days.add(extraDay);
  if (days.size === 0) return 0;

  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function daysBetween(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

type SaveJapInput = {
  count: number;
  entryDate?: string;
  notes?: string;
};

type DevoteeData = {
  devotee: Devotee | null;
  entries: JapEntry[];
  isLoading: boolean;
  isSavingJap: boolean;
  /** Jap recorded today, including entries still queued offline. */
  todayCount: number;
  streak: number;
  /** Jap saved on this device but not yet accepted by the server. */
  pendingCount: number;
  isOffline: boolean;
  reload: () => Promise<void>;
  saveJap: (input: SaveJapInput) => Promise<boolean>;
  logout: () => void;
};

const DevoteeDataContext = createContext<DevoteeData | null>(null);

/**
 * Loads the signed-in devotee once for the whole tab group. Every devotee
 * screen reads from here instead of fetching its own copy, so switching tabs
 * is instant and a jap saved on one tab is reflected on all of them.
 */
export function DevoteeDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [devotee, setDevotee] = useState<Devotee | null>(null);
  const [entries, setEntries] = useState<JapEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingJap, setIsSavingJap] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  const logout = useCallback(() => {
    clearSession("devotee");
    router.replace("/login");
  }, [router]);

  const reload = useCallback(async () => {
    if (!getToken("devotee")) {
      router.replace("/login");
      return;
    }

    try {
      const [devoteeData, entryData] = await Promise.all([
        apiRequest<Devotee>("/api/me", undefined, "devotee"),
        apiRequest<JapEntry[]>("/api/jap-entries", undefined, "devotee"),
      ]);
      setDevotee(devoteeData);
      setEntries(entryData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load your details";
      if (isAuthError(message)) {
        clearSession("devotee");
        router.replace("/login");
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    // Fetch-on-mount: loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const saveJap = useCallback(
    async ({ count, entryDate, notes }: SaveJapInput) => {
      if (!devotee) return false;

      const payload = {
        devoteeId: devotee.id,
        sankalpId: devotee.activeSankalp?.id ?? null,
        count,
        entryDate: entryDate ?? today(),
        notes,
      };

      try {
        setIsSavingJap(true);
        await apiRequest(
          "/api/jap-entries",
          { method: "POST", body: JSON.stringify(payload) },
          "devotee"
        );
        setIsOffline(false);
        await reload();
        return true;
      } catch (error) {
        // Offline is not a failure: keep the jap on the device and sync later,
        // so chanting away from signal never costs the devotee their count.
        if (error instanceof NetworkError) {
          enqueueJap(payload);
          setPendingCount(pendingJapCount(devotee.id));
          setIsOffline(true);
          toast.info("Saved on your device. It will sync when you're back online.");
          return true;
        }
        toast.error(error instanceof Error ? error.message : "Could not save jap");
        return false;
      } finally {
        setIsSavingJap(false);
      }
    },
    [devotee, reload, toast]
  );

  /**
   * Drain anything queued offline. Runs after the devotee loads and again
   * whenever the browser reports a connection, so a devotee who chanted in
   * the fields sees their jap land as soon as they reach signal.
   */
  const sync = useCallback(async () => {
    if (!devotee) return;

    const { synced, remaining } = await flushJapQueue();
    setPendingCount(pendingJapCount(devotee.id));
    setIsOffline(remaining > 0);

    if (synced > 0) {
      toast.success(`${synced} offline jap ${synced === 1 ? "entry" : "entries"} synced 🙏`);
      await reload();
    }
  }, [devotee, reload, toast]);

  useEffect(() => {
    if (!devotee) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingCount(pendingJapCount(devotee.id));
    void sync();

    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [devotee, sync]);

  const todayKey = today();
  const serverTodayCount = useMemo(
    () =>
      entries
        .filter((entry) => dayKey(entry.entryDate) === todayKey)
        .reduce((sum, entry) => sum + entry.count, 0),
    [entries, todayKey]
  );
  // Queued jap counts towards today straight away — from the devotee's point
  // of view it is already recorded, the sync is an implementation detail.
  const todayCount =
    serverTodayCount + (devotee ? pendingJapCount(devotee.id, todayKey) : 0);

  const streak = useMemo(
    () => computeStreak(entries, todayCount > 0 ? todayKey : undefined),
    [entries, todayCount, todayKey]
  );

  const value = useMemo(
    () => ({
      devotee,
      entries,
      isLoading,
      isSavingJap,
      todayCount,
      streak,
      pendingCount,
      isOffline,
      reload,
      saveJap,
      logout,
    }),
    [
      devotee,
      entries,
      isLoading,
      isSavingJap,
      todayCount,
      streak,
      pendingCount,
      isOffline,
      reload,
      saveJap,
      logout,
    ]
  );

  return <DevoteeDataContext.Provider value={value}>{children}</DevoteeDataContext.Provider>;
}

export function useDevoteeData() {
  const context = useContext(DevoteeDataContext);
  if (!context) {
    throw new Error("useDevoteeData must be used inside a DevoteeDataProvider");
  }
  return context;
}
