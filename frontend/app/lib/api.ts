export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export type Devotee = {
  id: string;
  name: string;
  email: string;
  accessCode?: string;
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

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
  authRole?: "admin" | "devotee"
): Promise<T> {
  const token =
    typeof window !== "undefined" && authRole
      ? window.localStorage.getItem(`${authRole}Token`)
      : null;

  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message ?? "Request failed");
  }

  return json.data;
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
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
