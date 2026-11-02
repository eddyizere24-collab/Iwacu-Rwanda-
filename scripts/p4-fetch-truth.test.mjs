// CHANGED 2026-11-02 CLAUDE: unit tests for the truth-point fetcher (no network, no database).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PER_KIND, PROJECT_URL, districtCodesFromIndex, fetchTruth, main, toCsv, truthUrl } from "./p4-fetch-truth.mjs";
import { buildPlan, parseCsv } from "./p4-national-runner.mjs";

const fakeIndex = { choices: [
  ["RW-P1", "Kigali", "Kigali", "province", "RW", -1.9, 30.1],
  ...Array.from({ length: 30 }, (_, n) => ["RW-P" + (1 + (n % 5)) + "-D" + (11 + n), "D" + n, "D" + n, "district", "RW", -2, 30]),
  ["RW-P1-D11-S1101", "S", "S", "sector", "RW-P1-D11", -2, 30],
] };

function fakeServer() {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const q = new URL(url).searchParams;
    const district = q.get("district_scope_code").slice(3);
    const kind = q.get("kind").slice(3);
    const seed = Number(q.get("seed").slice(3));
    const limit = Number(q.get("limit"));
    const rows = Array.from({ length: limit }, (_, i) => ({
      district_scope_code: district, seed, idx: (kind === "interior" ? 1 : 401) + i,
      lng: 30.05 + i / 1000, lat: -1.95 - i / 1000, kind,
      true_village_scope_code: district + "-S1101-C110101-V11010101",
    }));
    return { status: 200, text: async () => JSON.stringify(rows) };
  };
  return { calls, fetchImpl };
}

test("30 district codes come from the bundled index, not from the database", () => {
  assert.equal(districtCodesFromIndex(fakeIndex).length, 30);
  assert.throws(() => districtCodesFromIndex({ choices: [] }), /Expected 30 districts/);
});

test("URL asks one indexed slice: district, seed, kind, order by idx, small limit", () => {
  const url = new URL(truthUrl(PROJECT_URL + "/", "RW-P1-D11", 424242, "interior", 20));
  assert.equal(url.pathname, "/rest/v1/w2_truth_samples");
  assert.equal(url.searchParams.get("district_scope_code"), "eq.RW-P1-D11");
  assert.equal(url.searchParams.get("seed"), "eq.424242");
  assert.equal(url.searchParams.get("kind"), "eq.interior");
  assert.equal(url.searchParams.get("order"), "idx.asc");
  assert.equal(url.searchParams.get("limit"), "20");
  assert.ok(!url.searchParams.get("select").includes("geom"));
});

test("full run: 120 sequential requests, 1500 rows, CSV feeds the runner plan", async () => {
  const districts = districtCodesFromIndex(fakeIndex);
  const { calls, fetchImpl } = fakeServer();
  const rows = await fetchTruth({ base: PROJECT_URL, key: "k", districts, fetchImpl, sleep: async () => {}, gapMs: 0 });
  assert.equal(calls.length, 30 * 2 * 2);
  assert.equal(rows.length, 30 * 2 * (PER_KIND.interior + PER_KIND.shared_boundary_50m));
  const points = parseCsv(toCsv(rows));
  assert.equal(points.length, 1500);
  assert.equal(buildPlan(points, 424242).length, 750 * 4);   // 3000 requests per seed
  assert.equal(buildPlan(points, 20261030).length, 750 * 4);
  assert.equal(points.filter((p) => p.kind === "shared_boundary_50m").length, 300);
});

test("the first failing read stops the run and reports the exact status and body", async () => {
  const districts = districtCodesFromIndex(fakeIndex);
  let n = 0;
  const fetchImpl = async () => { n += 1; return { status: 500, text: async () => '{"code":"57014","message":"canceling statement due to statement timeout"}' }; };
  await assert.rejects(fetchTruth({ base: PROJECT_URL, key: "k", districts, fetchImpl, sleep: async () => {}, gapMs: 0 }),
    /TRUTH READ FAILED HTTP 500 RW-P1-D11\/424242\/interior body: .*57014/);
  assert.equal(n, 1);
});

test("a short answer is an error, not a silent gap", async () => {
  const fetchImpl = async () => ({ status: 200, text: async () => "[]" });
  await assert.rejects(fetchTruth({ base: PROJECT_URL, key: "k", districts: ["RW-P1-D11"], fetchImpl, sleep: async () => {}, gapMs: 0 }),
    /expected 20 rows, got 0/);
});

test("main refuses by day, refuses a foreign project, and needs the anon key", async () => {
  assert.equal(await main({}, () => new Date("2026-11-02T10:00:00Z")), 4);
  await assert.rejects(main({ NEXT_PUBLIC_SUPABASE_URL: "https://agwfnpwootwsgsdeohcd.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" },
    () => new Date("2026-11-02T21:00:00Z")), /not the explicitly allowed project/);
  await assert.rejects(main({ NEXT_PUBLIC_SUPABASE_URL: PROJECT_URL }, () => new Date("2026-11-02T21:00:00Z")), /ANON_KEY is missing/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p4f-"));
  assert.ok(dir);
});
