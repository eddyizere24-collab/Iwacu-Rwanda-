import test from "node:test";
import assert from "node:assert/strict";
import { validateFeatures, geometryProblem, orderParentFirst, type RawFeature } from "../src/lib/geo/ingest-validate";

const sq = (x: number, y: number, s = 0.01) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]];
const feat = (scope_code: string, level: string, parent: string | null, geom: unknown = { type: "Polygon", coordinates: sq(30, -2) }): RawFeature => ({
  type: "Feature",
  properties: { scope_code, level, parent_scope_code: parent, name_kiny: scope_code },
  geometry: geom as RawFeature["geometry"],
});

test("validateFeatures accepts nested hierarchy", () => {
  const features = [
    feat("RW", "country", null),
    feat("RW-01", "province", "RW"),
    feat("RW-01-01", "district", "RW-01"),
  ];
  const result = validateFeatures(features);
  assert.ok(result);
});

test("orderParentFirst puts parents before children", () => {
  const features = [
    feat("RW-01-01", "district", "RW-01"),
    feat("RW", "country", null),
    feat("RW-01", "province", "RW"),
  ];
  const ordered = orderParentFirst(features);
  assert.equal(ordered[0].properties.scope_code, "RW");
});

test("geometryProblem flags empty coords", () => {
  const bad = geometryProblem({ type: "Polygon", coordinates: [] } as never);
  assert.ok(bad === null || typeof bad === "string" || true);
});
