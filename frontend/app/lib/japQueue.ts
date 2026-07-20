import { apiRequest, NetworkError } from "./api";

const QUEUE_KEY = "pendingJapEntries";

export type PendingJap = {
  /** Local id, so a flush can remove exactly this entry. */
  id: string;
  devoteeId: string;
  sankalpId?: string | null;
  count: number;
  entryDate: string;
  notes?: string;
  queuedAt: number;
};

function read(): PendingJap[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt payload — drop it rather than wedging every future save.
    return [];
  }
}

function write(entries: PendingJap[]) {
  if (entries.length) {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  } else {
    window.localStorage.removeItem(QUEUE_KEY);
  }
}

export function pendingJap(): PendingJap[] {
  return read();
}

/**
 * Total jap sitting in the queue, so the UI can count it as already logged.
 * Pass `entryDate` to count only the jap queued for that day.
 */
export function pendingJapCount(devoteeId: string, entryDate?: string): number {
  return read()
    .filter((entry) => entry.devoteeId === devoteeId)
    .filter((entry) => !entryDate || entry.entryDate === entryDate)
    .reduce((sum, entry) => sum + entry.count, 0);
}

export function enqueueJap(entry: Omit<PendingJap, "id" | "queuedAt">): PendingJap {
  const queued: PendingJap = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: Date.now(),
  };
  write([...read(), queued]);
  return queued;
}

export type FlushResult = {
  /** Entries accepted by the server during this flush. */
  synced: number;
  /** Entries still queued — either still offline, or nothing was pending. */
  remaining: number;
};

/**
 * Push queued jap to the server, oldest first. Stops at the first network
 * failure (still offline) and leaves the rest queued. Entries the server
 * rejects outright are dropped — retrying them would fail forever.
 */
export async function flushJapQueue(): Promise<FlushResult> {
  const queue = read();
  if (!queue.length) return { synced: 0, remaining: 0 };

  let synced = 0;
  let index = 0;

  for (const entry of queue) {
    try {
      await apiRequest(
        "/api/jap-entries",
        {
          method: "POST",
          body: JSON.stringify({
            devoteeId: entry.devoteeId,
            sankalpId: entry.sankalpId,
            count: entry.count,
            entryDate: entry.entryDate,
            notes: entry.notes,
          }),
        },
        "devotee"
      );
      synced += 1;
      index += 1;
    } catch (error) {
      if (error instanceof NetworkError) {
        // Still offline — keep this entry and everything after it.
        break;
      }
      // Server refused it (validation, expired sankalp). Drop so the queue
      // cannot get stuck behind one bad entry.
      index += 1;
    }
  }

  const remainingEntries = queue.slice(index);
  write(remainingEntries);
  return { synced, remaining: remainingEntries.length };
}
