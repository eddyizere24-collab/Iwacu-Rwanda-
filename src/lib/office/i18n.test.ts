import test from "node:test";
import assert from "node:assert/strict";
import { DICTS, LANGS, levelKey, parseLang, statusKey, translate } from "./i18n";

test("every language has exactly the same keys and no empty text", () => {
  const base = Object.keys(DICTS.rw).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(DICTS[lang]).sort(), base, lang);
    for (const key of base) assert.ok((DICTS[lang] as Record<string, string>)[key].trim().length > 0, lang + "." + key);
  }
});

test("level and status keys fall back safely", () => {
  assert.equal(levelKey("village", true), "level_village_p");
  assert.equal(levelKey("nonsense"), "level_district");
  assert.equal(statusKey("invited"), "status_invited");
  assert.equal(statusKey("???"), "status_vacant");
  assert.equal(translate("fr", "save"), "Enregistrer");
  assert.equal(parseLang("xx"), "rw");
  assert.equal(parseLang("en"), "en");
});
