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
const MAP_CACHE = "iwacu-map-basemap-v1";
const MAP_ASSET_URL = "/maps/rwanda.pmtiles";

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
          .filter((k) => ![SHELL_CACHE, BOUNDARIES_CACHE, LOCATION_INDEX_CACHE, "iwacu-boundaries-v1", MAP_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function respondWithMapAsset(request) {
  const cache = await caches.open(MAP_CACHE);
  const cacheKey = new Request(new URL(MAP_ASSET_URL, self.location.origin).toString());
  const cached = await cache.match(cacheKey);
  const range = request.headers.get("range");

  if (cached && range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": "bytes */" + (await cached.blob()).size, "Accept-Ranges": "bytes" },
      });
    }
    const blob = await cached.blob();
    const size = blob.size;
    let start = match[1] ? Number(match[1]) : null;
    let end = match[2] ? Number(match[2]) : null;
    if (start === null && end !== null) {
      const suffixLength = end;
      start = Math.max(0, size - suffixLength);
      end = size - 1;
    } else {
      start = start ?? 0;
      end = end === null ? size - 1 : Math.min(end, size - 1);
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": "bytes */" + size, "Accept-Ranges": "bytes" },
      });
    }
    const headers = new Headers(cached.headers);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Range", "bytes " + start + "-" + end + "/" + size);
    headers.set("Content-Length", String(end - start + 1));
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/vnd.pmtiles");
    return new Response(blob.slice(start, end + 1), {
      status: 206,
      statusText: "Partial Content",
      headers,
    });
  }

  if (cached && !range) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200 && !range) {
      await cache.put(cacheKey, response.clone());
    }
    return response;
  } catch {
    return new Response("Ikarita ntiboneka offline. Banza uyibike kuri telefone.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

// ---------------------------------------------------------------------------
// Fetch – Network-first for pages and API
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // The 45 MB PMTiles base map is cached only after a full download. Cached full files
  // are sliced into HTTP 206 responses so MapLibre/PMTiles can read byte ranges offline.
  if (url.pathname === MAP_ASSET_URL) {
    event.respondWith(respondWithMapAsset(request));
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
