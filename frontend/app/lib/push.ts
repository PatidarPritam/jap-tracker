import { apiRequest } from "./api";

/** Web Push needs the VAPID key as bytes, not the base64url string. */
function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export type ReminderState = {
  supported: boolean;
  /** The server has VAPID keys configured. */
  available: boolean;
  enabled: boolean;
  /** Permission was denied, so the app cannot ask again. */
  blocked: boolean;
};

export async function reminderState(): Promise<ReminderState> {
  const supported = isPushSupported();
  if (!supported) {
    return { supported: false, available: false, enabled: false, blocked: false };
  }

  const { enabled: available } = await apiRequest<{ publicKey: string; enabled: boolean }>(
    "/api/push/public-key"
  );
  const subscription = await currentSubscription();

  return {
    supported: true,
    available,
    enabled: Boolean(subscription),
    blocked: Notification.permission === "denied",
  };
}

/**
 * Ask for permission, subscribe this device, and register it with the server.
 * Returns false when the devotee declines — not an error, just a no.
 */
export async function enableReminders(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const { publicKey, enabled } = await apiRequest<{ publicKey: string; enabled: boolean }>(
    "/api/push/public-key"
  );
  if (!enabled || !publicKey) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(publicKey),
    }));

  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await apiRequest(
    "/api/push/subscribe",
    { method: "POST", body: JSON.stringify({ endpoint, keys }) },
    "devotee"
  );

  return true;
}

export async function disableReminders(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;

  await apiRequest(
    "/api/push/unsubscribe",
    { method: "POST", body: JSON.stringify({ endpoint: subscription.endpoint }) },
    "devotee"
  );
  await subscription.unsubscribe();
}
