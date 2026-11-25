import assert from "node:assert/strict";
import test from "node:test";
import { rankForMap } from "./search-rank";

const row = (name_kiny: string, level: string) => ({ name_kiny, level });

test("a bare city name puts the city or province first, villages last", () => {
  const rows = [row("Kigali", "village"), row("Kigali", "sector"), row("Kigali", "cell"), row("Umujyi wa Kigali", "province"), row("Kigali", "village")];
  const ranked = rankForMap(rows, "Kigali");
  assert.equal(ranked[0].level, "province");
  assert.deepEqual(ranked.map((r) => r.level), ["province", "sector", "cell", "village", "village"]);
});

test("exact names beat names that only start with the query", () => {
  const ranked = rankForMap([row("Kigalimbo", "district"), row("Kigali", "village")], "kigali");
  assert.equal(ranked[0].name_kiny, "Kigali");
});

test("accents and capital letters do not matter", () => {
  const ranked = rankForMap([row("Nyabugogo", "cell"), row("Nyabugogo", "village")], "NYABUGOGO");
  assert.equal(ranked[0].level, "cell");
});
