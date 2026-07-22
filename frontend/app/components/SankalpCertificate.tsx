"use client";

import { Devotee, formatCount, formatDate } from "../lib/api";
import { trustName } from "./TrustShell";
import { Button, Icon } from "./ui";
import { useT } from "./LanguageProvider";

/**
 * Printable completion certificate for a finished sankalp.
 *
 * Rendered inline but hidden on screen — `print:` utilities flip it to visible
 * and hide the rest of the page, so `window.print()` produces just the
 * certificate with no extra chrome and no PDF library.
 */
export function SankalpCertificate({ devotee }: { devotee: Devotee }) {
  const t = useT();
  const sankalp = devotee.activeSankalp;

  // Only a completed sankalp earns a certificate.
  if (!sankalp?.isCompleted) return null;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        <Icon name="trophy" className="h-4 w-4" />
        {t("admin.printCertificate")}
      </Button>

      {/* Hidden on screen; the `@media print` block in globals.css hides the
          rest of the page and reveals only this. */}
      <div className="print-certificate">
        <div className="flex min-h-screen flex-col items-center justify-center border-[6px] border-double border-saffron-700 p-12 text-center text-ink">
          <p className="font-devanagari text-2xl font-semibold text-saffron-800">{trustName}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Jap Sankalp Seva
          </p>

          <div className="my-8 h-px w-32 bg-saffron-700" />

          <h1 className="font-devanagari text-3xl font-bold text-saffron-800">
            {t("certificate.heading")}
          </h1>

          <p className="mt-8 text-sm text-muted">{t("certificate.presentedTo")}</p>
          <p className="mt-2 text-4xl font-bold">{devotee.name}</p>

          <p className="mt-6 max-w-xl text-base leading-8">
            {t("certificate.body", { target: formatCount(sankalp.targetCount) })}
          </p>

          <div className="mt-10 grid grid-cols-3 gap-10 text-sm">
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted">
                {t("certificate.totalJap")}
              </p>
              <p className="mt-1 text-lg font-semibold">{formatCount(sankalp.completedCount)}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted">
                {t("certificate.period")}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatDate(sankalp.startDate)} – {formatDate(sankalp.endDate)}
              </p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-muted">
                {t("certificate.completedOn")}
              </p>
              <p className="mt-1 text-lg font-semibold">{formatDate(sankalp.endDate)}</p>
            </div>
          </div>

          <div className="mt-16 w-56 border-t border-ink pt-2 text-sm text-muted">
            {t("certificate.signature")}
          </div>
        </div>
      </div>
    </>
  );
}
