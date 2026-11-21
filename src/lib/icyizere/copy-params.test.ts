import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MAX_COPY_LIMIT, neonSqlEndpoint, parseCopyParams, tokenMatches } from "./copy-params";

test("token must match exactly and be present", () => {
  assert.equal(tokenMatches("abc", "abc"), true);
  assert.equal(tokenMatches("abc", "abd"), false);
  assert.equal(tokenMatches("abc", null), false);
  assert.equal(tokenMatches(undefined, "abc"), false);
});

test("limit is clamped to the maximum and unknown levels are rejected", () => {
  const ok = parseCopyParams(new URLSearchParams("level=village&offset=10&limit=9999"));
  assert.deepEqual(ok, { level: "village", offset: 10, limit: MAX_COPY_LIMIT });
  assert.equal(parseCopyParams(new URLSearchParams("level=planet")), null);
  assert.equal(parseCopyParams(new URLSearchParams("level=cell&offset=-1")), null);
});

test("only neon hosts are accepted for the SQL endpoint", () => {
  assert.equal(neonSqlEndpoint("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db"), "https://ep-x.eu-central-1.aws.neon.tech/sql");
  assert.equal(neonSqlEndpoint("postgresql://u:p@evil.example.com/db"), null);
});

test("route returns 404 without env or token and never reads secrets into responses", () => {
  const src = readFileSync("src/app/api/admin/icyizere-copy/route.ts", "utf8");
  assert.match(src, /if \(!expectedToken \|\| !neonUrl\) return notFound\(\)/);
  assert.match(src, /tokenMatches\(expectedToken, search\.get\("token"\)\)/);
  assert.doesNotMatch(src, /console\.(log|error)/);
});
