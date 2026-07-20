// Jap Tracker service worker — app-shell offline support.
// Bump CACHE_VERSION whenever the caching strategy changes so old caches clear.
// v2: the devotee app moved to /jap, /progress, /sankalp, /me — anything
// cached against the old /devotee/[id] routes must be dropped on activate.
const CACHE_VERSION = "jap-tracker-v3";
const OFFLINE_URL = "/offline";

// Precache the offline fallback and core icons so the app opens without network.
const PRECACHE_URLS = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET; never touch POST/PUT (jap saves must always hit the network).
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only. Skip API calls and auth — those need fresh, authorised data.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  // Page navigations: network-first, fall back to cache, then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets (icons, images, JS/CSS chunks): cache-first for instant loads.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});

// --- Daily jap reminder ---------------------------------------------------

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Malformed payload — still show a generic nudge rather than nothing.
  }

  const title = payload.title || "आज का जप 🙏";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "Today's jap is still pending.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Replaces yesterday's reminder instead of stacking a pile of them.
      tag: "daily-jap-reminder",
      data: { url: payload.url || "/jap" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/jap";

  // Focus an already-open tab if there is one; only then open a new window.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      const existing = clients[0];
      if (existing && "navigate" in existing) {
        return existing.navigate(target).then((c) => c && c.focus());
      }
      return self.clients.openWindow(target);
    })
  );
});
