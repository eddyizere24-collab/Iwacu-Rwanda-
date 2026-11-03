import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLocateCacheKey, createIpRateLimiter, getClientIpFromHeaders } from "./locate-protection";

// CHANGED 2026-11-01 CLAUDE-PATCH: guards for the independence rule and the hardening review.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const locateRoute = read("../app/api/locate/route.ts");
const aiRouter = read("../app/api/ai-router/route.ts");
const serverLib = read("./supabase/server.ts");
const layout = read("../app/layout.tsx");

test("no runtime call to an outside boundary server remains in the app code", () => {
  for (const [name, source] of [["locate route", locateRoute], ["ai-router", aiRouter]] as const) {
    assert.ok(!source.includes("gis-server.statistics.gov.rw"), name + " must not call NISR at runtime");
    assert.ok(!source.includes("national-boundaries"), name + " must not import the NISR module");
  }
});

test("accuracy is bounded and a bad body is a validation error, not GPS denied", () => {
  assert.match(locateRoute, /accuracy: z\.number\(\)\.finite\(\)\.nonnegative\(\)\.max\(100_000\)/);
  assert.match(locateRoute, /createLocateError\("VALIDATION_ERROR"/);
  assert.ok(!/createLocateError\("GPS_DENIED", \{\s*validation/.test(locateRoute));
});

test("cache key separates two very accurate points 8 m apart", () => {
  const a = buildLocateCacheKey({ latitude: -1.94410, longitude: 30.06190, accuracy: 10, method: "gps" });
  const b = buildLocateCacheKey({ latitude: -1.94417, longitude: 30.06190, accuracy: 10, method: "gps" });
  assert.notEqual(a, b);
  const c = buildLocateCacheKey({ latitude: -1.94410, longitude: 30.06190, accuracy: 500, method: "gps" });
  const d = buildLocateCacheKey({ latitude: -1.94412, longitude: 30.06190, accuracy: 500, method: "gps" });
  assert.equal(c, d, "coarse fixes still share the cheaper 4-decimal key");
});

test("ai-router is rate limited and the service-role client never uses placeholders", () => {
  assert.ok(aiRouter.includes("createIpRateLimiter"));
  assert.ok(aiRouter.includes("status: 429"));
  assert.ok(!serverLib.includes("placeholder-service-role-key"));
  assert.match(serverLib, /throw new Error\("Supabase service client is not configured/);
});

test("client IP prefers platform headers and the limiter blocks the 31st request", () => {
  const headers = new Headers({ "x-forwarded-for": "9.9.9.9", "x-real-ip": "1.2.3.4" });
  assert.equal(getClientIpFromHeaders(headers), "1.2.3.4");
  const limiter = createIpRateLimiter({ limit: 30, windowMs: 60_000 });
  for (let i = 0; i < 30; i += 1) assert.equal(limiter.consume("1.2.3.4"), true);
  assert.equal(limiter.consume("1.2.3.4"), false);
});

test("attribution for NISR (CC BY 4.0) and OpenStreetMap (ODbL) is shown in the app footer", () => {
  assert.ok(layout.includes("National Institute of Statistics of Rwanda (CC BY 4.0)"));
  assert.ok(layout.includes("OpenStreetMap contributors (ODbL)"));
});
