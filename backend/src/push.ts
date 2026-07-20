import webpush from "web-push";
import { query } from "./db";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@japtracker.local";

/**
 * Push is optional: without VAPID keys the app runs exactly as before, the
 * reminder toggle simply reports that reminders are unavailable.
 */
export const isPushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isPushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn("[push] VAPID keys not set; daily jap reminders are disabled.");
}

export function pushPublicKey() {
  return VAPID_PUBLIC_KEY;
}

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Send one notification. A 404/410 means the browser dropped the
 * subscription (app uninstalled, permission revoked) — delete it so the
 * table does not fill with endpoints that can never receive again.
 */
async function sendToSubscription(row: SubscriptionRow, payload: string): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      payload
    );
    return true;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await query(`DELETE FROM "PushSubscription" WHERE id = $1`, [row.id]);
    }
    return false;
  }
}

/**
 * Remind devotees who have not recorded any jap today. Devotees who already
 * chanted are deliberately skipped — a reminder after the fact is noise, and
 * noise is what makes people turn notifications off.
 */
export async function sendDailyJapReminders(): Promise<{ sent: number; skipped: number }> {
  if (!isPushConfigured) return { sent: 0, skipped: 0 };

  const due = await query<SubscriptionRow & { name: string }>(
    `
      SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, u.name
      FROM "PushSubscription" ps
      JOIN "User" u ON u.id = ps."devoteeId"
      WHERE NOT EXISTS (
        SELECT 1 FROM "JapEntry" je
        WHERE je."devoteeId" = ps."devoteeId"
          AND je."entryDate" >= CURRENT_DATE
      )
    `
  );

  let sent = 0;
  for (const row of due.rows) {
    const payload = JSON.stringify({
      title: "आज का जप 🙏",
      body: `${row.name}, today's jap is still pending. A few malas now?`,
      url: "/jap",
    });
    if (await sendToSubscription(row, payload)) sent += 1;
  }

  return { sent, skipped: due.rows.length - sent };
}
