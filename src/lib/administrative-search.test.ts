import assert from "node:assert/strict";
import test from "node:test";
import index from "../../public/offline/location-index.json";
import { distanceMeters, orderForPerson, searchAdministrativeUnits } from "./administrative-search";

test("every place called Gihembe is returned, with the places above it", () => {
  const result = searchAdministrativeUnits(index, "gihembe");
  const exact = result.units.filter((u) => u.tier === 0);
  assert.ok(exact.length >= 4);
  assert.ok(exact.every((u) => u.name_kiny === "Gihembe"));
  assert.ok(exact.some((u) => u.level === "cell") && exact.some((u) => u.level === "village"));
  assert.ok(exact.every((u) => u.path.length >= 2 && u.path[0].level === "province"));
  assert.ok(new Set(exact.map((u) => u.path[0].scope_code)).size >= 2, "different provinces are told apart");
});

test("words naming a place above narrow the list; level words are hints", () => {
  const all = searchAdministrativeUnits(index, "gihembe").units.filter((u) => u.tier === 0);
  const north = all.find((u) => u.path[0].name_kiny.includes("Amajyaruguru"))!;
  const narrowed = searchAdministrativeUnits(index, "gihembe " + north.path[1].name_kiny);
  assert.ok(narrowed.units.length >= 1 && narrowed.units.length < all.length + 1);
  assert.ok(narrowed.units.every((u) => u.path.some((p) => p.scope_code === north.path[1].scope_code)));
  const village = searchAdministrativeUnits(index, "umudugudu gihembe").units[0];
  assert.equal(village.level, "village");
});

test("big areas are found too, from province to village", () => {
  assert.equal(searchAdministrativeUnits(index, "Umujyi wa Kigali").units[0].level, "province");
  assert.equal(searchAdministrativeUnits(index, "gasabo").units[0].level, "district");
  assert.ok(searchAdministrativeUnits(index, "Kimironko").units.some((u) => u.level === "sector"));
  assert.equal(searchAdministrativeUnits(index, "intara").units.length, 5);
});

test("a small spelling slip still finds the place; nonsense finds nothing", () => {
  assert.ok(searchAdministrativeUnits(index, "Nyarugnge").units.some((u) => u.name_kiny === "Nyarugenge"));
  assert.equal(searchAdministrativeUnits(index, "qzxqzxq").units.length, 0);
  assert.equal(searchAdministrativeUnits(index, "x").units.length, 0);
});

test("the nearest place with the same name comes first when the position is known", () => {
  const units = searchAdministrativeUnits(index, "kabeza").units.filter((u) => u.tier === 0 && u.level === "village");
  assert.ok(units.length > 50);
  const here = { lat: units[10].lat!, lng: units[10].lng! };
  const ordered = orderForPerson(units, here);
  assert.equal(ordered[0].scope_code, units[10].scope_code);
  for (let i = 1; i < ordered.length; i += 1) assert.ok(ordered[i].meters! >= ordered[i - 1].meters!);
  const within = orderForPerson(units, null, units[20].path[2].scope_code);
  assert.ok(within[0].scope_code.startsWith(units[20].path[2].scope_code));
  assert.ok(Math.abs(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111195) < 500);
});
