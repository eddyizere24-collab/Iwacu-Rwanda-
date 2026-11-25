import { chromium } from "playwright";
const B = "https://iwacu-rwanda-2.vercel.app";
const START = { latitude: -2.0119047, longitude: 29.8539674, accuracy: 20 };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, geolocation: START, permissions: ["geolocation"] });
const page = await ctx.newPage();
const log = [];
const all = [];
page.on("request", (r) => { if (r.url().includes("/api/")) all.push("REQ " + r.method() + " " + r.url().replace(B, "")); });
page.on("console", (m) => { if (["error","warning"].includes(m.type())) all.push("CONSOLE " + m.text().slice(0, 160)); });
page.on("pageerror", (e) => all.push("PAGEERR " + String(e).slice(0, 200)));
page.on("response", async (r) => {
  const u = r.url();
  if (u.includes("/api/ikarita/route") || u.includes("/api/ikarita/search") || u.includes("/api/ikarita/places")) log.push(`${r.status()} ${decodeURIComponent(u.replace(B, ""))}`);
});
await page.goto(B + "/ikarita", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".leaflet-container", { timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "plan-0-open.png" });
await page.click("#ikarita-planner");
await page.waitForSelector('input[aria-label="Aho ujya"]', { timeout: 20000 });
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
  await dest.fill("");
  await dest.pressSequentially(q, { delay: 80 });
  out["active_" + q] = await page.evaluate(() => document.activeElement && (document.activeElement.getAttribute("aria-label") || document.activeElement.tagName));
  await page.waitForSelector("[role=listbox] [role=option]", { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(300);
  out["sugg_" + q] = await page.$$eval('[role=listbox] [role=option]', (els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
  const first = page.locator('[role=listbox] [role=option] button').first();
  if (await first.count()) { await first.click(); await page.waitForTimeout(4000); }
  out["tabs_" + q] = await page.$$eval("[role=tab]", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
  out["fields_" + q] = await page.$$eval('input[aria-label="Aho uhagurukira"], input[aria-label="Aho ujya"]', (els) => els.map((e) => e.value));
  await page.screenshot({ path: `plan-${q}.png` });
}
out.bottomBarPx = await page.$eval('section[aria-label="Inzira n\'igihe"]', (e) => Math.round(e.getBoundingClientRect().height)).catch(() => null);
console.log("RESULT " + JSON.stringify(out, null, 1));
console.log("REQS\n" + log.join("\n"));
console.log("ALL\n" + all.join("\n"));
await browser.close();
