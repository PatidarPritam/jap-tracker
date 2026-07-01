/**
 * Client-side session helpers. Tokens live in localStorage under
 * `${role}Token`, matching the keys read by apiRequest in lib/api.ts.
 */
export type AuthRole = "admin" | "devotee";

export function getToken(role: AuthRole): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`${role}Token`);
}

export function setAdminSession(token: string): void {
  window.localStorage.setItem("adminToken", token);
}

export function setDevoteeSession(token: string, devoteeId: string): void {
  window.localStorage.setItem("devoteeToken", token);
  window.localStorage.setItem("devoteeId", devoteeId);
}

export function clearSession(role: AuthRole): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${role}Token`);
  if (role === "devotee") {
    window.localStorage.removeItem("devoteeId");
  }
}

/** True when an API error message means the session is invalid/expired. */
export function isAuthError(message: string): boolean {
  return message === "Login required" || message === "Access denied";
}

/** The role whose token is present, preferring admin (used on shared pages). */
export function activeRole(): AuthRole {
  return getToken("admin") ? "admin" : "devotee";
}
