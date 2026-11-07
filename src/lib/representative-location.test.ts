import assert from "node:assert/strict";
import test from "node:test";
import { nearestVillageEstimateFromIndex } from "./representative-location";

const choices = [
  ["RW-P1", "Umujyi wa Kigali", "City of Kigali", "province", "RW", -1.95, 30.00],
  ["RW-P1-D11", "Nyarugenge", "Nyarugenge", "district", "RW-P1", -1.97, 30.03],
  ["RW-P1-D11-S1101", "Gitega", "Gitega", "sector", "RW-P1-D11", -1.95, 30.05],
  ["RW-P1-D11-S1101-C110101", "Akabahizi", "Akabahizi", "cell", "RW-P1-D11-S1101", -1.945, 30.052],
  ["RW-P1-D11-S1101-C110101-V11010101", "Gihanga", "Gihanga", "village", "RW-P1-D11-S1101-C110101", -1.944, 30.062],
  ["RW-P1-D11-S1101-C110101-V11010102", "Akabugene", "Akabugene", "village", "RW-P1-D11-S1101-C110101", -1.99, 30.15],
  ["RW-P1-D11-S1101-C110101-V11010103", "Nyamabuye", "Nyamabuye", "village", "RW-P1-D11-S1101-C110101", -2.05, 30.2],
  ["RW-P1-D12", "Gasabo", "Gasabo", "district", "RW-P1", -1.88, 30.15],
  ["RW-P1-D12-S1201", "Remera", "Remera", "sector", "RW-P1-D12", -1.88, 30.16],
  ["RW-P1-D12-S1201-C120101", "Nyarutarama", "Nyarutarama", "cell", "RW-P1-D12-S1201", -1.89, 30.17],
  ["RW-P1-D12-S1201-C120101-V12010101", "Rugando", "Rugando", "village", "RW-P1-D12-S1201-C120101", -1.90, 30.18],
];

test("uses real index villages and marks the result as an estimate", () => {
  const result = nearestVillageEstimateFromIndex(
    { version: 2, fields: ["scope_code", "name_kiny", "name_eng", "level", "parent_scope_code", "latitude", "longitude"], choices },
    -1.9441,
    30.0619,
    100,
  );
  assert.ok(result);
  assert.equal(result.status, "success");
  assert.equal(result.source, "nearest");
  assert.equal(result.warning, "NEAREST_VILLAGE_REPRESENTATIVE_POINT_ESTIMATE");
  assert.deepEqual(result.matches, []);
  assert.equal(result.hierarchy.village, undefined);
  assert.equal(result.hierarchy.cell?.scope_code, "RW-P1-D11-S1101-C110101");
  assert.equal(result.hierarchy.sector?.scope_code, "RW-P1-D11-S1101");
  assert.equal(result.hierarchy.district?.scope_code, "RW-P1-D11");
  assert.equal(result.hierarchy.province?.scope_code, "RW-P1");
});

test("representative-point fallback returns admin units only, never an exact village", () => {
  const result = nearestVillageEstimateFromIndex({ choices }, -1.9441, 30.0619, 100);
  assert.ok(result);
  assert.deepEqual(result.matches, []);
  assert.equal(result.hierarchy.village, undefined);
  assert.equal(result.hierarchyCandidates?.village, undefined);
  assert.equal(result.hierarchyCandidates?.district?.length, 1);
  assert.equal(result.hierarchyCandidates?.district?.[0]?.scope_code, "RW-P1-D11");
});

test("returns null for invalid or remote coordinates instead of guessing a Rwanda village", () => {
  assert.equal(nearestVillageEstimateFromIndex({ choices }, 91, 30), null);
  assert.equal(nearestVillageEstimateFromIndex({ choices }, 0, 0, 1_000), null);
  assert.equal(
    nearestVillageEstimateFromIndex({
      choices: [["RW-P1-D11-S1101-C110101-V11010101", "Gihanga", "Gihanga", "village", "RW-P1-D11-S1101-C110101"]],
    }, -1.9441, 30.0619),
    null,
  );
});

test("supports object-shaped choices but still avoids a false village claim", () => {
  const result = nearestVillageEstimateFromIndex({
    choices: [{
      scope_code: "RW-P1-D11-S1101-C110101-V11010101",
      name_kiny: "Gihanga",
      name_eng: "Gihanga",
      level: "village",
      parent_scope_code: "RW-P1-D11-S1101-C110101",
      latitude: -1.944,
      longitude: 30.062,
    }],
  }, -1.9441, 30.0619);
  assert.ok(result);
  assert.deepEqual(result.matches, []);
  assert.equal(result.hierarchy.village, undefined);
  assert.deepEqual(result.hierarchy, {});
});

test("wide uncertainty is included in weighting and never becomes an exact village", () => {
  const result = nearestVillageEstimateFromIndex({ choices }, -1.9441, 30.0619, 50_000);
  if (result) {
    assert.equal(result.status, "success");
    assert.deepEqual(result.matches, []);
    assert.equal(result.hierarchy.village, undefined);
    assert.equal(result.hierarchy.cell, undefined);
    assert.equal(result.hierarchy.sector, undefined);
  }
});

test("keeps only supported administrative levels for moderate fallback radii", () => {
  for (const accuracy of [100, 500, 2_000, 5_000, 10_000]) {
    const result = nearestVillageEstimateFromIndex({ choices }, -1.9441, 30.0619, accuracy);
    assert.ok(result, `missing local admin answer at accuracy ${accuracy} m`);
    assert.equal(result.status, "success");
    assert.deepEqual(result.matches, []);
    assert.ok(result.hierarchy.province);
    assert.equal(result.hierarchy.village, undefined);
  }
  for (const accuracy of [20_000, 50_000]) {
    const result = nearestVillageEstimateFromIndex({ choices }, -1.9441, 30.0619, accuracy);
    if (!result) continue;
    assert.deepEqual(result.matches, []);
    assert.equal(result.hierarchy.village, undefined);
    assert.equal(result.hierarchy.cell, undefined);
    assert.equal(result.hierarchy.sector, undefined);
  }
});
