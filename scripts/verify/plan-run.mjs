import { chromium } from "playwright";
const B = "https://iwacu-rwanda-2.vercel.app";
const START = { latitude: -2.0119047, longitude: 29.8539674, accuracy: 20 };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, geolocation: START, permissions: ["geolocation"] });
const page = await ctx.newPage();
const log = [];
page.on("response", async (r) => {
  const u = r.url();
  if (u.includes("/api/ikarita/route") || u.includes("/api/ikarita/search") || u.includes("/api/ikarita/places")) log.push(`${r.status()} ${decodeURIComponent(u.replace(B, ""))}`);
});
await page.goto(B + "/ikarita?inzira=1", { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[aria-label="Aho ujya"]', { timeout: 60000 });
await page.waitForTimeout(1500);
// origin = my place
await page.click('input[aria-label="Aho uhagurukira"]');
await page.waitForTimeout(300);
const originField = page.locator('button[aria-label="Aho ndi"]').first();
await originField.click();
await page.waitForTimeout(2500);
const out = {};
for (const q of (process.env.QUERIES || "Kigali,Huye,Musanze").split(",")) {
  const dest = page.locator('input[aria-label="Aho ujya"]');
  await dest.click();
  await dest.fill(q);
  await page.waitForTimeout(1800);
  out["sugg_" + q] = await page.$$eval('[role=listbox] [role=option]', (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
  const first = page.locator('[role=listbox] [role=option] button').first();
  if (await first.count()) { await first.click(); await page.waitForTimeout(4000); }
  out["tabs_" + q] = await page.$$eval("[role=tab]", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
  out["fields_" + q] = await page.$$eval('input[aria-label="Aho uhagurukira"], input[aria-label="Aho ujya"]', (els) => els.map((e) => e.value));
  await page.screenshot({ path: `plan-${q}.png` });
}
out.sheetHeightPx = await page.$eval('section[aria-label="Urugendo"]', (e) => Math.round(e.getBoundingClientRect().height)).catch(() => null);
console.log("RESULT " + JSON.stringify(out, null, 1));
console.log("REQS\n" + log.join("\n"));
await browser.close();
