import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLocateConfidenceRpcName } from "./locate-protection";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const hook = readFileSync(new URL("../hooks/useLocation.ts", import.meta.url), "utf8");
const picker = readFileSync(new URL("../components/VillagePicker.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/api/locate/route.ts", import.meta.url), "utf8");
const landmarks = readFileSync(new URL("../components/NearbyLandmarks.tsx", import.meta.url), "utf8");
const contextRoute = readFileSync(new URL("../app/api/location-context/route.ts", import.meta.url), "utf8");
const featureFlags = readFileSync(new URL("./feature-flags.ts", import.meta.url), "utf8");
const packageJson = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../../.github/workflows/location-engine-checks.yml", import.meta.url), "utf8");
const report = readFileSync(new URL("../components/LocationReportButton.tsx", import.meta.url), "utf8");
const locationLeaderResults = readFileSync(new URL("../components/LocationLeaderResults.tsx", import.meta.url), "utf8");

test("automatic location, not the picker, is the primary path", () => {
  assert.match(page, /<LocationButton/);
  assert.match(page, /<MapPinPicker/);
  assert.match(page, /Si hano\? Hindura/);
  assert.match(page, /<details[\s\S]*?<VillagePicker/);
});

test("location results pair candidate places with leaders while keeping photos lightweight", () => {
  assert.ok(page.includes("<LocationLeaderResults data={data} onChooseVillage={chooseVillage} />"));
  assert.ok(locationLeaderResults.includes("candidates.items.map"));
  assert.ok(locationLeaderResults.includes("data.leaders ?? []"));
  assert.ok(locationLeaderResults.includes("unique.set(a.id, leader)"));
  assert.ok(locationLeaderResults.includes("sizes=\"44px\""));
  assert.ok(locationLeaderResults.includes("quality={45}"));
  assert.ok(locationLeaderResults.includes('loading="lazy"'));
  assert.ok(locationLeaderResults.includes("setPhotoLeader(leader)"));
  assert.ok(locationLeaderResults.includes("setSelectedLeader(leader)"));
  assert.ok(locationLeaderResults.includes("getSelectionMethod(data.source)"));
  assert.ok(locationLeaderResults.includes("onChooseVillage(candidate.scope_code, selectionMethod)"));
  assert.ok(locationLeaderResults.includes("OFFICIAL_ROLES_BY_LEVEL"));
  assert.ok(locationLeaderResults.includes("isOfficialLeaderForLevel(leader)"));
  assert.doesNotMatch(locationLeaderResults, /province:\s*\[|province:\s*"Other"/);
  assert.doesNotMatch(api, /codes\.add\(hierarchy\.province\.scope_code\)/);

  assert.ok(api.includes("const leaders = await fetchLeadersMasked(supabase, leaderScopeCodes)"));
  assert.ok(api.includes("email: null,"));
  assert.doesNotMatch(api.slice(api.indexOf("async function fetchLeadersMasked"), api.indexOf("function classifierFallbackFlags")), /email,/);
});

test("GPS, IP and last-confirmed prior start with the first location attempt", () => {
  assert.ok(hook.includes("lastConfirmedPriorPromise"));
  assert.ok(hook.includes("void submitIpEstimate();"));
  assert.ok(hook.includes("maximumAge: 60_000"));
  assert.ok(hook.includes("setTimeout(resolve, 3_000)"));
  assert.match(hook, /getCurrentPosition\([\s\S]*?enableHighAccuracy: false/);
  assert.match(hook, /watchPosition\([\s\S]*?enableHighAccuracy: true/);
  assert.ok(hook.includes("allowIndoorGpsCandidate"));
  assert.ok(hook.includes("gpsCenterPointOverride"));
  assert.ok(hook.includes("protectGpsCenterPoint"));
});

test("picker is database-first and never invokes /api/locate or live NISR", () => {
  assert.ok(picker.includes("/api/administrative-units?"));
  assert.ok(picker.includes('params.set("parent_id", parentId)'));
  assert.ok(picker.includes('const CACHE_PREFIX = "iwacu-db-picker-v4:"'));
  assert.ok(picker.includes("item.level === level"));
  assert.ok(picker.includes("item.parent_id === parentId"));
  assert.ok(picker.includes("return cached ?? []"));
  assert.doesNotMatch(picker, /\/api\/locate/);
  assert.doesNotMatch(picker, /gis-server\.statistics\.gov\.rw/);
});

test("landmarks feature is OFF by default and does not render or request when disabled", () => {
  assert.ok(featureFlags.includes('return value === "true"'));
  assert.ok(landmarks.includes("if (!isLandmarksFeatureEnabled()) return null;"));
  assert.ok(landmarks.includes("runLandmarksRequest"));
  assert.ok(contextRoute.includes("if (!isLandmarksFeatureEnabled())"));
  assert.ok(contextRoute.includes("{ disabled: true, status: \"disabled\""));
});

test("release RPC defaults are v2; only confidence RPC remains environment-selectable", () => {
  assert.ok(api.includes('const CLASSIFIER_RPC = "classify_rwanda_coordinate_v2";'));
  assert.doesNotMatch(api, /RWANDA_CLASSIFIER_RPC/);
  assert.equal(getLocateConfidenceRpcName(undefined), "calculate_location_confidence_v2");
  assert.equal(getLocateConfidenceRpcName("v1"), "calculate_location_confidence");
});

test("location route combines the v2 classifier flow with P3 protections", () => {
  assert.ok(api.includes('const CLASSIFIER_RPC = "classify_rwanda_coordinate_v2";'));
  assert.ok(api.includes("LOCATE_CONFIDENCE_RPC = getLocateConfidenceRpcName(process.env.LOCATE_CONFIDENCE_RPC)"));
  assert.ok(api.includes("callRpcWithTimeout"));
  assert.ok(api.includes("consumeLocateRateLimit(req)"));
  assert.ok(api.includes("locateResponseCache"));
  assert.ok(api.includes("isBorderZoneCandidate(state.classification, accuracy)"));
  assert.ok(api.includes("capBorderZoneHierarchyAtSector("));
  assert.ok(api.includes("outside_rwanda: true"));
  assert.doesNotMatch(api, /nearest_border_district_code/);
  assert.ok(api.includes('...(borderZone ? ["border_zone"] : [])'));
  assert.ok(api.includes("row.no_village_mass"));
  assert.ok(api.includes("const containedRows = realRows.filter"));
  assert.ok(api.includes("const hierarchyRows = [...containedRows]"));
  assert.ok(api.includes("buildHierarchicalSummary("));
  assert.ok(api.includes("centerPointVillage?.scope_code ?? null"));
  assert.ok(api.includes("backoffLocation("));
  assert.ok(api.includes("supported_probability"));
  assert.ok(api.includes("center_point_in_village_polygon"));
  assert.ok(api.includes("p_accuracy_m: 0"));
  assert.ok(api.includes("centerPointVillageScopeCode"));
  assert.ok(locationLeaderResults.includes("GPS iri muri uyu mudugudu"));
  assert.ok(api.includes("per_level_candidates: calibratedCandidates"));
  assert.ok(api.includes("commit_sha: process.env.VERCEL_GIT_COMMIT_SHA"));
});

test("AI location lookup uses search_places only; the legacy NISR and service-role helpers are gone", () => {
  // CHANGED 2026-11-01 CLAUDE-PATCH: legacy helpers were deleted (independence rule); see docs/HANDOFF.md.
  const ai = readFileSync(new URL("../app/api/ai-router/route.ts", import.meta.url), "utf8");
  assert.ok(ai.includes('supabase.rpc("search_places"'));
  assert.equal((ai.match(/findOfficialUnit/g) ?? []).length, 0);
  assert.equal((ai.match(/fetchLeadersForUnit/g) ?? []).length, 0);
  assert.equal((ai.match(/createSupabaseServiceClient/g) ?? []).length, 0);
});

test("map overlay uses database geometry and canonical village scope IDs", () => {
  const mapRoute = readFileSync(new URL("../app/api/location-map/route.ts", import.meta.url), "utf8");
  const mapPicker = readFileSync(new URL("../components/MapPinPicker.tsx", import.meta.url), "utf8");
  assert.ok(mapRoute.includes('rpc("get_location_map_overlay"'));
  assert.ok(mapRoute.includes("properties.scope_code"));
  assert.ok(mapRoute.includes("id: scopeCode || feature.id"));
  assert.ok(mapPicker.includes('fetch("/api/location-map?"'));
  assert.ok(mapPicker.includes('layer.on("click"'));
  assert.ok(mapPicker.includes("onSelect(selected.latitude, selected.longitude, 200)"));
});

test("accuracy-rejection guard has an npm command and a CI step", () => {
  const checker = readFileSync(new URL("../../scripts/check-no-accuracy-rejection.mjs", import.meta.url), "utf8");
  assert.ok(checker.includes("MAX_" + "ACCURACY"));
  assert.ok(checker.includes("fixed numeric accuracy/radius comparison is forbidden"));
  assert.ok(packageJson.includes('"check:no-accuracy-rejection": "node scripts/check-no-accuracy-rejection.mjs"'));
  assert.ok(workflow.includes("Accuracy rejection JavaScript guard"));
  assert.ok(workflow.includes("npm run check:no-accuracy-rejection"));
});

test("unexpected locate errors continue to the best village fallback and expose classifier failures", () => {
  assert.ok(api.includes("fallbackCoordinates"));
  assert.ok(api.includes("classifierFallbackFlags(classifierUnavailable, classifierErrorCode)"));
  assert.ok(api.includes('withLocationResponseContract(createRwandaProvincePrior(method === "ip"), [method, ...extraFlags])'));
  assert.ok(api.includes('"classifier_unavailable"'));
  assert.ok(api.includes('"classifier_error_code="'));
  assert.doesNotMatch(api, /\{ status: 502 \}/);
});

test("copyable phone report contains percentages, timings and commit SHA", () => {
  assert.ok(page.includes("<LocationReportButton data={data} />"));
  assert.ok(report.includes("percentages,"));
  assert.ok(report.includes("timings_ms:"));
  assert.ok(report.includes("commit_sha:"));
  assert.ok(report.includes("score_note:"));
});

test("zero-metre accuracy is accepted and large measured radii are not gated by 45km", () => {
  assert.ok(api.includes("accuracy: z.number().finite().nonnegative()"));
  assert.ok(hook.includes("Math.max(0, Number.isFinite(rawAccuracy)"));
  assert.doesNotMatch(hook, /LOW_INFORMATION_RADIUS_METERS/);
  assert.ok(hook.includes("hasMeasuredFix"));
  assert.ok(hook.includes("trackAsBestFix = true"));
  assert.ok(hook.includes("if (value && !controller.signal.aborted && !hasMeasuredFix)"));
});

test("accuracy guard flags named constants and documents the precise UI-only allow-list", () => {
  const checker = readFileSync(new URL("../../scripts/check-no-accuracy-rejection.mjs", import.meta.url), "utf8");
  assert.ok(checker.includes("namedConstantAccuracyGuard"));
  assert.ok(checker.includes("NAMED_GUARD_ALLOWLIST"));
  assert.ok(checker.includes("notice text only; no fix rejection or request suppression"));
});
