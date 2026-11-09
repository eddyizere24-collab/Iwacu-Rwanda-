import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDistanceUnavailable,
  getPlaceAreaUnavailable,
  getPlaceHierarchyFact,
} from "./place-facts";

describe("place-facts hierarchy (offline NISR index)", () => {
  it("returns missing for invalid scope code", () => {
    const result = getPlaceHierarchyFact("not-a-code");
    assert.equal(result.status, "missing");
    assert.equal(result.fact, null);
    assert.match(result.message_kiny, /ntabwo yemewe|Ntabwo nshobora/i);
  });

  it("returns missing for unknown but well-formed code", () => {
    const result = getPlaceHierarchyFact("RW-99-99-99");
    assert.equal(result.status, "missing");
    assert.equal(result.fact, null);
  });

  it("returns hierarchy for a known district (Gasabo)", () => {
    const result = getPlaceHierarchyFact("RW-01-01");
    assert.equal(result.status, "ok");
    assert.ok(result.fact);
    assert.equal(result.fact!.scope_code, "RW-01-01");
    assert.equal(result.fact!.level, "district");
    assert.ok(result.fact!.child_count >= 1);
    assert.equal(result.fact!.child_level, "sector");
    assert.ok(result.fact!.parent);
    assert.equal(result.fact!.parent!.level, "province");
    assert.ok(result.fact!.source_label.length > 10);
    assert.ok(result.fact!.limitations.length >= 1);
    assert.match(result.message_kiny, /Gasabo|imirenge|Umurenge/i);
  });

  it("returns hierarchy for a known sector (Kacyiru)", () => {
    const result = getPlaceHierarchyFact("RW-01-01-01");
    assert.equal(result.status, "ok");
    assert.ok(result.fact);
    assert.equal(result.fact!.level, "sector");
    assert.equal(result.fact!.child_level, "cell");
    assert.ok(result.fact!.parent);
    assert.equal(result.fact!.parent!.scope_code, "RW-01-01");
  });

  it("never invents area", () => {
    const result = getPlaceAreaUnavailable("RW-01-01");
    assert.equal(result.status, "unavailable");
    assert.equal(result.fact, null);
    assert.match(result.message_kiny, /Ntabwo nzahimba|ntabwo bushobora/i);
  });

  it("never invents distance", () => {
    const result = getDistanceUnavailable("RW-01-01", "RW-02-01");
    assert.equal(result.status, "unavailable");
    assert.equal(result.fact, null);
    assert.match(result.message_kiny, /Ntabwo nzahimba|ntabwo ishobora/i);
  });
});
