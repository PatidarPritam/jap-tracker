"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getToken, isAuthError } from "../lib/auth";

/**
 * Shared admin route guard. Redirects to the login page when no admin token
 * is present, and exposes a helper to clear the session + redirect when an
 * API call reports an auth error (expired/invalid token).
 *
 * Pages still own their own "data loaded" state, so content is only rendered
 * after a successful authenticated request — preventing a flash of UI behind
 * a stale token.
 */
export function useAdminGuard() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // localStorage is client-only, so the token check must run in an effect
    // (reading it during render would cause a hydration mismatch).
    if (!getToken("admin")) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasToken(true);
  }, [router]);

  /**
   * Returns true and handles cleanup/redirect if the error was an auth error.
   * Memoized so pages can safely list it in effect/useCallback dependencies
   * without triggering re-run loops.
   */
  const handleAuthError = useCallback(
    (message: string): boolean => {
      if (isAuthError(message)) {
        clearSession("admin");
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router]
  );

  const logout = useCallback(() => {
    clearSession("admin");
    router.push("/login");
  }, [router]);

  return { hasToken, handleAuthError, logout, router };
}
