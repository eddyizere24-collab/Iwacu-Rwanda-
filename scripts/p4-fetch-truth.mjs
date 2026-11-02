// CHANGED 2026-11-02 CLAUDE: builds data/p4-truth-points.csv from the public w2_truth_samples table with small,
// indexed, strictly sequential REST reads (anon key, read-only): per district (codes taken from the bundled offline
// index, no database lookup) and per seed, 20 'interior' + 5 'shared_boundary_50m' rows. 120 requests, >= 1.2 s apart.
// The first failing read stops the script and prints the exact HTTP status and body. See docs/HANDOFF.md.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { nightWindowOk } from "./p4-national-runner.mjs";

export const PROJECT_URL = "https://buexgewxypvkqmphvfec.supabase.co";
export const SEEDS = [424242, 20261030];
export const PER_KIND = { interior: 20, shared_boundary_50m: 5 };
export const GAP_MS = 1200;
const SELECT = "district_scope_code,seed,idx,lng,lat,true_village_scope_code,kind";

export function districtCodesFromIndex(index) {
  const codes = (index.choices || []).filter((row) => row[3] === "district").map((row) => String(row[0])).sort();
  if (codes.length !== 30) throw new Error("Expected 30 districts in the offline index, found " + codes.length);
  return codes;
}

export function truthUrl(base, district, seed, kind, limit) {
  const query = new URLSearchParams({
    select: SELECT,
    district_scope_code: "eq." + district,
    seed: "eq." + seed,
    kind: "eq." + kind,
    order: "idx.asc",
    limit: String(limit),
  });
  return base.replace(/\/+$/, "") + "/rest/v1/w2_truth_samples?" + query.toString();
}

export async function fetchTruth({ base, key, districts, seeds = SEEDS, fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), gapMs = GAP_MS, log = () => {} }) {
  const rows = [];
  let previousStart = 0;
  for (const district of districts) {
    for (const seed of seeds) {
      for (const [kind, limit] of Object.entries(PER_KIND)) {
        const wait = Math.max(0, previousStart + gapMs - Date.now());
        if (wait) await sleep(wait);
        previousStart = Date.now();
        const url = truthUrl(base, district, seed, kind, limit);
        let reply;
        try {
          reply = await fetchImpl(url, { headers: { apikey: key, Authorization: "Bearer " + key, Accept: "application/json" },
            signal: AbortSignal.timeout(15000) });
        } catch (error) {
          throw new Error("TRUTH READ FAILED (network) " + district + "/" + seed + "/" + kind + ": " + (error?.message || error));
        }
        const text = await reply.text();
        if (reply.status !== 200) {
          throw new Error("TRUTH READ FAILED HTTP " + reply.status + " " + district + "/" + seed + "/" + kind + " body: " + text.slice(0, 400));
        }
        let data;
        try { data = JSON.parse(text); } catch { throw new Error("TRUTH READ FAILED not JSON " + district + "/" + seed + "/" + kind + ": " + text.slice(0, 200)); }
        if (!Array.isArray(data) || data.length !== limit) {
          throw new Error("TRUTH READ FAILED expected " + limit + " rows, got " + (Array.isArray(data) ? data.length : typeof data) +
            " for " + district + "/" + seed + "/" + kind);
        }
        for (const row of data) rows.push(row);
        log(district + " " + seed + " " + kind + " " + data.length);
      }
    }
  }
  return rows;
}

export function toCsv(rows) {
  const header = "district_scope_code,seed,idx,lng,lat,true_village_scope_code,kind";
  const lines = rows.map((row) => [row.district_scope_code, row.seed, row.idx, row.lng, row.lat, row.true_village_scope_code, row.kind].join(","));
  return header + "\n" + lines.join("\n") + "\n";
}

export async function main(env = process.env, clock = () => new Date()) {
  if (!nightWindowOk(clock())) {
    console.error("TOO_EARLY: this validation runs only between 22:00 and 06:00 Kigali time.");
    return 4;
  }
  const base = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (base !== PROJECT_URL) throw new Error("Refusing: Supabase URL is not the explicitly allowed project buexgewxypvkqmphvfec.");
  if (!key) throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
  const index = JSON.parse(fs.readFileSync(env.P4_INDEX || "public/offline/location-index.json", "utf8"));
  const districts = districtCodesFromIndex(index);
  const rows = await fetchTruth({ base, key, districts, log: (line) => console.log(line) });
  const out = env.P4_CSV || "data/p4-truth-points.csv";
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, toCsv(rows));
  console.log("WROTE " + out + " rows=" + rows.length + " (expected 1500 = 30 districts x 2 seeds x 25 points)");
  return rows.length === 1500 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });
}
