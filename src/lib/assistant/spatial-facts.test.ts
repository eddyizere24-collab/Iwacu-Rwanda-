import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getHierarchyFacts,
  parseSpatialFactsPayload,
} from "./spatial-facts";

const origin = {
  scope_code: "RW-P1-D12",
  name_kiny: "Gasabo",
  level: "district",
};
const goodBase = {
  status: "ok",
  source: "public.boundaries",
  origin,
  area_m2: 429_181_085,
  destination: null,
  distance_m: null,
  distance_method: null,
  neighbors: [
    { scope_code: "RW-TST-D2", name_kiny: "Aho bihana imbibi", level: "district" },
  ],
  data_date: "2026-10-29",
};

describe("spatial-facts", () => {
  it("returns hierarchy from the bundled administrative index", () => {
    const result = getHierarchyFacts("RW-P1-D12");
    assert.equal(result.status, "ok");
    assert.equal(result.fact?.scope_code, "RW-P1-D12");
    assert.equal(typeof result.fact?.child_count, "number");
  });

  it("returns missing for an unknown hierarchy scope", () => {
    const result = getHierarchyFacts("RW-DOES-NOT-EXIST");
    assert.equal(result.status, "missing");
  });

  it("accepts a positive area from the live-boundary RPC contract", () => {
    const result = parseSpatialFactsPayload(goodBase, "RW-P1-D12");
    assert.ok(result);
    assert.equal(result.status, "ok");
    assert.equal(result.area_m2, 429_181_085);
    assert.equal(result.neighbors.length, 1);
    assert.equal(result.data_date, "2026-10-29");
  });

  it("accepts only the expected destination and distance method", () => {
    const payload = {
      ...goodBase,
      destination: {
        scope_code: "RW-P1-D13",
        name_kiny: "Kicukiro",
        level: "district",
      },
      distance_m: 14_862,
      distance_method: "point_on_surface_geography",
    };
    const result = parseSpatialFactsPayload(payload, "RW-P1-D12", "RW-P1-D13");
    assert.ok(result);
    assert.equal(result.status, "ok");
    assert.equal(result.distance_m, 14_862);
    assert.equal(result.destination?.scope_code, "RW-P1-D13");
  });

  it("rejects wrong or fabricated destination, negative, infinite, and missing metres", () => {
    assert.equal(parseSpatialFactsPayload({
      ...goodBase,
      destination: { scope_code: "RW-P1-D99", name_kiny: "Other", level: "district" },
      distance_m: 100,
      distance_method: "point_on_surface_geography",
    }, "RW-P1-D12", "RW-P1-D13"), null);

    assert.equal(parseSpatialFactsPayload({
      ...goodBase,
      destination: { scope_code: "RW-P1-D13", name_kiny: "Kicukiro", level: "district" },
      distance_m: -1,
      distance_method: "point_on_surface_geography",
    }, "RW-P1-D12", "RW-P1-D13"), null);

    assert.equal(parseSpatialFactsPayload({
      ...goodBase,
      destination: { scope_code: "RW-P1-D13", name_kiny: "Kicukiro", level: "district" },
      distance_m: Number.POSITIVE_INFINITY,
      distance_method: "point_on_surface_geography",
    }, "RW-P1-D12", "RW-P1-D13"), null);
  });

  it("rejects wrong scope, wrong source, and invalid area", () => {
    assert.equal(parseSpatialFactsPayload(goodBase, "RW-P1-D13"), null);
    assert.equal(parseSpatialFactsPayload({ ...goodBase, source: "synthetic_fixture" }, "RW-P1-D12"), null);
    assert.equal(parseSpatialFactsPayload({ ...goodBase, area_m2: 0 }, "RW-P1-D12"), null);
  });

  it("maps missing scope responses without inventing spatial values", () => {
    const result = parseSpatialFactsPayload({
      status: "missing",
      source: "public.boundaries",
      scope_code: "RW-P1-D12",
    }, "RW-P1-D12");
    assert.ok(result);
    assert.equal(result.status, "missing");
    assert.equal(result.area_m2, null);
    assert.equal(result.distance_m, null);
  });

  it("filters neighbors to the same administrative level", () => {
    const result = parseSpatialFactsPayload({
      ...goodBase,
      neighbors: [
        { scope_code: "RW-TST-D2", name_kiny: "District neighbor", level: "district" },
        { scope_code: "RW-TST-S1", name_kiny: "Sector neighbor", level: "sector" },
      ],
    }, "RW-P1-D12");
    assert.ok(result);
    assert.deepEqual(result.neighbors.map((item) => item.scope_code), ["RW-TST-D2"]);
  });
});
