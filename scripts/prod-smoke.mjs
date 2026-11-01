import { mkdir, writeFile } from "node:fs/promises";
import { loadTruthRows } from "./truth.mjs";
import { destination } from "./score.mjs";

const PRIMARY = "https://iwacu-rwanda-2.vercel.app";
const SECONDARY = "https://iwacu-rwanda-2-ahabona.vercel.app";
const PROJECT_URL = "https://buexgewxypvkqmphvfec.supabase.co";
const GAP_MS = 2_100;
const HARD_STOP_ERRORS = 3;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function choosePoints(points) {
  const selectedIdx = [1, 9, 17, 25];
  const selected = [];
  for (const district of ["Nyarugenge", "Nyamasheke", "Musanze"]) {
    const rows = points.filter(point => point.district === district);
    for (const idx of selectedIdx) {
      const point = rows.find(row => Number(row.idx) === idx);
      if (!point) throw new Error(`${district}: truth point idx=${idx} was not found.`);
      selected.push(point);
    }
  }
  if (selected.length !== 12) throw new Error(`Expected 12 truth points; got ${selected.length}.`);
  return selected;
}

function postPlan(points) {
  const rows = [];
  for (const district of ["Nyarugenge", "Nyamasheke", "Musanze"]) {
    const selected = points.filter(point => point.district === district);
    selected.forEach((point, index) => {
      const radius = index < 2 ? 0 : 100;
      const coordinates = destination(point, radius);
      rows.push({
        district: point.district,
        point_idx: point.idx,
        true_village_scope_code: point.true_village_scope_code,
        radius_m: radius,
        ...coordinates,
      });
    });
  }
  return rows;
}

function responseDetails(body) {
  const level = typeof body?.level === "string" ? body.level : "";
  const chosenScopeCode =
    body?.hierarchy?.[level]?.scope_code ??
    body?.per_level_candidates?.[level]?.[0]?.scope_code ??
    "";
  const flags = Array.isArray(body?.flags)
    ? body.flags.filter(value => typeof value === "string")
    : [];
  const source = typeof body?.source === "string" ? body.source : null;
  return { level, chosen_scope_code: chosenScopeCode, flags, source };
}

function isAncestorCorrect(chosen, truth) {
  return Boolean(chosen) && (truth === chosen || truth.startsWith(`${chosen}-`));
}

