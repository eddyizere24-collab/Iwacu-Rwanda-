import assert from "node:assert/strict";
import testCase from "node:test";
import { polygon } from "@turf/turf";
import type { VillageBoundaryFeature } from "./geofence-monitor";
import {
  distanceBetweenFixesMeters,
  findNearestVillageBoundary,
  getChangedAdministrativeLevels,
  getCrossedApproachThreshold,
} from "./geofence-monitor";

function village(
  scopeCode: string,
  name: string,
  west: number,
  east: number
): VillageBoundaryFeature {
  return polygon([[
    [west, -0.001],
    [east, -0.001],
    [east, 0.001],
    [west, 0.001],
    [west, -0.001],
  ]], {
    scope_code: scopeCode,
    name_kiny: name,
  }) as VillageBoundaryFeature;
}

testCase("finds the nearest neighboring official village boundary", () => {
  const left = village("RW-P1-D1-S1-C1-V1", "A", -0.002, 0);
  const right = village("RW-P1-D1-S1-C1-V2", "B", 0, 0.002);
  const result = findNearestVillageBoundary(-0.0005, 0, [left, right]);

  assert.ok(result);
  assert.equal(result.currentScopeCode, "RW-P1-D1-S1-C1-V1");
  assert.equal(result.targetScopeCode, "RW-P1-D1-S1-C1-V2");
  assert.equal(result.targetVillageName, "B");
  assert.ok(result.distanceMeters > 50 && result.distanceMeters < 60);
});

testCase("lists all changed parent levels when the next village is across a sector boundary", () => {
  assert.deepEqual(
    getChangedAdministrativeLevels(
      "RW-P1-D1-S1-C1-V1",
      "RW-P1-D1-S2-C2-V2"
    ),
    ["sector", "cell", "village"]
  );
});

testCase("only emits a crossed distance milestone when accuracy supports it", () => {
  assert.equal(getCrossedApproachThreshold(280, 240, 10), 250);
  assert.equal(getCrossedApproachThreshold(120, 90, 20), 100);
  assert.equal(getCrossedApproachThreshold(60, 40, 20), 50);
  assert.equal(getCrossedApproachThreshold(60, 4, 12), null);
  assert.equal(getCrossedApproachThreshold(40, 10, 3), null);
});

testCase("distance between nearby GPS fixes is measured in metres", () => {
  const distance = distanceBetweenFixesMeters(0, 0, 0, 0.001);
  assert.ok(distance > 110 && distance < 112);
});
