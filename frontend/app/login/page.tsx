"use client";

import Link from "next/link";
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
    <main className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-2">
      {/* Darshan panel — a full-height image on desktop, a top hero on mobile.
          The slow Ken Burns zoom gives it life; the saffron gradient underneath
          is a graceful fallback if /deities.jpg is ever missing. */}
      <aside className="relative h-80 overflow-hidden bg-gradient-to-br from-saffron-500 to-saffron-700 sm:h-96 lg:h-auto lg:min-h-screen">
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset in /public, cropped via object-position */}
        <img
          src="/deities.jpg"
          alt={trustName}
          // Portrait photo; pin the frame near the top so the crowns/faces show
          // and the offerings at the very bottom stay cropped out.
          className="animate-ken-burns absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 30%" }}
        />
        {/* Dark gradient anchors the white title and keeps it readable over a
            busy image, while the deities' faces (top) stay clear. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />

        {/* On desktop the brand moves beside the form (see below) and the image
            stays clean; this overlay is only for the mobile top hero. */}
        <div className="absolute inset-x-0 bottom-0 p-6 text-center lg:hidden">
          <span aria-hidden className="text-2xl text-white/95 drop-shadow">
            ॐ
          </span>
          <h1 className="font-devanagari mt-1 text-2xl font-semibold leading-snug text-white drop-shadow-md">
            {trustName}
          </h1>
          <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/85">
            {t("login.subtitle")}
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-5 lg:py-8">
        <div className="w-full max-w-sm">
          {/* Brand lives here on desktop, where the image carries no text. */}
          <div className="mb-7 hidden text-center lg:block">
            <span aria-hidden className="text-3xl text-saffron-700">
              ॐ
            </span>
            <h1 className="font-devanagari mt-2 text-2xl font-semibold leading-snug text-saffron-800">
              {trustName}
            </h1>
            <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted">
              {t("login.subtitle")}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface/80 p-6 shadow-card backdrop-blur-sm sm:p-7">
            <LanguageToggle className="mx-auto" />

        <form
          onSubmit={login}
          // Remount on mode change so the browser does not keep a mobile
          // number sitting in a field now labelled "Email".
          key={isAdminMode ? "admin" : "devotee"}
          className="mt-5 grid gap-4"
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

          <Link
            href="/about"
            className="mt-4 block text-center text-xs font-semibold text-saffron-700 hover:text-saffron-800"
          >
            {t("footer.aboutLink")}
          </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
