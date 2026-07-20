"use client";

import { FormEvent, useState } from "react";
import type { Devotee } from "../lib/api";
import type { ProfileInput } from "../(devotee)/DevoteeDataProvider";
import { Button, Card, CardHeader, Field, Input } from "./ui";

type ProfileEditFormProps = {
  devotee: Devotee;
  onSave: (input: ProfileInput) => Promise<boolean>;
  onCancel: () => void;
};

const FIELDS: { name: keyof ProfileInput; label: string }[] = [
  { name: "village", label: "Village" },
  { name: "city", label: "City" },
  { name: "tehsil", label: "Tehsil" },
  { name: "district", label: "District" },
  { name: "state", label: "State" },
];

export function ProfileEditForm({ devotee, onSave, onCancel }: ProfileEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);

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
      <CardHeader title="Edit My Details" subtitle="Keep your address up to date" />
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <Field label="Email" required>
          <Input
            name="email"
            type="email"
            defaultValue={devotee.email}
            disabled={isSaving}
            required
          />
        </Field>

        {FIELDS.map((field) => (
          <Field key={field.name} label={field.label}>
            <Input
              name={field.name}
              defaultValue={devotee[field.name as keyof Devotee] as string | undefined | null ?? ""}
              placeholder={field.label}
              disabled={isSaving}
            />
          </Field>
        ))}

        {/* Mobile is the login credential, so only the ashram can change it. */}
        <p className="rounded-lg border border-line-soft bg-canvas px-3 py-2.5 text-xs text-muted">
          Your name and mobile number are your login details — please contact the ashram to
          change them.
        </p>

        <Button type="submit" variant="success" isLoading={isSaving} fullWidth>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </form>
    </Card>
  );
}
