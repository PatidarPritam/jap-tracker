"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Announcement, apiRequest, formatDate, today } from "../../lib/api";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from "../../components/ui";
import { useT } from "../../components/LanguageProvider";

/** A notice is live once published and not yet expired. */
function noticeState(announcement: Announcement, now: number) {
  if (new Date(announcement.publishedAt).getTime() > now) return "scheduled" as const;
  if (announcement.expiresAt && new Date(announcement.expiresAt).getTime() <= now) {
    return "expired" as const;
  }
  return "live" as const;
}

/**
 * The ashram notice board. Admins post here; devotees see live notices on
 * their dashboard. Scheduled and expired notices stay visible to the admin so
 * the board can be managed ahead of time.
 */
export default function AdminAnnouncementsPage() {
  const { hasToken, handleAuthError } = useAdminGuard();
  const t = useT();
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  // Captured when the list loads rather than read during render, so the
  // scheduled/expired badges stay a pure function of state.
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // `all=true` returns scheduled and expired notices too.
      const data = await apiRequest<Announcement[]>(
        "/api/announcements?all=true",
        undefined,
        "admin"
      );
      setAnnouncements(data);
      setLoadedAt(Date.now());
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

  async function postAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      setIsPosting(true);
      await apiRequest(
        "/api/announcements",
        {
          method: "POST",
          body: JSON.stringify({
            title: String(form.get("title") ?? "").trim(),
            body: String(form.get("body") ?? "").trim(),
            isPinned: form.get("isPinned") === "on",
            publishedAt: String(form.get("publishedAt") ?? "") || undefined,
            expiresAt: String(form.get("expiresAt") ?? "") || null,
          }),
        },
        "admin"
      );
      formElement.reset();
      toast.success(t("admin.announcementPosted"));
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.updateFailed");
      if (!handleAuthError(message)) toast.error(message);
    } finally {
      setIsPosting(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!window.confirm(t("admin.deleteAnnouncementConfirm"))) return;

    try {
      await apiRequest(`/api/announcements/${id}`, { method: "DELETE" }, "admin");
      toast.success(t("admin.announcementDeleted"));
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
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{t("admin.announcements")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t("admin.announcementsSub")}</p>
      </header>

      <section className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.2fr]">
        <Card className="lg:sticky lg:top-24">
          <CardHeader title={t("admin.newAnnouncement")} />
          <form onSubmit={postAnnouncement} className="mt-5 grid gap-4">
            <Field label={t("admin.announcementTitle")} required>
              <Input name="title" disabled={isPosting} required />
            </Field>
            <Field label={t("admin.announcementBody")} required>
              <Textarea name="body" rows={5} disabled={isPosting} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("admin.publishOn")}>
                <Input name="publishedAt" type="date" defaultValue={today()} disabled={isPosting} />
              </Field>
              <Field label={t("admin.expiresOn")}>
                <Input name="expiresAt" type="date" disabled={isPosting} />
              </Field>
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                name="isPinned"
                disabled={isPosting}
                className="h-4 w-4 rounded border-line accent-saffron-700"
              />
              {t("admin.pinned")}
            </label>
            <Button type="submit" isLoading={isPosting} fullWidth>
              {isPosting ? t("admin.publishing") : t("admin.publish")}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title={t("admin.announcements")} />
          <div className="mt-5 grid gap-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24" />)
            ) : announcements.length ? (
              announcements.map((announcement) => {
                const state = noticeState(announcement, loadedAt);
                return (
                  <div
                    key={announcement.id}
                    className="rounded-lg border border-line-soft p-4 transition hover:border-saffron-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 font-semibold">{announcement.title}</p>
                      <div className="flex flex-none gap-1.5">
                        {announcement.isPinned && <Badge tone="gold">{t("admin.pinned")}</Badge>}
                        {state === "scheduled" && (
                          <Badge tone="neutral">{t("admin.scheduled")}</Badge>
                        )}
                        {state === "expired" && <Badge tone="neutral">{t("admin.expired")}</Badge>}
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {announcement.body}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs text-muted">
                        <Icon name="calendar" className="h-4 w-4" />
                        {formatDate(announcement.publishedAt)}
                        {announcement.expiresAt && ` – ${formatDate(announcement.expiresAt)}`}
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void deleteAnnouncement(announcement.id)}
                      >
                        {t("admin.delete")}
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={<Icon name="sparkles" className="h-6 w-6" />}
                title={t("admin.noAnnouncements")}
                description={t("admin.noAnnouncementsText")}
              />
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
