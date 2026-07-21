"use client";

import { FormEvent, useState } from "react";
import { useDevoteeData } from "../DevoteeDataProvider";
import { TapCounter } from "../../components/TapCounter";
import { formatCount, today } from "../../lib/api";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Icon,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from "../../components/ui";
import { useLanguage } from "../../components/LanguageProvider";

const QUOTES = {
  hi: [
    "“प्रेम से नाम जपो, मन को अपना घर मिल जाएगा।”",
    "“हर माला आपको प्रभु के एक कदम और पास ले जाती है।”",
    "“साधना की निरंतरता परिश्रम को कृपा में बदल देती है।”",
    "“आज जिस नाम को स्मरण करोगे, वही कल की शांति बनेगा।”",
    "“छोटी दैनिक भक्ति अटल हृदय का निर्माण करती है।”",
  ],
  en: [
    "“Chant the holy name with love, and the mind finds its home.”",
    "“Every bead is a step closer to the divine.”",
    "“Steadiness in sadhana turns effort into grace.”",
    "“The name you remember today shapes the peace you carry tomorrow.”",
    "“Small, daily devotion builds an unshakeable heart.”",
  ],
};

export default function JapPage() {
  const { devotee, isLoading, isSavingJap, todayCount, streak, saveJap } = useDevoteeData();
  const toast = useToast();
  const { t, language } = useLanguage();
  const [showManualEntry, setShowManualEntry] = useState(false);

  const quotes = QUOTES[language];
  const quote = quotes[new Date().getDate() % quotes.length];

  async function handleTapSave(count: number) {
    const saved = await saveJap({ count, notes: "Tap counter" });
    if (saved) {
      toast.success(t("jap.savedToast", { count: formatCount(count) }));
    }
    return saved;
  }

  async function handleManualSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const saved = await saveJap({
      count: Number(form.get("count")),
      entryDate: String(form.get("entryDate")),
      notes: String(form.get("notes") ?? ""),
    });

    if (saved) {
      formElement.reset();
      setShowManualEntry(false);
      toast.success(t("jap.savedSimple"));
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Today at a glance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("jap.today")}</p>
          <p className="mt-1 text-3xl font-bold text-saffron-700">{formatCount(todayCount)}</p>
          <p className="text-xs text-muted">
            {t(Math.floor(todayCount / 108) === 1 ? "jap.mala" : "jap.malas", {
              count: Math.floor(todayCount / 108),
            })}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("jap.streak")}</p>
          <p className="mt-1 flex items-baseline gap-1 text-3xl font-bold text-warning">
            {streak}
            <Icon name="flame" className="h-5 w-5" />
          </p>
          <p className="text-xs text-muted">{t(streak > 0 ? "jap.keepAlive" : "jap.logToStart")}</p>
        </div>
      </div>

      <TapCounter
        storageKey={`jap-tap-count:${devotee?.id ?? "anon"}`}
        isSaving={isSavingJap}
        onSave={handleTapSave}
      />

      {/* Manual entry stays collapsed so the counter is the primary action. */}
      {showManualEntry ? (
        <Card>
          <CardHeader title={t("jap.manualTitle")} subtitle={t("jap.manualSubtitle")} />
          <form onSubmit={handleManualSave} className="mt-5 grid gap-4">
            <Field label={t("jap.count")} required>
              <Input
                name="count"
                type="number"
                min="1"
                inputMode="numeric"
                placeholder={t("jap.countPlaceholder")}
                autoFocus
                disabled={isSavingJap}
                required
              />
            </Field>
            <Field label={t("jap.date")} required>
              <Input
                name="entryDate"
                type="date"
                defaultValue={today()}
                max={today()}
                disabled={isSavingJap}
                required
              />
            </Field>
            <Field label={t("jap.notes")} hint={t("jap.notesHint")}>
              <Textarea name="notes" placeholder={t("jap.notes")} disabled={isSavingJap} />
            </Field>
            <Button type="submit" variant="success" isLoading={isSavingJap} fullWidth>
              {isSavingJap ? t("jap.saving") : t("jap.save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowManualEntry(false)}
            >
              {t("jap.cancel")}
            </Button>
          </form>
        </Card>
      ) : (
        <Button variant="secondary" fullWidth onClick={() => setShowManualEntry(true)}>
          <Icon name="plus" className="h-4 w-4" />
          {t("jap.addManually")}
        </Button>
      )}

      <p className="font-display px-1 text-center text-base italic text-saffron-900">{quote}</p>
    </div>
  );
}
