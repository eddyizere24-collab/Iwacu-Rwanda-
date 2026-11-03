import test from "node:test";
import assert from "node:assert/strict";
import { isWithinScope } from "../src/lib/security/scope";
import { isRateLimited, clientIp } from "../src/lib/security/rate-limit";
import { isSameOrigin } from "../src/lib/security/origin";

test("isWithinScope respects the delimiter (RW-01 must not match RW-010-...)", () => {
  assert.equal(isWithinScope("RW-01", "RW-01"), true);
  assert.equal(isWithinScope("RW-01", "RW-01-02-03"), true);
  assert.equal(isWithinScope("RW-01", "RW-010-02"), false);
  assert.equal(isWithinScope("RW-01", "RW-02-01"), false);
  assert.equal(isWithinScope("RW-01-01", "RW-01"), false);
  assert.equal(isWithinScope("", "RW-01"), false);
  assert.equal(isWithinScope("RW-01", ""), false);
  assert.equal(isWithinScope("RW", "RW-05-02"), true);
  assert.equal(isWithinScope("00", "RW-05-02"), false);
});

test("rate limiter blocks after N and fails closed for sensitive routes in production", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const key = "t:" + Math.random();
  const t0 = 1_000_000;
  assert.equal(await isRateLimited(key, 2, 1000, t0), false);
  assert.equal(await isRateLimited(key, 2, 1000, t0 + 1), false);
  assert.equal(await isRateLimited(key, 2, 1000, t0 + 2), true);
  assert.equal(await isRateLimited(key, 2, 1000, t0 + 2000), false);
  const prev = process.env.NODE_ENV;
  (process.env as Record<string, string>).NODE_ENV = "production";
  assert.equal(await isRateLimited("s:" + Math.random(), 5, 1000, t0, { failClosed: true }), true);
  (process.env as Record<string, string>).NODE_ENV = prev ?? "test";
});

test("client IP prefers platform headers over spoofable X-Forwarded-For", () => {
  const mk = (h: Record<string, string>) => new Request("http://x", { headers: h });
  assert.equal(clientIp(mk({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "6.6.6.6, 2.2.2.2" })), "1.1.1.1");
  assert.equal(clientIp(mk({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" })), "2.2.2.2");
  assert.equal(clientIp(mk({})), "unknown");
});

test("same-origin check (CSRF)", () => {
  const mk = (h: Record<string, string>) => new Request("http://x", { method: "POST", headers: h });
  assert.equal(isSameOrigin(mk({ origin: "https://iwacu.rw", host: "iwacu.rw" })), true);
  assert.equal(isSameOrigin(mk({ origin: "https://evil.example", host: "iwacu.rw" })), false);
  assert.equal(isSameOrigin(mk({ host: "iwacu.rw" })), false);
  assert.equal(isSameOrigin(mk({ origin: "not a url", host: "iwacu.rw" })), false);
});

import { redactPii, escapeLike } from "../src/lib/security/redact";
test("PII is stripped before text reaches a third-party model", () => {
  assert.equal(redactPii("hamagara 0788 123 456 ubu"), "hamagara [number] ubu");
  assert.equal(redactPii("mail me a.b@mail.rw please"), "mail me [email] please");
  assert.equal(redactPii("+250 788-123-456"), "[number]");
  assert.equal(redactPii("Umudugudu wa Kimironko"), "Umudugudu wa Kimironko");
});
test("LIKE wildcards are escaped so a place name cannot match everything", () => {
  assert.equal(escapeLike("100%_x\\"), "100\\%\\_x\\\\");
  assert.equal(escapeLike("%"), "\\%");
});
