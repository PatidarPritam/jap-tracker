export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

export type Devotee = {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  accessCode?: string;
  /** False when the admin has deactivated them; they keep their jap history. */
  isActive?: boolean;
  village?: string | null;
  city?: string | null;
  tehsil?: string | null;
  district?: string | null;
  state?: string | null;
  totalJap: number;
  activeSankalp: {
    id: string;
    title: string;
    targetCount: number;
    completedCount: number;
    progressPercent: number;
    startDate: string;
    endDate: string;
    assignedAt: string;
    isCompleted: boolean;
  } | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Normalize a list response into a Paginated shape. Tolerates a legacy backend
 * that returns a plain array (pre-pagination) so the UI never crashes on a
 * shape mismatch during a partial deploy / stale build.
 */
export function asPage<T>(data: Paginated<T> | T[] | null | undefined): Paginated<T> {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, pageSize: data.length || 1 };
  }
  return {
    items: data?.items ?? [],
    total: data?.total ?? data?.items?.length ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
  };
}

export type LocationReport = {
  summary: {
    devotees: number;
    totalJap: number;
    activeSankalps: number;
    completedSankalps: number;
  };
  grouped: Array<{
    state: string | null;
    district: string | null;
    tehsil: string | null;
    village: string | null;
    city: string | null;
    devotees: number;
    totalJap: number;
  }>;
  devotees: Array<{
    id: string;
    name: string;
    email: string;
    mobile: string | null;
    village: string | null;
    city: string | null;
    tehsil: string | null;
    district: string | null;
    state: string | null;
    totalJap: number;
    activeTarget: number | null;
    completedCount: number;
    progressPercent: number;
  }>;
};

export type LocationOptions = {
  states: string[];
  districts: string[];
  tehsils: string[];
  villages: string[];
  cities: string[];
};

export const emptyLocationOptions: LocationOptions = {
  states: [],
  districts: [],
  tehsils: [],
  villages: [],
  cities: [],
};

export type JapEntry = {
  id: string;
  count: number;
  entryDate: string;
  notes: string | null;
  sankalp: {
    id: string;
    title: string;
    targetCount: number;
  } | null;
};

export type SankalpStatus = "ACTIVE" | "CANCELLED" | "SUPERSEDED";

/** A row from the admin sankalp history list (`GET /api/sankalps`). */
export type SankalpSummary = {
  id: string;
  devoteeId: string;
  devoteeName: string;
  title: string;
  targetCount: number;
  completedCount: number;
  progressPercent: number;
  startDate: string;
  endDate: string;
  status: SankalpStatus;
  createdAt: string;
  isCompleted: boolean;
};

export type TrendsReport = {
  days: number;
  daily: Array<{ date: string; count: number }>;
  thisMonth: number;
  lastMonth: number;
  activeDevotees: number;
  /** Null when last month had no jap at all — no meaningful baseline. */
  changePercent: number | null;
  topDevotees: Array<{ id: string; name: string; total: number }>;
};

/** An active sankalp nearing (or past) its end date, for follow-up. */
export type ExpiringSankalp = {
  id: string;
  devoteeId: string;
  devoteeName: string;
  mobile: string | null;
  title: string;
  targetCount: number;
  completedCount: number;
  progressPercent: number;
  endDate: string;
  /** Negative once the end date has passed. */
  daysLeft: number;
};

export type ExpiringReport = {
  items: ExpiringSankalp[];
  days: number;
};

/** A devotee with no recent jap entry — `daysSince` is null if they never started. */
export type InactiveDevotee = {
  id: string;
  name: string;
  mobile: string | null;
  village: string | null;
  city: string | null;
  tehsil: string | null;
  district: string | null;
  state: string | null;
  lastEntryDate: string | null;
  daysSince: number | null;
  totalJap: number;
  hasActiveSankalp: boolean;
};

export type InactiveReport = {
  items: InactiveDevotee[];
  days: number;
  neverStarted: number;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** One parsed CSV row, ready to send to `POST /api/devotees/bulk`. */
export type BulkDevoteeRow = {
  name: string;
  email: string;
  mobile?: string | null;
  village?: string | null;
  city?: string | null;
  tehsil?: string | null;
  district?: string | null;
  state?: string | null;
};

export type Dashboard = {
  devotees: number;
  totalJap: number;
  activeSankalps: number;
  completedSankalps: number;
  sankalps: Array<{
    id: string;
    title: string;
    devoteeName: string;
    targetCount: number;
    completedCount: number;
    progressPercent: number;
    startDate: string;
    endDate: string;
    assignedAt: string;
    isCompleted: boolean;
  }>;
};

export const defaultDashboard: Dashboard = {
  devotees: 0,
  totalJap: 0,
  activeSankalps: 0,
  completedSankalps: 0,
  sankalps: [],
};

/**
 * The request never reached the server (offline, DNS, connection dropped).
 * Callers use this to tell "retry later" apart from "the server said no",
 * which must not be retried.
 */
export class NetworkError extends Error {
  constructor() {
    super("You appear to be offline");
    this.name = "NetworkError";
  }
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
  authRole?: "admin" | "devotee"
): Promise<T> {
  const token =
    typeof window !== "undefined" && authRole
      ? window.localStorage.getItem(`${authRole}Token`)
      : null;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch {
    // fetch only rejects on a transport-level failure.
    throw new NetworkError();
  }
  const text = await response.text();
  let json: { success?: boolean; message?: string; data?: T };

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      response.status === 404
        ? "API route not found. Please restart the backend server."
        : "Backend returned an invalid response. Please check the backend server."
    );
  }

  if (!response.ok || !json.success) {
    throw new Error(json.message ?? "Request failed");
  }

  return json.data as T;
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

/**
 * Percentages carry one decimal only while they are small, so early progress
 * on a 100,000-jap sankalp reads as 0.3% rather than a discouraging 0%.
 */
export function formatPercent(value: number) {
  if (value >= 100) return "100";
  // Floored so a nearly-finished sankalp never displays as 100%.
  return value > 0 && value < 10 ? String(Math.floor(value * 10) / 10) : String(Math.floor(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function threeMonthsFromToday() {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().slice(0, 10);
}
