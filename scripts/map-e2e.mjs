// CHANGED 2026-11-03 GROK: local map WebGL e2e via SwiftShader; see docs/HANDOFF.md
import { chromium } from "playwright";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("artifacts/map-e2e");
fs.mkdirSync(OUT, { recursive: true });

const BG = { r: 0xf0, g: 0xf4, b: 0xf0 };
const TOL = 6;

function nonBgShare(pngBuf) {
  const png = PNG.sync.read(pngBuf);
  let non = 0;
  const n = png.width * png.height;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const dr = Math.abs(png.data[o] - BG.r);
    const dg = Math.abs(png.data[o + 1] - BG.g);
    const db = Math.abs(png.data[o + 2] - BG.b);
    if (dr > TOL || dg > TOL || db > TOL) non++;
  }
  return n ? non / n : 0;
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function measureMap(page, label) {
  const box = page.locator(".maplibregl-map, .maplibregl-canvas").first();
  await box.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  const shot = path.join(OUT, `${label}.png`);
  const target = page.locator(".maplibregl-canvas").first();
  const buf = await target.screenshot({ type: "png" }).catch(async () => {
    return page.screenshot({ type: "png", path: shot });
  });
  fs.writeFileSync(shot, buf);
  const share = nonBgShare(buf);
  return { shot, share };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-angle=swiftshader",
      "--use-gl=angle",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleLines = [];
  page.on("console", (msg) => {
    const t = msg.type();
    if (t === "error" || t === "warning") {
      consoleLines.push(`[${t}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleLines.push(`[pageerror] ${err.message}`);
  });

  const reqs = [];
  page.on("requestfinished", async (req) => {
    const res = await req.response();
    reqs.push({
      url: req.url(),
      host: hostOf(req.url()),
      status: res ? res.status() : 0,
      headers: req.headers(),
    });
  });
  page.on("requestfailed", (req) => {
    reqs.push({ url: req.url(), host: hostOf(req.url()), status: 0, failed: true });
  });

  let fail = false;
  const metrics = {};

  // --- picker ---
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  const openBtn = page.getByRole("button", { name: /Fungura ikarita/i });
  await openBtn.click();
  await page.waitForSelector(".maplibregl-canvas", { timeout: 30000 });

  const webglInfo = await page.evaluate(() => {
    const c = document.createElement("canvas");
    let webgl2 = false;
    let webgl = false;
    try {
      webgl2 = !!c.getContext("webgl2");
    } catch {}
    try {
      webgl = !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch {}
    return { webgl2, webgl };
  });
  metrics.webgl = webglInfo;

  await page.waitForTimeout(8000);
  let m1 = await measureMap(page, "picker-1");
  metrics.picker_share_1 = m1.share;
  if (m1.share < 0.05) {
    const zoomIn = page.locator(".maplibregl-ctrl-zoom-in");
    if (await zoomIn.count()) {
      await zoomIn.click();
      await page.waitForTimeout(500);
      await zoomIn.click();
      await page.waitForTimeout(3000);
    }
    m1 = await measureMap(page, "picker-2");
    metrics.picker_share_2 = m1.share;
  }
  metrics.picker_share = Math.max(m1.share, metrics.picker_share_1 || 0);

  // click centre of map canvas
  const canvas = page.locator(".maplibregl-canvas").first();
  const bb = await canvas.boundingBox();
  if (bb) {
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  }
  await page.waitForTimeout(1500);
  const selected = await page.getByText("Ahantu wahisemo").count();
  metrics.ahantu = selected > 0;

  // --- demo ---
  await page.goto("http://localhost:3000/rwanda-grid-map/basemap/demo/index.html", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(10000);
  const demo = await measureMap(page, "demo");
  metrics.demo_share = demo.share;

  // aggregate network
  const hosts = {};
  for (const r of reqs) hosts[r.host] = (hosts[r.host] || 0) + 1;
  const pmtiles = reqs.filter((r) => r.url.includes("rwanda.pmtiles"));
  const pbfs = reqs.filter((r) => r.url.includes(".pbf"));
  metrics.hosts = hosts;
  metrics.pmtiles = pmtiles.map((r) => ({ status: r.status, range: r.headers?.range || r.headers?.Range || null, url: r.url.slice(-40) }));
  metrics.pbf_count = pbfs.length;
  metrics.pbf_statuses = pbfs.reduce((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1;
    return a;
  }, {});
  metrics.console = consoleLines;

  // PASS rules
  const hostKeys = Object.keys(hosts);
  const onlyLocal = hostKeys.every((h) => h === "localhost:3000" || h === "127.0.0.1:3000");
  const pmtiles206 = pmtiles.some((r) => r.status === 206 || r.status === 200);
  const shareOk = metrics.picker_share >= 0.05;
  const badConsole = consoleLines.some((l) => /style|pmtiles|glyph/i.test(l));

  metrics.pass_hosts = onlyLocal;
  metrics.pass_pmtiles = pmtiles206 && pmtiles.length >= 1;
  metrics.pass_share = shareOk;
  metrics.pass_ahantu = metrics.ahantu;
  metrics.pass_console = !badConsole;
  metrics.PASS =
    metrics.pass_hosts &&
    metrics.pass_pmtiles &&
    metrics.pass_share &&
    metrics.pass_ahantu &&
    metrics.pass_console;

  console.log("=== MAP-E2E METRICS ===");
  console.log(JSON.stringify(metrics, null, 2));
  console.log(metrics.PASS ? "MAP-E2E PASS" : "MAP-E2E FAIL");

  await browser.close();
  if (!metrics.PASS) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
