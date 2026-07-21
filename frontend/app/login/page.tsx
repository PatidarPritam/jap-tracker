"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { getToken, setAdminSession, setDevoteeSession } from "../lib/auth";
import { trustName } from "../components/TrustShell";
import { Button, Field, Icon, Input, Spinner, useToast } from "../components/ui";
import { useT } from "../components/LanguageProvider";
import { LanguageToggle } from "../components/LanguageToggle";

type LoginResponse = {
  token: string;
  user: { id: string; email: string; name: string; role: "ADMIN" | "DEVOTEE" };
};

/**
 * Single sign-in screen for both roles. The backend resolves the role from the
 * identifier, so the devotee never has to pick "am I an admin or a devotee".
 */
export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  // Devotee is the default because they are almost all of the traffic; the
  // admin toggle only relabels the same two fields and the same endpoint.
  const [isAdminMode, setIsAdminMode] = useState(false);

  // An existing session goes straight to the app — the point of the long
  // devotee token is that the installed app rarely shows this screen at all.
  useEffect(() => {
    if (getToken("devotee")) {
      router.replace("/jap");
      return;
    }
    if (getToken("admin")) {
      router.replace("/admin");
      return;
    }
    // localStorage is client-only, so the session check must run in an effect
    // (reading it during render would cause a hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCheckingSession(false);
  }, [router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setIsSubmitting(true);
      const data = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: String(form.get("identifier") ?? "").trim(),
          secret: String(form.get("secret") ?? "").trim(),
        }),
      });

      if (data.user.role === "ADMIN") {
        setAdminSession(data.token);
        router.replace("/admin");
      } else {
        setDevoteeSession(data.token, data.user.id);
        router.replace("/jap");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("login.failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Avoids a flash of the login form for the (common) case where a stored
  // session immediately forwards the devotee into the app.
  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-ink">
      <div className="h-1 bg-gradient-to-r from-saffron-600 via-gold-500 to-saffron-600" />

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
        <div className="text-center">
          <span
            aria-hidden
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-saffron-700 text-2xl text-white shadow-float"
          >
            ॐ
          </span>
          <h1 className="font-devanagari mt-4 text-xl font-semibold leading-snug text-saffron-800">
            {trustName}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {t("login.subtitle")}
          </p>
        </div>

        <LanguageToggle className="mx-auto mt-6" />

        <form
          onSubmit={login}
          // Remount on mode change so the browser does not keep a mobile
          // number sitting in a field now labelled "Email".
          key={isAdminMode ? "admin" : "devotee"}
          className="mt-8 grid gap-4"
        >
          <Field label={t(isAdminMode ? "login.email" : "login.mobile")} required>
            <Input
              name="identifier"
              type={isAdminMode ? "email" : "text"}
              inputMode={isAdminMode ? "email" : "tel"}
              placeholder={t(isAdminMode ? "login.emailPlaceholder" : "login.mobilePlaceholder")}
              autoComplete="username"
              autoFocus
              required
            />
          </Field>
          <Field label={t(isAdminMode ? "login.password" : "login.pin")} required>
            <Input
              name="secret"
              type="password"
              inputMode={isAdminMode ? "text" : "numeric"}
              placeholder={t(isAdminMode ? "login.passwordPlaceholder" : "login.pinPlaceholder")}
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" variant="success" isLoading={isSubmitting} fullWidth>
            {isSubmitting ? t("login.checking") : t("login.submit")}
          </Button>
        </form>

        {!isAdminMode && (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
            <Icon name="phone" className="h-4 w-4" />
            {t("login.forgotPin")}
          </p>
        )}

        <button
          type="button"
          onClick={() => setIsAdminMode((current) => !current)}
          className="mt-8 flex items-center justify-center gap-1.5 text-xs font-semibold text-subtle transition hover:text-saffron-700"
        >
          <Icon name={isAdminMode ? "user" : "lock"} className="h-3.5 w-3.5" />
          {t(isAdminMode ? "login.backToDevotee" : "login.adminLogin")}
        </button>
      </div>
    </main>
  );
}
