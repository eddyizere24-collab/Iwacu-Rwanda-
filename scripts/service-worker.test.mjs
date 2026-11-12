import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const ORIGIN = "https://iwacu.test";
const SW_SOURCE = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function absoluteUrl(input) {
  const raw = typeof input === "string" ? input : input.url;
  return new URL(raw, ORIGIN).toString();
}

function createWorker() {
  const listeners = new Map();
  const stores = new Map();
  let networkFetch = async () => {
    throw new Error("network_unavailable");
  };

  class MemoryCache {
    constructor() {
      this.entries = new Map();
    }
    async put(request, response) {
      this.entries.set(absoluteUrl(request), response.clone());
    }
    async match(request) {
      const found = this.entries.get(absoluteUrl(request));
      return found ? found.clone() : undefined;
    }
  }

  const cacheStorage = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name);
    },
    async keys() {
      return Array.from(stores.keys());
    },
    async delete(name) {
      return stores.delete(name);
    },
    async match(request) {
      for (const cache of stores.values()) {
        const response = await cache.match(request);
        if (response) return response;
      }
      return undefined;
    },
  };

  const self = {
    location: { origin: ORIGIN },
    clients: { claim: async () => undefined },
    skipWaiting: () => undefined,
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
  };

  const context = {
    self,
    caches: cacheStorage,
    fetch: (...args) => networkFetch(...args),
    Request,
    Response,
    Headers,
    URL,
    Promise,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(SW_SOURCE, context, { filename: "public/sw.js" });

  async function dispatch(type, properties = {}) {
    const pending = [];
    let responsePromise;
    const event = {
      ...properties,
      waitUntil(promise) {
        pending.push(Promise.resolve(promise));
      },
      respondWith(promise) {
        responsePromise = Promise.resolve(promise);
      },
    };
    const handler = listeners.get(type);
    assert.ok(handler, `No ${type} handler registered`);
    handler(event);
    const response = responsePromise ? await responsePromise : undefined;
    await Promise.all(pending);
    return response;
  }

  return {
    caches: cacheStorage,
    dispatch,
    setFetch(fn) {
      networkFetch = fn;
    },
  };
}

function request(url, options = {}) {
  return {
    method: options.method ?? "GET",
    url: new URL(url, ORIGIN).toString(),
    mode: options.mode ?? "cors",
    destination: options.destination ?? "",
    headers: new Headers(options.headers ?? {}),
  };
}

async function installWithAssets(worker) {
  worker.setFetch(async (input) => {
    const url = absoluteUrl(input);
    if (url.endsWith("/offline.html")) {
      return new Response("<!doctype html><h1>Offline fallback</h1>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.endsWith("/offline/location-index.json")) {
      return new Response('{"status":"ok","locations":[]}', {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  });
  await worker.dispatch("install");
}

test("installation saves the small offline page and the location index", async () => {
  const worker = createWorker();
  await installWithAssets(worker);

  const shell = await worker.caches.open("iwacu-shell-iwacu-v3-representative-points");
  const offlinePage = await shell.match(`${ORIGIN}/offline.html`);
  assert.ok(offlinePage, "offline fallback page should be cached at install");
  assert.match(await offlinePage.text(), /Offline fallback/);

  const index = await worker.caches.open("iwacu-location-index-v3-2026-10-30");
  const savedIndex = await index.match(`${ORIGIN}/offline/location-index.json`);
  assert.ok(savedIndex, "the compact location index should be cached at install");
  assert.equal((await savedIndex.json()).status, "ok");
});

test("a successful public navigation is cached and remains available when offline", async () => {
  const worker = createWorker();
  await installWithAssets(worker);
  const homeRequest = request("/", { mode: "navigate", destination: "document" });

  worker.setFetch(async () => new Response("<html><main>IWACU home</main></html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  }));
  const online = await worker.dispatch("fetch", { request: homeRequest });
  assert.match(await online.text(), /IWACU home/);

  worker.setFetch(async () => {
    throw new Error("offline");
  });
  const offline = await worker.dispatch("fetch", { request: homeRequest });
  assert.match(await offline.text(), /IWACU home/);
});

test("a first-time offline navigation uses the pre-cached trilingual fallback", async () => {
  const worker = createWorker();
  await installWithAssets(worker);
  worker.setFetch(async () => {
    throw new Error("offline");
  });

  const response = await worker.dispatch("fetch", {
    request: request("/ubufasha-buri-wese", { mode: "navigate", destination: "document" }),
  });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Offline fallback/);
});

test("the saved location index is returned offline while live APIs remain network-only", async () => {
  const worker = createWorker();
  await installWithAssets(worker);
  const indexRequest = request("/api/locate?index=1");

  worker.setFetch(async () => new Response('{"status":"fresh","locations":[1]}', {
    status: 200,
    headers: { "content-type": "application/json" },
  }));
  await worker.dispatch("fetch", { request: indexRequest });

  worker.setFetch(async () => {
    throw new Error("offline");
  });
  const saved = await worker.dispatch("fetch", { request: indexRequest });
  assert.equal((await saved.json()).status, "fresh");

  const live = await worker.dispatch("fetch", {
    request: request("/api/assistant", { method: "GET" }),
  });
  assert.equal(live.status, 503);
  assert.equal((await live.json()).code, "NETWORK_ERROR");
});

test("only public pages and static assets are cached; no-store/admin/private routes are not", async () => {
  const worker = createWorker();
  await installWithAssets(worker);

  const noStoreRequest = request("/contact", { mode: "navigate", destination: "document" });
  worker.setFetch(async () => new Response("<html>contact</html>", {
    status: 200,
    headers: { "cache-control": "private, no-store" },
  }));
  await worker.dispatch("fetch", { request: noStoreRequest });

  const adminRequest = request("/admin/dashboard", { mode: "navigate", destination: "document" });
  worker.setFetch(async () => new Response("<html>admin</html>", { status: 200 }));
  await worker.dispatch("fetch", { request: adminRequest });

  const privatePageRequest = request("/my-account", { mode: "navigate", destination: "document" });
  await worker.dispatch("fetch", { request: privatePageRequest });

  const serverDataRequest = request("/contact?_rsc=abc", { mode: "same-origin", destination: "" });
  await worker.dispatch("fetch", { request: serverDataRequest });

  const shell = await worker.caches.open("iwacu-shell-iwacu-v3-representative-points");
  assert.equal(await shell.match(noStoreRequest), undefined);
  assert.equal(await shell.match(adminRequest), undefined);
  assert.equal(await shell.match(privatePageRequest), undefined);
  assert.equal(await shell.match(serverDataRequest), undefined);
});


test("public photo assets stay cached and available offline", async () => {
  const worker = createWorker();
  await installWithAssets(worker);
  const photoRequest = request("/photos/akagera-wildlife.jpg", { destination: "image" });
  worker.setFetch(async () => new Response("photo-bytes", {
    status: 200,
    headers: { "content-type": "image/jpeg" },
  }));

  const online = await worker.dispatch("fetch", { request: photoRequest });
  assert.equal(online.status, 200);
  const shell = await worker.caches.open("iwacu-shell-iwacu-v3-representative-points");
  assert.ok(await shell.match(photoRequest), "public photo should be cached");

  worker.setFetch(async () => { throw new Error("offline"); });
  const offline = await worker.dispatch("fetch", { request: photoRequest });
  assert.equal(await offline.text(), "photo-bytes");
});
