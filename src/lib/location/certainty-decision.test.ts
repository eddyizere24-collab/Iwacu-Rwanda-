import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  decideLocationCertainty,
  isDisplacementBeyondCurrentAccuracy,
  type CertaintyLookupResult,
  type LocationCertaintyState,
  type LocationFixMetadata,
} from "./certainty-decision";

// Test-only Rwanda-like administrative codes and names. They are fixtures,
// not production place data, and all RPC statuses below are handwritten.
const confirmedFixLookup: CertaintyLookupResult = {
  needed_m: 60,
  levels: {
    village: {
      status: "confirmed",
      scope_code: "TEST-VILLAGE-A",
      name_kiny: "Umudugudu A (test)",
      name_eng: "Test Village A",
      candidates: [],
    },
    cell: {
      status: "confirmed",
      scope_code: "TEST-CELL-A",
      name_kiny: "Akagari A (test)",
      name_eng: "Test Cell A",
      candidates: [],
    },
    sector: {
      status: "confirmed",
      scope_code: "TEST-SECTOR-A",
      name_kiny: "Umurenge A (test)",
      name_eng: "Test Sector A",
      candidates: [],
    },
    district: {
      status: "confirmed",
      scope_code: "TEST-DISTRICT-A",
      name_kiny: "Akarere A (test)",
      name_eng: "Test District A",
      candidates: [],
    },
    province: {
      status: "confirmed",
      scope_code: "TEST-PROVINCE-A",
      name_kiny: "Intara A (test)",
      name_eng: "Test Province A",
      candidates: [],
    },
  },
};

const twentyMetreBorderLookup: CertaintyLookupResult = {
  needed_m: 60,
  levels: {
    village: {
      status: "near_border",
      scope_code: null,
      name_kiny: null,
      name_eng: null,
      candidates: [
        { scope_code: "TEST-VILLAGE-A", name_kiny: "Umudugudu A (test)", name_eng: "Test Village A", distance_m: 20 },
        { scope_code: "TEST-VILLAGE-B", name_kiny: "Umudugudu B (test)", name_eng: "Test Village B", distance_m: 21 },
      ],
    },
    cell: {
      status: "confirmed",
      scope_code: "TEST-CELL-A",
      name_kiny: "Akagari A (test)",
      name_eng: "Test Cell A",
      candidates: [],
    },
    sector: {
      status: "confirmed",
      scope_code: "TEST-SECTOR-A",
      name_kiny: "Umurenge A (test)",
      name_eng: "Test Sector A",
      candidates: [],
    },
    district: {
      status: "confirmed",
      scope_code: "TEST-DISTRICT-A",
      name_kiny: "Akarere A (test)",
      name_eng: "Test District A",
      candidates: [],
    },
    province: {
      status: "confirmed",
      scope_code: "TEST-PROVINCE-A",
      name_kiny: "Intara A (test)",
      name_eng: "Test Province A",
      candidates: [],
    },
  },
};

const noConfirmableLevelsLookup: CertaintyLookupResult = {
  needed_m: 250_010,
  levels: {
    village: { status: "not_confirmable", scope_code: null, name_kiny: null, name_eng: null, candidates: [] },
    cell: { status: "not_confirmable", scope_code: null, name_kiny: null, name_eng: null, candidates: [] },
    sector: { status: "not_confirmable", scope_code: null, name_kiny: null, name_eng: null, candidates: [] },
    district: { status: "not_confirmable", scope_code: null, name_kiny: null, name_eng: null, candidates: [] },
    province: { status: "not_confirmable", scope_code: null, name_kiny: null, name_eng: null, candidates: [] },
  },
};

function fix(
  timestamp: number,
  accuracyMeters = 10,
  options: Partial<LocationFixMetadata> = {},
): LocationFixMetadata {
  return {
    timestamp,
    accuracyMeters,
    source: "gps",
    latitude: -1.95,
    longitude: 30.06,
    ...options,
  };
}

function cloneLookup(lookup: CertaintyLookupResult): CertaintyLookupResult {
  return JSON.parse(JSON.stringify(lookup)) as CertaintyLookupResult;
}

