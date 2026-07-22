"use client";

import { TrustShell, trustName } from "../components/TrustShell";
import { Card, Icon } from "../components/ui";
import { useT } from "../components/LanguageProvider";
import { SITE } from "../lib/site";

/**
 * Public "About Us" page. The ashram owns the app (the footer credit reflects
 * that), so the developer attribution lives here instead — a soft "who built
 * this" note with contact details, for anyone who wants something similar.
 */
export default function AboutPage() {
  const t = useT();

  return (
    <TrustShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron-700">
            {t("about.title")}
          </p>
          <h1 className="font-devanagari mt-2 text-3xl font-semibold text-saffron-800 sm:text-4xl">
            {trustName}
          </h1>
        </header>

        <Card>
          <h2 className="text-lg font-semibold text-saffron-800">{t("about.ashramTitle")}</h2>
          <p className="mt-2 leading-7 text-ink-soft">{t("about.intro")}</p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-saffron-800">{t("about.missionTitle")}</h2>
          <p className="mt-2 leading-7 text-ink-soft">{t("about.mission")}</p>
        </Card>

        {/* Soft developer attribution — the whole point of this page. */}
        <Card className="border-saffron-200 bg-saffron-50/40">
          <h2 className="text-lg font-semibold text-saffron-800">{t("about.devTitle")}</h2>
          <p className="mt-2 leading-7 text-ink-soft">
            {t("about.devNote", { name: SITE.builtBy })}
          </p>

          <div className="mt-4 border-t border-line-soft pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("about.contactTitle")}
            </p>
            <div className="mt-3 grid gap-2 text-sm">
              <p className="flex items-center gap-2 text-ink-soft">
                <Icon name="user" className="h-4 w-4 text-saffron-700" />
                <span className="font-semibold">{SITE.builtBy}</span>
              </p>
              <a
                href={`tel:${SITE.contactPhone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-ink-soft hover:text-saffron-800"
              >
                <Icon name="phone" className="h-4 w-4 text-saffron-700" />
                {SITE.contactPhone}
              </a>
              <a
                href={`mailto:${SITE.contactEmail}`}
                className="flex items-center gap-2 text-ink-soft hover:text-saffron-800"
              >
                <Icon name="mail" className="h-4 w-4 text-saffron-700" />
                {SITE.contactEmail}
              </a>
            </div>
          </div>
        </Card>

        <p className="font-devanagari text-center text-xs text-muted">
          © {SITE.year} {trustName} · {t("about.rights")}
        </p>
      </div>
    </TrustShell>
  );
}
