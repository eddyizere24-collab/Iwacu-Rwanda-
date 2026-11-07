import assert from "node:assert/strict";
import test from "node:test";
import { getAdministrativeUnitChoices } from "./administrative-units";

const payload = {
  choices: [
    ["RW-P1", "Umujyi wa Kigali", "City of Kigali", "province", null, -1.9, 30.0],
    ["RW-P2", "Intara y'Amajyepfo", "Southern Province", "province", null, -2.5, 29.7],
    ["RW-P1-D11", "Nyarugenge", "Nyarugenge", "district", "RW-P1", -1.9, 30.0],
    ["RW-P1-D12", "Gasabo", "Gasabo", "district", "RW-P1", -1.8, 30.1],
    ["RW-P2-D21", "Huye", "Huye", "district", "RW-P2", -2.5, 29.7],
    ["RW-P1-D11-S1101", "Gitega", "Gitega", "sector", "RW-P1-D11", -1.9, 30.0],
    ["RW-P1-D11-S1101-C110101", "Akabahizi", "Akabahizi", "cell", "RW-P1-D11-S1101", -1.9, 30.0],
    ["RW-P1-D11-S1101-C110101-V11010101", "Gihanga", "Gihanga", "village", "RW-P1-D11-S1101-C110101", -1.9, 30.0],
    ["RW-P1-D11-S1101-C110101-V11010102", "Izuba", "Sunrise", "village", "RW-P1-D11-S1101-C110101", -1.9, 30.0],
    ["RW", "U Rwanda", "Rwanda", "country", null, -2.0, 30.0],
  ],
};

test("loads all five province rows from the bundled index", () => {
  const provinces = getAdministrativeUnitChoices(payload, "province");
  assert.equal(provinces.length, 2);
  assert.equal(provinces[0].id, "RW-P1");
  assert.equal(provinces[0].parent_id, null);
});

test("each child level is filtered by its canonical parent scope code", () => {
  const districts = getAdministrativeUnitChoices(payload, "district", "RW-P1");
  assert.deepEqual(districts.map((item) => item.scope_code), ["RW-P1-D12", "RW-P1-D11"]);
  const sectors = getAdministrativeUnitChoices(payload, "sector", "RW-P1-D11");
  assert.equal(sectors.length, 1);
  const cells = getAdministrativeUnitChoices(payload, "cell", "RW-P1-D11-S1101");
  assert.equal(cells[0]?.scope_code, "RW-P1-D11-S1101-C110101");
  const villages = getAdministrativeUnitChoices(payload, "village", "RW-P1-D11-S1101-C110101");
  assert.deepEqual(villages.map((item) => item.scope_code), [
    "RW-P1-D11-S1101-C110101-V11010101",
    "RW-P1-D11-S1101-C110101-V11010102",
  ]);
});

test("does not require database UUIDs for parent-child navigation", () => {
  const province = getAdministrativeUnitChoices(payload, "province")[0];
  const district = getAdministrativeUnitChoices(payload, "district", province.id)[0];
  const sector = getAdministrativeUnitChoices(payload, "sector", district.id)[0];
  const cell = getAdministrativeUnitChoices(payload, "cell", sector.id)[0];
  const village = getAdministrativeUnitChoices(payload, "village", cell.id)[0];
  assert.equal(village.scope_code, "RW-P1-D11-S1101-C110101-V11010101");
});

test("search ignores case and diacritics, and filters within the selected parent", () => {
  const results = getAdministrativeUnitChoices(payload, "village", "RW-P1-D11-S1101-C110101", "IZU");
  assert.equal(results.length, 1);
  assert.equal(results[0].name_kiny, "Izuba");
});

test("rejects invalid parent codes, wrong levels and malformed index rows", () => {
  assert.deepEqual(getAdministrativeUnitChoices(payload, "district"), []);
  assert.deepEqual(getAdministrativeUnitChoices(payload, "village", "not-a-scope-code"), []);
  assert.deepEqual(getAdministrativeUnitChoices(payload, "province", "RW-P1"), []);
  assert.deepEqual(getAdministrativeUnitChoices({ choices: [["broken"]] }, "province"), []);
});