test("stationary near-border GPS fix 20 m from a village boundary does not name the village on first observation", () => {
  const result = decideLocationCertainty(
    twentyMetreBorderLookup,
    fix(1_000),
    undefined,
    1_000,
  );
  assert.equal(result.levels.village.status, "not_confirmable");
  assert.equal(result.levels.village.rpcStatus, "near_border");
  assert.equal(result.levels.village.name_kiny, undefined);
  assert.equal(result.levels.district.name_kiny, "Akarere A (test)");
});

test("stationary 20 m border case shows the previously double-confirmed village with the other candidate", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000), first.state, 2_000);
  const third = decideLocationCertainty(twentyMetreBorderLookup, fix(3_000), second.state, 3_000);
  assert.equal(third.levels.village.status, "near_border");
  assert.equal(third.levels.village.name_kiny, "Umudugudu A (test)");
  assert.equal(third.levels.village.other_candidate?.name_kiny, "Umudugudu B (test)");
});

test("two distinct stationary fixes confirming the same village unlock its name", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000), undefined, 1_000);
  assert.equal(first.levels.village.status, "not_confirmable");
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000), first.state, 2_000);
  assert.equal(second.levels.village.status, "confirmed");
  assert.equal(second.levels.village.name_kiny, "Umudugudu A (test)");
});

test("two distinct stationary fixes confirming the same cell unlock its name", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000), first.state, 2_000);
  assert.equal(second.levels.cell.status, "confirmed");
  assert.equal(second.levels.cell.name_kiny, "Akagari A (test)");
});

test("inconsistent village confirmations reset the two-fix requirement", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000), undefined, 1_000);
  const changed = cloneLookup(confirmedFixLookup);
  changed.levels.village.scope_code = "TEST-VILLAGE-B";
  changed.levels.village.name_kiny = "Umudugudu B (test)";
  const second = decideLocationCertainty(changed, fix(2_000), first.state, 2_000);
  assert.equal(second.levels.village.status, "not_confirmable");
  assert.equal(second.levels.village.name_kiny, undefined);
});

test("duplicate timestamps do not count as two distinct consistent village fixes", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000), undefined, 1_000);
  const duplicate = decideLocationCertainty(confirmedFixLookup, fix(1_000), first.state, 1_000);
  assert.equal(duplicate.levels.village.status, "not_confirmable");
});

test("weaker stationary GPS fix cannot replace a better still-fresh confirmed village result", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000, 8), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000, 20), first.state, 2_000);
  const weakerLookup = cloneLookup(confirmedFixLookup);
  weakerLookup.levels.village.scope_code = "TEST-VILLAGE-B";
  weakerLookup.levels.village.name_kiny = "Umudugudu B (test)";
  const third = decideLocationCertainty(weakerLookup, fix(3_000, 25), second.state, 3_000);
  assert.equal(third.levels.village.name_kiny, "Umudugudu A (test)");
  assert.equal(third.state.byLevel.village?.accuracyMeters, 8);
});

test("weaker result stops retaining an older confirmation after the five-minute freshness window", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000, 8), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000, 8), first.state, 2_000);
  const later = decideLocationCertainty(
    noConfirmableLevelsLookup,
    fix(302_001, 25),
    second.state,
    302_001,
  );
  assert.equal(later.levels.village.status, "not_confirmable");
});

test("walking speed above one metre per second re-evaluates a changed village instead of freezing the old name", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000), first.state, 2_000);
  const changed = cloneLookup(confirmedFixLookup);
  changed.levels.village.scope_code = "TEST-VILLAGE-B";
  changed.levels.village.name_kiny = "Umudugudu B (test)";
  const third = decideLocationCertainty(
    changed,
    fix(3_000, 12, { speedMetersPerSecond: 1.4 }),
    second.state,
    3_000,
  );
  assert.equal(third.moving, true);
  assert.equal(third.levels.village.status, "not_confirmable");
});

