import assert from "node:assert/strict";
import test from "node:test";
import { intlLocale, normalizeLocale, translateText } from "./i18n";

test("defaults unknown and missing language preferences to Kinyarwanda", () => {
  assert.equal(normalizeLocale(undefined), "rw");
  assert.equal(normalizeLocale("rw"), "rw");
  assert.equal(normalizeLocale("xx"), "rw");
});

test("recognizes the three supported locales", () => {
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("fr"), "fr");
  assert.equal(intlLocale("rw"), "rw-RW");
  assert.equal(intlLocale("en"), "en-GB");
  assert.equal(intlLocale("fr"), "fr-FR");
});

test("translates the headline and primary location action", () => {
  assert.equal(translateText("Menya aho uri.", "rw"), "Menya aho uri.");
  assert.equal(translateText("Menya aho uri.", "en"), "Find your location.");
  assert.equal(translateText("Menya aho uri.", "fr"), "Trouvez votre position.");
  assert.equal(translateText("Menya aho uri", "en"), "Find your location");
});

test("translates notification archive and emergency controls", () => {
  assert.equal(translateText("Amamenyesha yawe", "en"), "Your notifications");
  assert.equal(translateText("Amamenyesha yawe", "fr"), "Vos notifications");
  assert.equal(translateText("Hamagara 112", "en"), "Call 112");
  assert.equal(translateText("Hamagara 112", "fr"), "Appeler le 112");
});

test("translates dynamic confidence, leader count and search-level text", () => {
  assert.equal(translateText("Icyizere: 87%", "en"), "Confidence: 87%");
  assert.equal(translateText("Icyizere: 87%", "fr"), "Confiance : 87%");
  assert.equal(translateText("Abayobozi babonetse muri aka gace (3):", "en"), "Leaders found in this area (3):");
  assert.equal(translateText("Shakisha Akarere (ushatse)…", "en"), "Search district (optional)…");
});

test("translates dynamic location transition messages but preserves place names", () => {
  const current = "Ubu uri: Akarere: Gasabo · Umurenge: Kacyiru.";
  assert.equal(translateText(current, "en"), "You are now in: District: Gasabo · Sector: Kacyiru.");
  assert.equal(translateText(current, "fr"), "Vous êtes actuellement à : District: Gasabo · Secteur: Kacyiru.");
});

test("does not translate proper place names in administrative paths", () => {
  const path = "Intara: Intara y'Amajyaruguru · Akarere: Musanze";
  assert.equal(translateText("Ubu uri: " + path + ".", "en"), "You are now in: Province: Intara y'Amajyaruguru · District: Musanze.");
});

test("translates saved welcome and approach notifications", () => {
  assert.equal(
    translateText("Murakaza neza! Ubu uri: Akarere: Gasabo.", "en"),
    "Welcome! You are now in: District: Gasabo."
  );
  assert.equal(
    translateText("Usigaje hafi ya metero 250 ngo winjire mu gace muturanye. Umurenge: Kacyiru. GPS accuracy: ±20 m.", "en"),
    "About 250 metres remain before you enter the neighbouring area. Sector: Kacyiru. GPS accuracy: ±20 m."
  );
  assert.equal(
    translateText("IWACU RWANDA — Uri hafi y'imbibi", "fr"),
    "IWACU RWANDA — À proximité d'une limite"
  );
});
