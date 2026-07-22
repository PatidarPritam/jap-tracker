"use client";

import { useEffect, useState } from "react";
import { apiRequest, Darshan } from "../lib/api";
import { Card } from "./ui";
import { useT } from "./LanguageProvider";

/**
 * The day's darshan photo at the top of the devotee dashboard. Renders nothing
 * until an image loads — an empty frame would be dead space on the screen a
 * devotee opens every morning.
 */
export function DarshanCard() {
  const t = useT();
  const [darshan, setDarshan] = useState<Darshan | null>(null);

  useEffect(() => {
    // Silent on failure: darshan is a grace note, never an error to surface.
    void apiRequest<Darshan | null>("/api/darshan", undefined, "devotee")
      .then(setDarshan)
      .catch(() => setDarshan(null));
  }, []);

  if (!darshan) return null;

  return (
    <Card className="overflow-hidden p-0">
      <p className="px-4 pt-4 text-sm font-semibold uppercase tracking-wide text-saffron-700">
        {t("devotee.darshanTitle")}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a hostable asset */}
      <img
        src={darshan.imageData}
        alt={darshan.caption ?? t("devotee.darshanTitle")}
        className="mt-3 max-h-96 w-full object-cover"
      />
      {darshan.caption && (
        <p className="px-4 py-3 text-sm text-muted">{darshan.caption}</p>
      )}
    </Card>
  );
}