test("GPS movement beyond the current fix accuracy radius triggers immediate re-evaluation", () => {
  const previous = { latitude: -1.95, longitude: 30.06 };
  assert.equal(isDisplacementBeyondCurrentAccuracy(previous, {
    latitude: -1.95,
    longitude: 30.06005,
    accuracyMeters: 5,
  }), true);
  assert.equal(isDisplacementBeyondCurrentAccuracy(previous, {
    latitude: -1.95,
    longitude: 30.06001,
    accuracyMeters: 5,
  }), false);
});

test("position change larger than current accuracy re-evaluates instead of retaining the earlier name", () => {
  const first = decideLocationCertainty(
    confirmedFixLookup,
    fix(1_000, 3, { latitude: -1.95, longitude: 30.06 }),
    undefined,
    1_000,
  );
  const second = decideLocationCertainty(
    confirmedFixLookup,
    fix(2_000, 3, { latitude: -1.95, longitude: 30.06 }),
    first.state,
    2_000,
  );
  const changed = cloneLookup(confirmedFixLookup);
  changed.levels.village.scope_code = "TEST-VILLAGE-B";
  changed.levels.village.name_kiny = "Umudugudu B (test)";
  const third = decideLocationCertainty(
    changed,
    fix(3_000, 3, { latitude: -1.95, longitude: 30.0601 }),
    second.state,
    3_000,
  );
  assert.equal(third.moving, true);
  assert.equal(third.levels.village.status, "not_confirmable");
});

test("network-only fix ignores sector, cell and village even when RPC fixture marks them confirmed", () => {
  const result = decideLocationCertainty(
    confirmedFixLookup,
    fix(1_000, 80, { source: "network" }),
    undefined,
    1_000,
  );
  assert.equal(result.levels.province.status, "confirmed");
  assert.equal(result.levels.district.status, "confirmed");
  assert.equal(result.levels.sector.status, "not_confirmable");
  assert.equal(result.levels.cell.status, "not_confirmable");
  assert.equal(result.levels.village.status, "not_confirmable");
});

test("IP-only fix ignores finer RPC confirmations and keeps only district or province evidence", () => {
  const result = decideLocationCertainty(
    confirmedFixLookup,
    fix(1_000, 90, { source: "ip" }),
    undefined,
    1_000,
  );
  assert.equal(result.levels.village.status, "not_confirmable");
  assert.equal(result.levels.cell.status, "not_confirmable");
  assert.equal(result.levels.sector.status, "not_confirmable");
  assert.equal(result.displayLevel, "district");
});

test("road-side poor GPS response uses only the levels the RPC confirmed", () => {
  const roadLookup: CertaintyLookupResult = {
    needed_m: 760,
    levels: {
      village: { status: "not_confirmable", scope_code: null, name_kiny: null, name_eng: null, candidates: [] },
      cell: { status: "not_confirmable", scope_code: null, name_kiny: null, name_eng: null, candidates: [] },
      sector: { status: "not_confirmable", scope_code: null, name_kiny: null, name_eng: null, candidates: [] },
      district: {
        status: "confirmed",
        scope_code: "TEST-DISTRICT-A",
        name_kiny: "Akarere A (test)",
        name_eng: "Test District A",
        candidates: [],
      },
      province: {
        status: "confirmed",
        scope_code: "TEST-PROVINCE-A",
        name_kiny: "Intara A (test)",
        name_eng: "Test Province A",
        candidates: [],
      },
    },
  };
  const result = decideLocationCertainty(roadLookup, fix(1_000, 300), undefined, 1_000);
  assert.equal(result.levels.village.status, "not_confirmable");
  assert.equal(result.levels.cell.status, "not_confirmable");
  assert.equal(result.displayLevel, "district");
});

test("RPC not_confirmable status suppresses a village name even when other source data could contain it", () => {
  const result = decideLocationCertainty(
    noConfirmableLevelsLookup,
    fix(1_000, 80),
    undefined,
    1_000,
  );
  assert.equal(result.levels.village.status, "not_confirmable");
  assert.equal(result.levels.village.name_kiny, undefined);
  assert.equal(result.searchingForBetterSignal, true);
});

test("missing RPC result does not manufacture any confirmed administrative name", () => {
  const result = decideLocationCertainty(undefined, fix(1_000), undefined, 1_000);
  assert.equal(result.displayLevel, "country");
  assert.equal(result.searchingForBetterSignal, true);
  assert.equal(result.levels.village.status, "not_confirmable");
});

