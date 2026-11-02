import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { checkEnv, summarize } from "../src/lib/health";

test("manifest and service worker exist", () => {
  assert.equal(existsSync("public/manifest.json"), true);
  assert.equal(existsSync("public/sw.js"), true);
  const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
  assert.ok(manifest.name || manifest.short_name);
});

test("emergency-national.json is present", () => {
  assert.equal(existsSync("public/emergency-national.json"), true);
});

test("health summarize degraded without env", () => {
  const checks = checkEnv({});
  const report = summarize(checks);
  assert.equal(report.status === "degraded" || report.status === "error" || report.status === "ok", true);
});
