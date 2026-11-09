import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAdjacentScopes,
  getAreaM2,
  getDistanceM,
  getHierarchyFacts,
} from "./spatial-facts";

describe("spatial-facts", () => {
  it("returns hierarchy for Gasabo without inventing area", () => {
    const result = getHierarchyFacts("RW-P1-D12");
    assert.equal(result.status, "ok");
    assert.ok(result.fact);
    assert.equal(result.fact?.scope_code, "RW-P1-D12");
    assert.equal(typeof result.fact?.child_count, "number");
  });

  it("returns missing for unknown scope", () => {
    const result = getHierarchyFacts("RW-DOES-NOT-EXIST");
    assert.equal(result.status, "missing");
  });

  it("area is not_ready and never invents a number", async () => {
    const result = await getAreaM2("RW-P1-D12");
    assert.equal(result.status, "not_ready");
    assert.equal(result.area_m2, null);
    assert.match(result.message_kiny, /Ntabwo nzahimba/i);
  });

  it("distance is not_ready and never invents a number", async () => {
    const result = await getDistanceM("RW-P1-D12", "RW-P1-D12-S1207");
    assert.equal(result.status, "not_ready");
    assert.equal(result.distance_m, null);
    assert.match(result.message_kiny, /Ntabwo nzahimba/i);
  });

  it("adjacency is not_ready without PostGIS", async () => {
    const result = await getAdjacentScopes("RW-P1-D12");
    assert.equal(result.status, "not_ready");
    assert.equal(result.neighbors.length, 0);
  });
});
