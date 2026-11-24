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
const errors = []; page.on("pageerror", (e) => errors.push("pageerror " + String(e).slice(0, 160)));
page.on("console", (m) => { if (m.type() === "error") errors.push("console " + m.text().slice(0, 160)); });
const reqs = []; page.on("response", async (r) => { const u = r.url(); if (u.includes("/kigali/") || u.includes("/api/ikarita/")) reqs.push({ u: u.replace(B, ""), s: r.status(), t: Date.now() }); });
const t0 = Date.now();
await page.goto(B + "/ikarita", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".leaflet-container", { timeout: 60000 });
const tMap = Date.now() - t0;
await page.waitForResponse((r) => r.url().includes("/kigali/cell.json") || r.url().includes("/api/ikarita/overlay"), { timeout: 60000 }).catch(() => null);
await page.waitForTimeout(1500);
const tCells = Date.now() - t0;
await page.screenshot({ path: "shot-1-open.png" });
// zoom into Kiyovu and wait for villages
await page.evaluate(() => { /* leaflet map instance is not global; use keyboard zoom */ });
const tl = Date.now();
await page.click("#ikarita-locate");
await page.waitForSelector("section[aria-label] h2", { timeout: 60000 }).catch(() => null);
const h2 = await page.$eval("section[aria-label] h2", (e) => e.textContent).catch(() => null);
const tLocate = Date.now() - tl;
await page.waitForTimeout(3000);
await page.screenshot({ path: "shot-2-aho-ndi.png" });
const labels = await page.$$eval(".iwacu-village-label", (els) => els.length);
const areaLabels = await page.$$eval(".iwacu-area-label", (els) => els.map((e) => e.textContent));
console.log(JSON.stringify({ tMapMs: tMap, tFirstOverlayMs: tCells, locateToResultMs: tLocate, place: h2, villageLabels: labels, areaLabels, errors: errors.slice(0, 8) }));
console.log(reqs.map((r) => r.s + " " + r.u).join("\n"));
await browser.close();