test("no confirmable RPC levels returns country and explicit better-signal state", () => {
  const result = decideLocationCertainty(
    noConfirmableLevelsLookup,
    fix(1_000, 50_000),
    undefined,
    1_000,
  );
  assert.equal(result.displayLevel, "country");
  assert.equal(result.searchingForBetterSignal, true);
});

test("last-known result younger than five minutes can retain its twice-confirmed village name", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000), first.state, 2_000);
  const restored = decideLocationCertainty(
    confirmedFixLookup,
    fix(200_000, 10, { source: "last-known" }),
    second.state,
    200_000,
  );
  assert.equal(restored.lastKnownOnly, false);
  assert.equal(restored.levels.village.status, "confirmed");
});

test("last-known result older than five minutes hides sector, cell and village but may show district and province", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000), first.state, 2_000);
  const restored = decideLocationCertainty(
    confirmedFixLookup,
    fix(2_000, 10, { source: "last-known" }),
    second.state,
    302_001,
  );
  assert.equal(restored.lastKnownOnly, true);
  assert.equal(restored.levels.village.status, "not_confirmable");
  assert.equal(restored.levels.cell.status, "not_confirmable");
  assert.equal(restored.levels.sector.status, "not_confirmable");
  assert.equal(restored.levels.district.status, "confirmed");
  assert.equal(restored.levels.province.status, "confirmed");
});

test("zero-metre accuracy is rejected for certainty naming", () => {
  const result = decideLocationCertainty(confirmedFixLookup, fix(1_000, 0), undefined, 1_000);
  assert.equal(result.levels.village.status, "not_confirmable");
  assert.equal(result.searchingForBetterSignal, true);
});

test("accuracy above the RPC contract maximum cannot name a village", () => {
  const result = decideLocationCertainty(
    confirmedFixLookup,
    fix(1_000, 100_001),
    undefined,
    1_000,
  );
  assert.equal(result.levels.village.status, "not_confirmable");
});

test("the result exposes the current accuracy in metres for the ±N m UI", () => {
  const result = decideLocationCertainty(confirmedFixLookup, fix(1_000, 27), undefined, 1_000);
  assert.equal(result.accuracyMeters, 27);
});

test("near-border province response includes the RPC candidate name and neighbouring candidate", () => {
  const lookup = cloneLookup(confirmedFixLookup);
  lookup.levels.province = {
    status: "near_border",
    scope_code: null,
    name_kiny: null,
    name_eng: null,
    candidates: [
      { scope_code: "TEST-PROVINCE-A", name_kiny: "Intara A (test)" },
      { scope_code: "TEST-PROVINCE-B", name_kiny: "Intara B (test)" },
    ],
  };
  const result = decideLocationCertainty(lookup, fix(1_000), undefined, 1_000);
  assert.equal(result.levels.province.status, "near_border");
  assert.equal(result.levels.province.name_kiny, "Intara A (test)");
  assert.equal(result.levels.province.other_candidate?.name_kiny, "Intara B (test)");
});

test("weak network fix cannot replace a better fresh district confirmation", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000, 40), undefined, 1_000);
  const second = decideLocationCertainty(
    confirmedFixLookup,
    fix(2_000, 250, { source: "network" }),
    first.state,
    2_000,
  );
  assert.equal(second.levels.district.name_kiny, "Akarere A (test)");
  assert.equal(second.state.byLevel.district?.accuracyMeters, 40);
});

test("late older GPS callback does not overwrite a newer fresh confirmation", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(2_000, 10), undefined, 2_000);
  const second = decideLocationCertainty(
    confirmedFixLookup,
    fix(1_500, 5),
    first.state,
    2_000,
  );
  assert.equal(second.levels.district.name_kiny, "Akarere A (test)");
  assert.equal(second.state.byLevel.district?.timestamp, 2_000);
});

