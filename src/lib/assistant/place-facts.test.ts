import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findAdministrativeScopeCodesByName,
  getDistanceUnavailable,
  getPlaceAreaUnavailable,
  getPlaceHierarchyFact,
  getRwandaAdministrativeSummary,
} from "./place-facts";

/**
 * Real codes from public/offline/location-index.json (bundled boundaries hierarchy).
 * Do not use synthetic RW-01-01 style codes — those are not in this index.
 */
const GASABO_DISTRICT = "RW-P1-D12";
const KACYIRU_SECTOR = "RW-P1-D12-S1207";
const KIGALI_PROVINCE = "RW-P1";
const KAMATAMU_CELL = "RW-P1-D12-S1207-C120701";

describe("place-facts hierarchy (offline administrative index)", () => {
  it("resolves a unique administrative unit by its exact name", () => {
    assert.deepEqual(findAdministrativeScopeCodesByName("Gasabo", "district"), [GASABO_DISTRICT]);
    assert.deepEqual(findAdministrativeScopeCodesByName("  gasabo  ", "district"), [GASABO_DISTRICT]);
    assert.ok(findAdministrativeScopeCodesByName("Gasabo").length > 1, "unqualified duplicate names must remain ambiguous");
  });

  it("returns missing for invalid scope code", () => {
    const result = getPlaceHierarchyFact("not-a-code");
    assert.equal(result.status, "missing");
    assert.equal(result.fact, null);
    assert.match(result.message_kiny, /ntabwo yemewe|Ntabwo nshobora/i);
  });

  it("returns missing for unknown but well-formed code", () => {
    const result = getPlaceHierarchyFact("RW-P9-D99");
    assert.equal(result.status, "missing");
    assert.equal(result.fact, null);
  });

  it("returns hierarchy for Gasabo district (RW-P1-D12)", () => {
    const result = getPlaceHierarchyFact(GASABO_DISTRICT);
    assert.equal(result.status, "ok", result.message_kiny);
    assert.ok(result.fact);
    assert.equal(result.fact!.scope_code, GASABO_DISTRICT);
    assert.equal(result.fact!.level, "district");
    assert.equal(result.fact!.name_kiny, "Gasabo");
    // Index has 15 sectors under Gasabo
    assert.equal(result.fact!.child_count, 15);
    assert.equal(result.fact!.child_level, "sector");
    assert.ok(result.fact!.parent);
    assert.equal(result.fact!.parent!.level, "province");
    assert.equal(result.fact!.parent!.scope_code, KIGALI_PROVINCE);
    assert.ok(result.fact!.source_label.length > 10);
    assert.ok(result.fact!.limitations.length >= 1);
    assert.match(result.message_kiny, /Gasabo/i);
  });

  it("returns hierarchy for Kacyiru sector (RW-P1-D12-S1207)", () => {
    const result = getPlaceHierarchyFact(KACYIRU_SECTOR);
    assert.equal(result.status, "ok", result.message_kiny);
    assert.ok(result.fact);
    assert.equal(result.fact!.scope_code, KACYIRU_SECTOR);
    assert.equal(result.fact!.level, "sector");
    assert.equal(result.fact!.name_kiny, "Kacyiru");
    assert.equal(result.fact!.child_level, "cell");
    // Index has 3 cells under Kacyiru
    assert.equal(result.fact!.child_count, 3);
    assert.ok(result.fact!.parent);
    assert.equal(result.fact!.parent!.scope_code, GASABO_DISTRICT);
    assert.equal(result.fact!.parent!.name_kiny, "Gasabo");
  });

  it("returns hierarchy for Kigali province with district children", () => {
    const result = getPlaceHierarchyFact(KIGALI_PROVINCE);
    assert.equal(result.status, "ok", result.message_kiny);
    assert.ok(result.fact);
    assert.equal(result.fact!.level, "province");
    assert.equal(result.fact!.child_level, "district");
    assert.equal(result.fact!.child_count, 3); // Gasabo, Kicukiro, Nyarugenge
    assert.equal(result.fact!.parent, null);
  });

  it("returns hierarchy for a cell with village children", () => {
    const result = getPlaceHierarchyFact(KAMATAMU_CELL);
    assert.equal(result.status, "ok", result.message_kiny);
    assert.ok(result.fact);
    assert.equal(result.fact!.level, "cell");
    assert.equal(result.fact!.child_level, "village");
    assert.ok(result.fact!.child_count >= 1);
    assert.ok(result.fact!.parent);
    assert.equal(result.fact!.parent!.scope_code, KACYIRU_SECTOR);
  });

  it("returns Rwanda-wide administrative counts from the source-stamped Government snapshot", () => {
    const summary = getRwandaAdministrativeSummary();
    assert.ok(summary);
    assert.equal(summary!.counts.province, 4);
    assert.equal(summary!.city_of_kigali, 1);
    assert.equal(summary!.counts.district, 30);
    assert.equal(summary!.counts.sector, 416);
    assert.equal(summary!.counts.cell, 2148);
    assert.equal(summary!.counts.village, 14837);
    assert.match(summary!.source_label, /Government of Rwanda/i);
    assert.equal(summary!.source_url, "https://www.gov.rw/overview");
    assert.ok(summary!.data_date_label.includes("10/11/2026"));
  });

  it("never invents area", () => {
    const result = getPlaceAreaUnavailable(GASABO_DISTRICT);
    assert.equal(result.status, "unavailable");
    assert.equal(result.fact, null);
    assert.match(result.message_kiny, /Ntabwo nzahimba|ntabwo bushobora/i);
  });

  it("never invents distance", () => {
    const result = getDistanceUnavailable(GASABO_DISTRICT, "RW-P2-D21");
    assert.equal(result.status, "unavailable");
    assert.equal(result.fact, null);
    assert.match(result.message_kiny, /Ntabwo nzahimba|ntabwo ishobora/i);
  });
});
