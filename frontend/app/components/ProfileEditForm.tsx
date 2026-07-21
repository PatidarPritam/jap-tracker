"use client";

import { FormEvent, useState } from "react";
import type { Devotee } from "../lib/api";
import type { ProfileInput } from "../(devotee)/DevoteeDataProvider";
import { Button, Card, CardHeader, Field, Input } from "./ui";
import { useT } from "./LanguageProvider";
import type { TranslationKey } from "../lib/i18n";

type ProfileEditFormProps = {
  devotee: Devotee;
  onSave: (input: ProfileInput) => Promise<boolean>;
  onCancel: () => void;
};

const FIELDS: { name: keyof ProfileInput; labelKey: TranslationKey }[] = [
  { name: "village", labelKey: "profile.village" },
  { name: "city", labelKey: "profile.city" },
  { name: "tehsil", labelKey: "profile.tehsil" },
  { name: "district", labelKey: "profile.district" },
  { name: "state", labelKey: "profile.state" },
];

export function ProfileEditForm({ devotee, onSave, onCancel }: ProfileEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const t = useT();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const input = {
      email: String(form.get("email") ?? "").trim(),
    } as ProfileInput;
    for (const field of FIELDS) {
      input[field.name] = String(form.get(field.name) ?? "").trim();
    }

    try {
      setIsSaving(true);
      if (await onSave(input)) onCancel();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <Field label={t("me.email")} required>
          <Input
            name="email"
            type="email"
            defaultValue={devotee.email}
            disabled={isSaving}
            required
          />
        </Field>

        {FIELDS.map((field) => (
          <Field key={field.name} label={t(field.labelKey)}>
            <Input
              name={field.name}
              defaultValue={devotee[field.name as keyof Devotee] as string | undefined | null ?? ""}
              placeholder={t(field.labelKey)}
              disabled={isSaving}
            />
          </Field>
        ))}

        {/* Mobile is the login credential, so only the ashram can change it. */}
        <p className="rounded-lg border border-line-soft bg-canvas px-3 py-2.5 text-xs text-muted">
          {t("profile.lockedNote")}
        </p>

        <Button type="submit" variant="success" isLoading={isSaving} fullWidth>
          {isSaving ? t("profile.saving") : t("profile.save")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          {t("profile.cancel")}
        </Button>
      </form>
    </Card>
  );
}