test("walking across a 20 m village border toward the other candidate does not freeze the old village name", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000, 4), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000, 4), first.state, 2_000);
  const crossingLookup = cloneLookup(twentyMetreBorderLookup);
  crossingLookup.levels.village.candidates = [
    { scope_code: "TEST-VILLAGE-B", name_kiny: "Umudugudu B (test)", name_eng: "Test Village B", distance_m: 19 },
    { scope_code: "TEST-VILLAGE-A", name_kiny: "Umudugudu A (test)", name_eng: "Test Village A", distance_m: 22 },
  ];
  const third = decideLocationCertainty(
    crossingLookup,
    fix(3_000, 4, { speedMetersPerSecond: 1.2 }),
    second.state,
    3_000,
  );
  assert.equal(third.moving, true);
  assert.equal(third.levels.village.status, "not_confirmable");
  assert.equal(third.levels.village.name_kiny, undefined);
});

test("network fix with only district and province candidates never names a sector", () => {
  const result = decideLocationCertainty(
    noConfirmableLevelsLookup,
    fix(1_000, 500, { source: "network" }),
    undefined,
    1_000,
  );
  assert.equal(result.levels.sector.name_kiny, undefined);
  assert.equal(result.displayLevel, "country");
});

test("a better same-place fix can replace a previous weaker result", () => {
  const first = decideLocationCertainty(confirmedFixLookup, fix(1_000, 80), undefined, 1_000);
  const second = decideLocationCertainty(confirmedFixLookup, fix(2_000, 15), first.state, 2_000);
  assert.equal(second.state.byLevel.district?.accuracyMeters, 15);
  assert.equal(second.levels.district.status, "confirmed");
});

test("near-border candidate alone never satisfies the two-confirmed-fix village rule", () => {
  const first = decideLocationCertainty(twentyMetreBorderLookup, fix(1_000), undefined, 1_000);
  const second = decideLocationCertainty(twentyMetreBorderLookup, fix(2_000), first.state, 2_000);
  assert.equal(second.levels.village.status, "not_confirmable");
  assert.equal(second.levels.village.name_kiny, undefined);
});

const locateRouteSource = readFileSync(new URL("../../app/api/locate/route.ts", import.meta.url), "utf8");
const locationHookSource = readFileSync(new URL("../../hooks/useLocation.ts", import.meta.url), "utf8");

test("location API calls the actual PR 56 RPC contract with its 1.5 second timeout", () => {
  assert.match(locateRouteSource, /rpc\("certainty_lookup_v1",\s*\{[\s\S]*?p_lng:\s*longitude,[\s\S]*?p_lat:\s*latitude,[\s\S]*?p_accuracy_m:\s*parsed\.data\.accuracy/);
  assert.match(locateRouteSource, /p_accuracy_m:\s*parsed\.data\.accuracy,[\s\S]*?\}\)\.abortSignal\(signal\),\s*1_500\)/);
});

test("location API and client fallback both suppress village and cell names without the certainty RPC", () => {
  assert.match(locateRouteSource, /!body\.certainty_lookup[\s\S]*?delete hierarchy\.sector|!body\.certainty_lookup[\s\S]*?delete candidates\.village/);
  assert.match(locationHookSource, /const \{ village: _village, cell: _cell, \.\.\.coarseHierarchy \} = originalHierarchy/);
  assert.match(locationHookSource, /source === "network" \|\| source === "ip"/);
});

test("moving GPS fixes and an outstanding fine-level second confirmation bypass duplicate suppression", () => {
  assert.match(locationHookSource, /speedMetersPerSecond[\s\S]*?> 1/);
  assert.match(locationHookSource, /!movingFast &&\s*!pendingFineConfirmation/);
  assert.match(locationHookSource, /pendingFineConfirmation[\s\S]*?isDuplicateDeviceFix/);
});

test("GPS position change beyond its own accuracy bypasses callback filtering before the RPC request", () => {
  assert.match(locationHookSource, /isDisplacementBeyondCurrentAccuracy\\(previousPublishedFix, incomingFix\\)/);
  assert.match(locationHookSource, /const isMoving = meaningfulMovement \\|\\| movingFast \\|\\| movedBeyondCurrentAccuracy/);
  assert.match(locationHookSource, /!isMoving &&/);
});
