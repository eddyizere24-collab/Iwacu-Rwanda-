import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("map page is wired to IWACU's own boundaries, leaders and search", () => {
  const component = read("../../components/IkaritaMap.tsx");
  assert.ok(component.includes("/kigali/index.json"), "Kigali outlines come from IWACU's static pack");
  assert.ok(component.includes("tileUrl("), "other areas load fixed tiles from IWACU's database");
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

test("trip planning uses IWACU's own routing, never an outside service", () => {
  const component = read("../../components/IkaritaMap.tsx");
  assert.ok(component.includes("/api/ikarita/route?"));
  assert.ok(!/google|mapbox|osrm|graphhopper|valhalla/i.test(read("../../app/api/ikarita/route/route.ts").replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")));
  const route = read("../../app/api/ikarita/route/route.ts");
  assert.ok(route.includes("loadRoadGraph(req.nextUrl.origin)"));
  assert.ok(route.includes("lat < -3.0 || lat > -0.8"), "only points inside Rwanda are routed");
  const loader = read("../routing/load-graph.ts");
  assert.ok(loader.includes("/routing/graph.bin.gz"));
});

test("the overlay tile API takes fixed integer tile addresses and is cacheable", () => {
  const route = read("../../app/api/ikarita/overlay/route.ts");
  assert.ok(route.includes("Number.isInteger(ix)") && route.includes("OVERLAY_SIZES_MILLI"));
  assert.ok(route.includes("s-maxage=604800"));
  assert.ok(route.includes("get_ikarita_overlay_v1"));
  const sql = read("../../../sql/migrations/20261124_01_ikarita_overlay_rpc.sql");
  assert.ok(sql.includes("set search_path to pg_catalog, extensions"));
  assert.ok(!/leader|contact|phone/i.test(sql.replace(/^--.*$/gm, "")), "the overlay RPC must not read leader or contact data");
  const script = read("../../../scripts/build-kigali-pack.mjs");
  assert.ok(script.includes("never fail the build") || script.includes("continuing without a pack"));
});

test("village names follow what is on screen, and the Kigali pack is drawn before the slower tiles", () => {
  const component = read("../../components/IkaritaMap.tsx");
  assert.ok(component.includes("syncLabels"), "names are placed per screen, not per loaded tile");
  assert.ok(component.includes("view.intersects(child.getBounds())"), "only pieces in view get a name");
  assert.ok(component.includes('url.startsWith("/kigali/")'), "the static Kigali files go first");
  assert.ok(component.includes("paint(false)"), "Kigali is drawn before the other tiles arrive");
});
