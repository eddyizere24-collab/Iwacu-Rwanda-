import assert from "node:assert/strict";
import test from "node:test";
import { searchGazetteer, townCentre } from "./gazetteer";

test("a city name finds the city first, then places that carry the name", () => {
  const hits = searchGazetteer("Huye");
  assert.equal(hits[0].name_kiny, "Huye");
  assert.equal(hits[0].level, "city");
  assert.ok(hits.some((h) => h.level === "stadium"));
});

test("Kigali means downtown, not the far edge of the city", () => {
  const kigali = searchGazetteer("Kigali").find((h) => h.name_kiny === "Kigali" && h.level === "city");
  assert.ok(kigali);
  assert.ok(Math.abs(kigali.lat - -1.9441) < 0.01 && Math.abs(kigali.lng - 30.0619) < 0.01);
  const centre = townCentre("Umujyi wa Kigali", "province");
  assert.ok(centre && Math.abs(centre.lng - 30.0619) < 0.01);
});

test("landmarks are found by typed words, accents and short names", () => {
  assert.ok(searchGazetteer("nyabugogo").some((h) => h.level === "bus_station"));
  assert.ok(searchGazetteer("amahoro stadium").some((h) => h.name_kiny.includes("Amahoro")));
  assert.deepEqual(searchGazetteer("x"), []);
});

test("only provinces and districts get a town centre", () => {
  assert.equal(townCentre("Huye", "sector"), null);
  assert.ok(townCentre("Huye", "district"));
  assert.equal(townCentre("Umudugudu wa Nowhere", "district"), null);
});
