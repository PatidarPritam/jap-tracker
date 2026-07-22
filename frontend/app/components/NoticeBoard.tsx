"use client";

import { useEffect, useState } from "react";
import { Announcement, apiRequest, formatDate } from "../lib/api";
import { Badge, Card, CardHeader, Icon } from "./ui";
import { useT } from "./LanguageProvider";

/**
 * Live ashram notices on the devotee's dashboard. Renders nothing at all when
 * there are none — an empty "no notices" card would be noise on a screen the
 * devotee opens every day.
 */
export function NoticeBoard() {
  const t = useT();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // A failed fetch is deliberately silent: notices are secondary content and
    // must never push an error toast over the devotee's jap screen.
    void apiRequest<Announcement[]>("/api/announcements", undefined, "devotee")
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, []);

  if (!announcements.length) return null;

  return (
    <Card>
      <CardHeader title={t("devotee.announcements")} />
      <div className="mt-4 grid gap-3">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="rounded-lg border border-line-soft p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 font-semibold">{announcement.title}</p>
              {announcement.isPinned && <Badge tone="gold">★</Badge>}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted">
              {announcement.body}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Icon name="calendar" className="h-3.5 w-3.5" />
              {formatDate(announcement.publishedAt)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
