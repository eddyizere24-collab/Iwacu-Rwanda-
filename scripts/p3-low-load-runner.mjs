import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { loadTruthRows } from "./truth.mjs";
import { RADII, requestPlan, evaluate, summarize, agreement, plannedPreview } from "./score.mjs";

const BASE_URL = "http://127.0.0.1:3000", GAP_MS = 2100, HARD_STOP_ERRORS = 10;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function dryRunPoints() {
  return [
    { district: "Nyarugenge", district_scope_code: "RW-P1-D11", idx: 1, latitude: -1.9441, longitude: 30.0619, true_village_scope_code: "RW-P1-D11-S1101-C110101-V11010101" },
    { district: "Nyarugenge", district_scope_code: "RW-P1-D11", idx: 2, latitude: -1.9520, longitude: 30.0550, true_village_scope_code: "RW-P1-D11-S1101-C110101-V11010102" },
  ];
}

async function startApp(version) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3000"], {
    env: { ...process.env, PORT: "3000", HOSTNAME: "127.0.0.1", LOCATE_CONFIDENCE_RPC: version, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", chunk => { logs = (logs + chunk.toString()).slice(-5000); });
  child.stderr.on("data", chunk => { logs = (logs + chunk.toString()).slice(-5000); });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Next server ${version} exited early: ${logs}`);
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.status === 200 && (await response.text()).length > 0) return child;
    } catch {}
    await sleep(1000);
  }
  child.kill("SIGTERM");
  throw new Error(`Next server ${version} health check timed out: ${logs}`);
}

async function stopApp(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([new Promise(resolve => child.once("exit", resolve)), sleep(5000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function testVersion(version, plans, state) {
  const child = await startApp(version), rows = [];
  try {
    let previousStart = 0;
    for (const plan of plans) {
      if (state.errors >= HARD_STOP_ERRORS) break;
      const wait = Math.max(0, previousStart + GAP_MS - Date.now());
      if (wait) await sleep(wait);
      const started = Date.now(); previousStart = started;
      let status = 0, body = null, error = null;
      try {
        const response = await fetch(`${BASE_URL}/api/locate`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ latitude: plan.latitude, longitude: plan.longitude, accuracy: plan.accuracy, method: "gps" }),
          signal: AbortSignal.timeout(12000),
        });
        status = response.status; body = await response.json();
      } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
      const measured = evaluate(plan, status, body, Date.now() - started, error);
      if (measured.error) state.errors += 1;
      rows.push(measured);
      console.log(JSON.stringify({ version, request: rows.length, ...measured, total_errors: state.errors }));
    }
  } finally { await stopApp(child); }
  return rows;
}

async function main() {
  const dry = process.env.DRY_RUN === "1", points = dry ? dryRunPoints() : await loadTruthRows();
  const plans = requestPlan(points);
  if (dry) {
    console.log("DRY_RUN=1 — no Supabase REST, no local HTTP, no /api/locate requests.");
    console.log(JSON.stringify({ planned_points_in_preview: points.length, radii_m: RADII,
      expected_real_truth_points: 75, planned_requests_per_version: 300, total_requests_both_versions: 600,
      first_5_planned_requests: plannedPreview(points) }, null, 2));
    return;
  }
  if (points.length !== 75 || plans.length !== 300) throw new Error(`Expected 75 truth points and 300 requests per version; got ${points.length} and ${plans.length}.`);
  const state = { errors: 0 }, v1 = await testVersion("v1", plans, state);
  const v2 = state.errors < HARD_STOP_ERRORS ? await testVersion("v2", plans, state) : [];
  const v1Summary = summarize(v1), v2Summary = summarize(v2), agreementByRadius = agreement(v1, v2);
  const result = {
    workflow: "P3 low-load locate validation",
    outcome: state.errors >= HARD_STOP_ERRORS ? "HARD_STOP" : (v1.length === 300 && v2.length === 300 ? "COMPLETED" : "INCOMPLETE"),
    source_sha: process.env.GITHUB_SHA ?? "local", project_ref: "buexgewxypvkqmphvfec", seed: 20261030,
    districts: ["Nyarugenge", "Nyamasheke", "Musanze"], points: points.length, samples_per_district: 25,
    indexed_truth_rest_calls: 3, ancestor_chain_rest_calls: 3,
    requests_planned_per_version: plans.length, total_requests_planned: plans.length * 2,
    requests_completed: v1.length + v2.length, total_errors: state.errors, error_hard_stop: HARD_STOP_ERRORS,
    request_spacing_ms: GAP_MS, v1: v1Summary, v2: v2Summary, v1_v2_agreement: agreementByRadius,
    gates: {
      both_versions_300_requests: v1.length === 300 && v2.length === 300,
      errors_lt_10: state.errors < HARD_STOP_ERRORS,
      chosen_correctness_r0_r100_r500_ge_90: [v1Summary, v2Summary].every(group => [0, 100, 500].every(radius => group.find(row => row.radius_m === radius)?.correctness_pct >= 90)),
      chosen_correctness_r2000_ge_85: [v1Summary, v2Summary].every(group => group.find(row => row.radius_m === 2000)?.correctness_pct >= 85),
      empty_zero: [v1Summary, v2Summary].every(group => group.every(row => row.requests > 0 && row.empty === 0)),
      degraded_le_5pct: [v1Summary, v2Summary].every(group => group.every(row => row.requests > 0 && row.degraded / row.requests <= 0.05)),
      v1_p95_le_5000ms: v1Summary.every(row => row.p95_ms !== null && row.p95_ms <= 5000),
      v2_p95_le_3000ms: v2Summary.every(row => row.p95_ms !== null && row.p95_ms <= 3000),
      agreement_r0_r100_ge_98: [0, 100].every(radius => agreementByRadius.find(row => row.radius_m === radius)?.agreement_pct >= 98),
    },
    raw_v1: v1, raw_v2: v2,
  };
  result.all_gates_pass = Object.values(result.gates).every(Boolean);
  result.v2_gates_pass = result.all_gates_pass;
  await mkdir("/tmp", { recursive: true });
  await writeFile("/tmp/p3-low-load-results.json", JSON.stringify(result, null, 2) + "\n");
  console.log("FINAL_RESULT=" + JSON.stringify(result));
  if (!result.all_gates_pass) process.exitCode = 1;
}

main().catch(async error => {
  const result = { workflow: "P3 low-load locate validation", outcome: "FAILED_BEFORE_MEASUREMENTS",
    source_sha: process.env.GITHUB_SHA ?? "local", error: error instanceof Error ? error.message : String(error) };
  await mkdir("/tmp", { recursive: true });
  await writeFile("/tmp/p3-low-load-results.json", JSON.stringify(result, null, 2) + "\n");
  console.error(JSON.stringify(result)); process.exitCode = 1;
});
