/**
 * IWACU RWANDA — Service Worker (v3)
 * Network-first for all HTML/navigation requests so the app always displays
 * the latest up-to-date UI, with offline cache fallback.
 */

const CACHE_VERSION = "iwacu-v3-representative-points";
const SHELL_CACHE = `iwacu-shell-${CACHE_VERSION}`;
const BOUNDARIES_CACHE = `iwacu-boundaries-${CACHE_VERSION}`;
const LOCATION_INDEX_CACHE = "iwacu-location-index-v3-2026-10-30";
const LOCATION_INDEX_URL = "/api/locate?index=1";
const LOCATION_INDEX_ASSET_URL = "/offline/location-index.json";

// ---------------------------------------------------------------------------
// Install – Skip waiting immediately
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    // Pre-cache the compact national hierarchy. The 1.94 MB JSON with representative points is served
    // compressed by Vercel and avoids a first-use offline picker dead end.
    try {
      const cache = await caches.open(LOCATION_INDEX_CACHE);
      const assetUrl = new URL(LOCATION_INDEX_ASSET_URL, self.location.origin).toString();
      const response = await fetch(assetUrl, { cache: "reload" });
      if (response.ok) await cache.put(new Request(assetUrl), response.clone());
    } catch {
      // Installation can still succeed if the asset is temporarily unavailable.
    }
  })());
});

// ---------------------------------------------------------------------------
// Activate – Clean all old caches immediately
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, BOUNDARIES_CACHE, LOCATION_INDEX_CACHE, "iwacu-boundaries-v1"].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ---------------------------------------------------------------------------
// Fetch – Network-first for pages and API
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // 1. Navigation / HTML pages: MUST ALWAYS BE NETWORK-FIRST
  if (
    request.mode === "navigate" ||
    request.destination === "document" ||
    url.pathname === "/"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            "<!DOCTYPE html><html><body><h1>Offline</h1><p>Nta murongo wa interineti ufite.</p></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // Offline-first static hierarchy index, prefetched during service-worker install.
  if (url.pathname === LOCATION_INDEX_ASSET_URL) {
    event.respondWith((async () => {
      const cache = await caches.open(LOCATION_INDEX_CACHE);
      const cacheKey = new Request(new URL(LOCATION_INDEX_ASSET_URL, self.location.origin).toString());
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(cacheKey, response.clone());
        return response;
      } catch {
        return new Response(
          JSON.stringify({ status: "error", message: "National location index is not cached." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
    })());
    return;
  }

  // National location index: keep a refreshed API copy for older app shells.
  if (url.pathname === "/api/locate" && url.searchParams.get("index") === "1") {
    const cachePromise = caches.open(LOCATION_INDEX_CACHE);
    const cacheKey = new Request(new URL(LOCATION_INDEX_URL, self.location.origin).toString());
    const refresh = cachePromise.then((cache) =>
      fetch(request).then(async (response) => {
        if (response.ok) await cache.put(cacheKey, response.clone());
        return response;
      })
    );
    event.waitUntil(refresh.then(() => undefined).catch(() => undefined));
    event.respondWith(cachePromise.then(async (cache) => {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      try {
        return await refresh;
      } catch {
        return new Response(
          JSON.stringify({ status: "error", message: "No cached location index." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
    }));
    return;
  }

  // 2. Other API routes: network-only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({
              status: "error",
              code: "NETWORK_ERROR",
              message_kiny: "Uri offline. Serivisi ntabwo ihari. Gerageza nyuma.",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          )
      )
    );
    return;
  }

  // 3. Static assets: Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response("", { status: 404 });
      })
  );
});


// ---------------------------------------------------------------------------
// Persistent notification interaction – open IWACU when a notification is tapped.
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const requestedUrl = event.notification.data && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/amenyesha";
    const targetUrl = requestedUrl.startsWith("/") && !requestedUrl.startsWith("//")
      ? new URL(requestedUrl, self.location.origin).toString()
      : new URL("/amenyesha", self.location.origin).toString();
    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(targetUrl);
      if ("focus" in client) return client.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});

// ---------------------------------------------------------------------------
// Web Push: wake the Service Worker and show an OS-level notification.
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  const fallback = {
    title: "IWACU RWANDA",
    body: "Hari impinduka nshya ku makuru y'aho uri.",
    tag: "iwacu-push",
    url: "/",
  };

  let payload = fallback;
  try {
    const incoming = event.data ? event.data.json() : {};
    payload = {
      title: typeof incoming.title === "string" ? incoming.title.slice(0, 120) : fallback.title,
      body: typeof incoming.body === "string" ? incoming.body.slice(0, 600) : fallback.body,
      tag: typeof incoming.tag === "string" ? incoming.tag.slice(0, 100) : fallback.tag,
      url: typeof incoming.url === "string" && incoming.url.startsWith("/") && !incoming.url.startsWith("//")
        ? incoming.url
        : fallback.url,
    };
  } catch {
    // Show safe fallback content instead of silently discarding malformed push data.
  }

  event.waitUntil((async () => {
    if (self.Notification && self.Notification.permission === "granted") {
      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.tag,
        data: { url: payload.url },
        timestamp: Date.now(),
      });
    }
  })());
});
