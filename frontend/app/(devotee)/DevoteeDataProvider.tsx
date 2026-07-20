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
import { apiRequest, today, type Devotee, type JapEntry } from "../lib/api";
import { clearSession, getToken, isAuthError } from "../lib/auth";
import { useToast } from "../components/ui";

/** Consecutive-day logging streak, counting back from today (or yesterday). */
function computeStreak(entries: JapEntry[]) {
  const days = new Set(entries.map((entry) => dayKey(entry.entryDate)));
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
  /** Jap recorded today, summed across entries. */
  todayCount: number;
  streak: number;
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
      try {
        setIsSavingJap(true);
        await apiRequest(
          "/api/jap-entries",
          {
            method: "POST",
            body: JSON.stringify({
              devoteeId: devotee?.id,
              sankalpId: devotee?.activeSankalp?.id,
              count,
              entryDate: entryDate ?? today(),
              notes,
            }),
          },
          "devotee"
        );
        await reload();
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save jap");
        return false;
      } finally {
        setIsSavingJap(false);
      }
    },
    [devotee, reload, toast]
  );

  const todayKey = today();
  const todayCount = useMemo(
    () =>
      entries
        .filter((entry) => dayKey(entry.entryDate) === todayKey)
        .reduce((sum, entry) => sum + entry.count, 0),
    [entries, todayKey]
  );
  const streak = useMemo(() => computeStreak(entries), [entries]);

  const value = useMemo(
    () => ({
      devotee,
      entries,
      isLoading,
      isSavingJap,
      todayCount,
      streak,
      reload,
      saveJap,
      logout,
    }),
    [devotee, entries, isLoading, isSavingJap, todayCount, streak, reload, saveJap, logout]
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
