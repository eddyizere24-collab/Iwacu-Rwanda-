import { chromium } from "playwright";
const B = "https://iwacu-rwanda-2.vercel.app";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 412, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  geolocation: { latitude: -1.953097, longitude: 30.062702, accuracy: 15 }, permissions: ["geolocation"], locale: "rw-RW",
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const logs = [];
page.on("pageerror", (e) => logs.push("pageerror " + String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.type() + " " + m.text().slice(0, 200)); });
const reqs = [];
const t0 = Date.now();
let firstOverlayAt = null;
page.on("response", (r) => {
  const u = r.url();
  if (u.includes("/kigali/") || u.includes("/api/ikarita/") || u.includes("/api/locate")) {
    reqs.push(`${Date.now() - t0}ms ${r.status()} ${u.replace(B, "")}`);
    if (firstOverlayAt === null && (u.includes("/kigali/cell.json") || u.includes("/api/ikarita/overlay"))) firstOverlayAt = Date.now() - t0;
  }
});
const out = {};
await page.goto(B + "/ikarita", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".leaflet-container", { timeout: 60000 });
out.mapReadyMs = Date.now() - t0;
await page.waitForTimeout(4000);
out.firstOverlayRequestMs = firstOverlayAt;
await page.screenshot({ path: "shot-1-open.png" });

// zoom to street level around Kigali centre and time the villages
const zin = page.locator(".leaflet-control-zoom-in");
const tz = Date.now();
for (let i = 0; i < 3; i++) { await zin.click(); await page.waitForTimeout(600); }
await page.waitForFunction(() => document.querySelectorAll(".iwacu-village-label").length > 0, null, { timeout: 40000 }).catch(() => null);
out.zoomToVillageLabelsMs = Date.now() - tz;
out.villageLabels = await page.$$eval(".iwacu-village-label", (els) => els.length);
await page.waitForTimeout(1500);
await page.screenshot({ path: "shot-2-villages.png" });

// does the browser itself have geolocation?
out.geo = await page.evaluate(() => new Promise((res) => navigator.geolocation.getCurrentPosition(
  (p) => res({ ok: true, lat: p.coords.latitude, lng: p.coords.longitude }),
  (e) => res({ ok: false, code: e.code, msg: e.message }), { timeout: 15000 })));

const tl = Date.now();
await page.click("#ikarita-locate");
await page.waitForSelector("section[aria-label] h2", { timeout: 45000 }).catch(() => null);
out.locateToSheetMs = Date.now() - tl;
out.place = await page.$eval("section[aria-label] h2", (e) => e.textContent).catch(() => null);
out.notice = await page.$eval("p[aria-live=polite]", (e) => e.textContent).catch(() => null);
await page.waitForTimeout(3500);
out.areaLabels = await page.$$eval(".iwacu-area-label", (els) => els.map((e) => e.textContent));
await page.screenshot({ path: "shot-3-aho-ndi.png" });

// route from my location to a place: use "Jya hano"
const go = page.getByRole("button", { name: /Jya hano/ });
if (await go.count()) {
  const tr = Date.now();
  await go.first().click();
  await page.waitForFunction(() => /min/.test(document.body.innerText) && document.querySelectorAll('[role=tab]').length >= 4, null, { timeout: 45000 }).catch(() => null);
  out.routeMs = Date.now() - tr;
  out.tabs = await page.$$eval("[role=tab]", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "shot-4-route.png" });
}
out.logs = logs.slice(0, 10);
console.log("RESULT " + JSON.stringify(out));
console.log("REQS\n" + reqs.join("\n"));
await browser.close();