async function main() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== PROJECT_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Refusing smoke run: allow-listed Supabase URL/key is missing or incorrect.");
  }

  const truth = await loadTruthRows();
  const points = choosePoints(truth);
  const primaryPosts = postPlan(points);
  const secondaryPosts = [
    { point: points.find(p => p.district === "Nyarugenge" && Number(p.idx) === 1), radius: 0 },
    { point: points.find(p => p.district === "Nyamasheke" && Number(p.idx) === 1), radius: 100 },
    { point: points.find(p => p.district === "Musanze" && Number(p.idx) === 1), radius: 0 },
  ].map(({ point, radius }) => {
    if (!point) throw new Error("Missing secondary-host truth point.");
    return {
      district: point.district,
      point_idx: point.idx,
      true_village_scope_code: point.true_village_scope_code,
      radius_m: radius,
      ...destination(point, radius),
    };
  });

  const results = [];
  const state = { errors: 0, wrongPrimary: 0, primaryPosts: 0, http5xx: 0, classifierUnavailable: 0 };
  let previousStart = 0;

  async function runRequest(host, method, path, plan = null, group = "primary") {
    if (state.errors >= HARD_STOP_ERRORS) return false;
    const wait = Math.max(0, previousStart + GAP_MS - Date.now());
    if (wait) await sleep(wait);
    const started = Date.now();
    previousStart = started;
    let status = 0, body = null, fetchError = null;
    try {
      const response = await fetch(`${host}${path}`, {
        method,
        headers: method === "POST"
          ? { "content-type": "application/json", "accept": "application/json" }
          : { "accept": "text/html,application/json" },
        ...(method === "POST" ? {
          body: JSON.stringify({
            latitude: plan.latitude,
            longitude: plan.longitude,
            accuracy: plan.radius_m,
            method: "gps",
          }),
        } : {}),
        signal: AbortSignal.timeout(15_000),
      });
      status = response.status;
      if (method === "POST") {
        const raw = await response.text();
        try { body = JSON.parse(raw); }
        catch { fetchError = "response_not_json"; }
      }
    } catch (error) {
      fetchError = error instanceof Error ? error.message : String(error);
    }
    const latency = Date.now() - started;
    const row = {
      host,
      group,
      method,
      path,
      http_status: status,
      latency_ms: latency,
      ...(plan ? {
        district: plan.district,
        point_idx: plan.point_idx,
        radius_m: plan.radius_m,
        true_village_scope_code: plan.true_village_scope_code,
      } : {}),
      ...(method === "POST" ? responseDetails(body) : {}),
      fetch_error: fetchError,
    };

    let requestError = Boolean(fetchError) || status !== 200;
    if (status >= 500 && status <= 599) state.http5xx += 1;

    if (method === "POST") {
      const detail = responseDetails(body);
      row.correct = isAncestorCorrect(detail.chosen_scope_code, plan.true_village_scope_code);
      row.empty = !detail.level || !detail.chosen_scope_code;
      row.degraded = body?.degraded === true || detail.flags.includes("degraded");
      row.classifier_unavailable = detail.flags.includes("rwanda_classifier_unavailable");
      if (group === "primary") {
        state.primaryPosts += 1;
        if (!row.correct) state.wrongPrimary += 1;
      }
      if (row.classifier_unavailable) state.classifierUnavailable += 1;
      if (body?.status === "error" || row.empty || row.degraded ||
          row.classifier_unavailable || detail.source === "prior") requestError = true;
    }

    row.error = requestError;
    if (requestError) state.errors += 1;
    results.push(row);
    console.log(JSON.stringify({ ...row, total_errors: state.errors }));
    return state.errors < HARD_STOP_ERRORS;
  }

  // Main production hostname: home page plus 12 POSTs (four truth points per district,
  // two at radius 0 m and two at radius 100 m).
  await runRequest(PRIMARY, "GET", "/", null, "primary");
  for (const plan of primaryPosts) {
    if (!(await runRequest(PRIMARY, "POST", "/api/locate", plan, "primary"))) break;
  }

  // Alternate production hostname: home page plus one POST for each district.
  if (state.errors < HARD_STOP_ERRORS) {
    await runRequest(SECONDARY, "GET", "/", null, "secondary");
    for (const plan of secondaryPosts) {
      if (!(await runRequest(SECONDARY, "POST", "/api/locate", plan, "secondary"))) break;
    }
  }

  const primaryRows = results.filter(row => row.group === "primary" && row.method === "POST");
  const rollbackTrigger =
    state.http5xx > 0 ||
    state.wrongPrimary > 2 ||
    state.classifierUnavailable > 0;
  const result = {
    workflow: "IWACU RWANDA 2 production smoke",
    outcome: rollbackTrigger || state.errors >= HARD_STOP_ERRORS ? "ROLLBACK_TRIGGER" : "PASS",
    source_sha: process.env.GITHUB_SHA ?? "local",
    primary_url: PRIMARY,
    secondary_url: SECONDARY,
    request_spacing_ms: GAP_MS,
    hard_stop_errors: HARD_STOP_ERRORS,
    requests_completed: results.length,
    primary_post_completed: primaryRows.length,
    primary_post_planned: 12,
    primary_wrong: state.wrongPrimary,
    total_errors: state.errors,
    http_5xx_count: state.http5xx,
    rwanda_classifier_unavailable_count: state.classifierUnavailable,
    rollback_trigger: rollbackTrigger,
    rollback_reasons: [
      ...(state.http5xx > 0 ? ["http_5xx"] : []),
      ...(state.wrongPrimary > 2 ? ["more_than_2_of_12_primary_post_answers_wrong"] : []),
      ...(state.classifierUnavailable > 0 ? ["rwanda_classifier_unavailable"] : []),
    ],
    raw: results,
  };
  await mkdir("/tmp", { recursive: true });
  await writeFile("/tmp/prod-smoke-results.json", JSON.stringify(result, null, 2) + "\n");
  console.log("FINAL_RESULT=" + JSON.stringify(result));
  if (result.outcome !== "PASS") process.exitCode = 1;
}

main().catch(async error => {
  const result = {
    workflow: "IWACU RWANDA 2 production smoke",
    outcome: "FAILED_BEFORE_OR_DURING_REQUESTS",
    source_sha: process.env.GITHUB_SHA ?? "local",
    error: error instanceof Error ? error.message : String(error),
  };
  await mkdir("/tmp", { recursive: true });
  await writeFile("/tmp/prod-smoke-results.json", JSON.stringify(result, null, 2) + "\n");
  console.error(JSON.stringify(result));
  process.exitCode = 1;
});
