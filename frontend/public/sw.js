// Jap Tracker service worker — app-shell offline support.
// Bump CACHE_VERSION whenever the caching strategy changes so old caches clear.
const CACHE_VERSION = "jap-tracker-v1";
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
