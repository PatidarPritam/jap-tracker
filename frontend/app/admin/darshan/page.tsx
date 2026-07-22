"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, Darshan, formatDate } from "../../lib/api";
import { fileToDownscaledDataUrl } from "../../lib/image";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
  Skeleton,
  useToast,
} from "../../components/ui";
import { useT } from "../../components/LanguageProvider";

/**
 * Daily darshan management: upload one photo, see the recent ones, prune old.
 * The image is downscaled in the browser before upload, so a phone-camera
 * photo doesn't arrive as several megabytes.
 */
export default function AdminDarshanPage() {
  const { hasToken, handleAuthError } = useAdminGuard();
  const t = useT();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<Darshan[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Darshan[]>("/api/darshan?all=true", undefined, "admin");
      setRecent(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.loadFailed");
      if (!handleAuthError(message)) toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthError, toast, t]);

  useEffect(() => {
    if (!hasToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [hasToken, load]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPreview(await fileToDownscaledDataUrl(file));
    } catch {
      toast.error(t("admin.imageTooLarge"));
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) {
      toast.error(t("admin.selectImageFirst"));
      return;
    }
    const form = new FormData(event.currentTarget);

    try {
      setIsUploading(true);
      await apiRequest(
        "/api/darshan",
        {
          method: "POST",
          body: JSON.stringify({
            imageData: preview,
            caption: String(form.get("caption") ?? "").trim() || null,
          }),
        },
        "admin"
      );
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      (event.target as HTMLFormElement).reset();
      toast.success(t("admin.darshanPosted"));
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.updateFailed");
      if (!handleAuthError(message)) toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("admin.deleteDarshanConfirm"))) return;
    try {
      await apiRequest(`/api/darshan/${id}`, { method: "DELETE" }, "admin");
      toast.success(t("admin.darshanDeleted"));
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.updateFailed");
      if (!handleAuthError(message)) toast.error(message);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-line pb-7">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
        >
          {t("admin.back")}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{t("admin.darshanTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t("admin.darshanSub")}</p>
      </header>

      <section className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.2fr]">
        <Card className="lg:sticky lg:top-24">
          <CardHeader title={t("admin.darshanTitle")} />
          <form onSubmit={upload} className="mt-5 grid gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => void handleFile(event)}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Icon name="plus" className="h-4 w-4" />
              {t("admin.chooseImage")}
            </Button>

            {preview && (
              // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
              <img
                src={preview}
                alt="preview"
                className="max-h-72 w-full rounded-lg border border-line object-cover"
              />
            )}

            <Field label={t("admin.darshanCaption")}>
              <Input name="caption" maxLength={280} disabled={isUploading} />
            </Field>

            <Button type="submit" isLoading={isUploading} disabled={isUploading || !preview} fullWidth>
              {isUploading ? t("admin.uploading") : t("admin.uploadDarshan")}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title={t("admin.recentDarshan")} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-48" />)
            ) : recent.length ? (
              recent.map((darshan) => (
                <div key={darshan.id} className="overflow-hidden rounded-lg border border-line-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL */}
                  <img
                    src={darshan.imageData}
                    alt={darshan.caption ?? "darshan"}
                    className="h-40 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="min-w-0 text-sm text-muted">
                      {darshan.caption || formatDate(darshan.createdAt)}
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => void remove(darshan.id)}>
                      {t("admin.delete")}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="sm:col-span-2">
                <EmptyState
                  icon={<Icon name="sparkles" className="h-6 w-6" />}
                  title={t("admin.noDarshan")}
                  description={t("admin.noDarshanText")}
                />
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
