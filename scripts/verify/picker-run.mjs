import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire("/tmp/pw/");
const { chromium } = require("playwright");
const BASE = "http://localhost:3100";
mkdirSync("shots", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 360, height: 640 }, deviceScaleFactor: 1.5, locale: "rw-RW",
  geolocation: { latitude: -1.5039, longitude: 29.6335 }, permissions: ["geolocation"],
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
await page.goto(BASE + "/verify-picker", { waitUntil: "load" });
await page.waitForTimeout(1500);
const input = page.locator('input[type="search"]').first();
await page.screenshot({ path: "shots/pk-0-open.png" });

async function type(q) {
  await input.fill("");
  const started = Date.now();
  const response = page.waitForResponse((r) => r.url().includes("/api/administrative-units/search"), { timeout: 8000 }).catch(() => null);
  await input.pressSequentially(q, { delay: 25 });
  const r = await response;
  await page.waitForTimeout(500);
  console.log("TYPE", q, "api_ms", Date.now() - started, "status", r ? r.status() : "none");
}
async function rows(n = 6) {
  const texts = await page.locator("ul li button").allInnerTexts();
  console.log("  count", texts.length);
  texts.slice(0, n).forEach((t) => console.log("  -", t.replace(/\s*\n\s*/g, " | ")));
}

await type("gihembe"); await rows(); await page.screenshot({ path: "shots/pk-1-gihembe.png" });
await type("kabeza"); await rows(); await page.screenshot({ path: "shots/pk-2-kabeza-near.png" });
await type("gihembe burera"); await rows(4);
await type("umudugudu wanenze"); await rows(3);
await type("Nyarugnge"); await rows(3);
await type("Kimironko"); await rows(4);
await page.locator("ul li button").first().click();
await page.waitForTimeout(1200);
console.log("CRUMBS", (await page.locator("nav button").allInnerTexts()).join(" > "));
const after = await page.locator("main button").allInnerTexts();
console.log("AFTER", after.slice(0, 8).map((t) => t.replace(/\s*\n\s*/g, " | ")).join(" ;; "));
await page.screenshot({ path: "shots/pk-3-opened-sector.png" });
await type("Kigali"); await rows(4);
await page.screenshot({ path: "shots/pk-4-kigali.png" });
await browser.close();
