import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("map page is wired to IWACU's own boundaries, leaders and search", () => {
  const component = read("../../components/IkaritaMap.tsx");
  assert.ok(component.includes('"/api/location-map?"'), "village polygons come from IWACU's database");
  assert.ok(component.includes("/api/ikarita/place?scope_code="));
  assert.ok(component.includes("/api/ikarita/search?q="));
  assert.ok(component.includes("PublicLeaderDirectory"), "leaders and their photos/contacts use the shared directory");
  assert.ok(component.includes("bubblingMouseEvents: false"));
  assert.ok(component.includes("lowDataRef.current"), "low-data mode must not auto-download village polygons");
  assert.ok(component.includes("iwacu-map-pick"));
});

test("place RPC only returns public administrative data", () => {
  const sql = read("../../../sql/migrations/20261123_01_ikarita_place_rpc.sql");
  assert.ok(sql.includes("security definer"));
  assert.ok(sql.includes("set search_path to pg_catalog, extensions"));
  assert.ok(sql.includes("revoke all on function public.get_ikarita_place_v1"));
  assert.ok(!/leader|contact|phone/i.test(sql.replace(/^--.*$/gm, "")), "the place RPC must not read leader or contact data");
  const route = read("../../app/api/ikarita/place/route.ts");
  assert.ok(route.includes("SCOPE_CODE.test(scopeCode)"));
});

test("village picker sends visitors to the map page and the home page accepts a chosen place", () => {
  const picker = read("../../components/MapPinPicker.tsx");
  assert.ok(picker.includes('"/ikarita'));
  const home = read("../../app/page.tsx");
  assert.ok(home.includes("iwacu-map-pick"));
  const ai = read("../../components/AiSearchAssistant.tsx");
  assert.ok(ai.includes('"/ikarita?scope="'));
});
