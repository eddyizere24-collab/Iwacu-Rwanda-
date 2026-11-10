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


test("translates core Ishakiro identity and capability answers", () => {
  const identity = "Ndi Ishakiro ry'Ubuhanga rya IWACU RWANDA, umufasha wa AI wagenewe kugufasha kubona no gusobanukirwa amakuru y'ahantu n'inzego z'ubuyobozi mu Rwanda, abayobozi n'amakuru y'ubutabazi. Nshobora gusubiza ibyo amakuru yagenzuwe ashyigikira; iyo amakuru abuze cyangwa ntizeye igisubizo, ndabikubwira aho kugira ngo mpimbe.";
  const english = translateText(identity, "en");
  const french = translateText(identity, "fr");
  assert.match(english, /^I am Ishakiro/);
  assert.match(english, /verified information/);
  assert.match(english, /rather than inventing it/);
  assert.match(french, /^Je suis Ishakiro/);
  assert.match(french, /informations vérifiées/);
  assert.match(french, /au lieu de les inventer/);

  const help = "Nshobora kugufasha kumenya aho uri, gushaka ahantu mu Rwanda, kubona abayobozi n'itumanaho ryabo igihe amakuru yabo yemejwe abitswe, kubona nimero z'ubutabazi, kumenya umubare w'inzego z'ubuyobozi, kubara ubuso bw'ahantu, kureba ahantu hahana imbibi no kugereranya intera yo mu murongo ugororotse hagati y'ahantu habiri. Ibyapa biri hafi y'aho uri ntibiraboneka kuko nta rutonde rw'ibyapa n'imyanya yabyo rwemejwe turafite. Ubushakashatsi bwo hanze buracyafunze. Igihe amakuru cyangwa igikoresho bitabonetse, ndabikubwira aho guhanga igisubizo.";
  assert.match(translateText(help, "en"), /Nearby road-sign lookup is not available/);
  assert.match(translateText(help, "fr"), /La recherche des panneaux routiers à proximité n'est pas disponible/);
});

test("translates national administrative totals and preserves Kigali City as separate from provinces", () => {
  const districtCount = "U Rwanda rufite 30 uturere. Imibare y'ibindi byiciro igaragazwa ku rubuga rwa Guverinoma: 4 intara, Umujyi wa Kigali 1, 30 uturere, 416 imirenge, 2,148 utugari, 14,837 imidugudu.";
  const english = translateText(districtCount, "en");
  const french = translateText(districtCount, "fr");
  assert.equal(english, "Rwanda has 30 districts. The Government website lists these administrative totals: 4 provinces, 1 City of Kigali, 30 districts, 416 sectors, 2,148 cells and 14,837 villages.");
  assert.equal(french, "Le Rwanda compte 30 districts. Les chiffres administratifs publiés sur le site du Gouvernement sont : 4 provinces, 1 Ville de Kigali, 30 districts, 416 secteurs, 2 148 cellules et 14 837 villages.");

  const provinceCount = "U Rwanda rufite intara 4. Umujyi wa Kigali uri ku rwego rumwe n'intara ariko si intara. Imibare y'ibindi byiciro igaragazwa ku rubuga rwa Guverinoma: 4 intara, Umujyi wa Kigali 1, 30 uturere, 416 imirenge, 2,148 utugari, 14,837 imidugudu.";
  assert.match(translateText(provinceCount, "en"), /Kigali City is at the same administrative level as a province, but it is not a province/);
  assert.match(translateText(provinceCount, "fr"), /La Ville de Kigali se situe au même niveau administratif qu'une province, mais ce n'est pas une province/);
});

test("translates dynamic Ishakiro place and leader answers while preserving verified place names", () => {
  const place = "Nabonye Gasabo. Dore aho iherereye mu nzego z'ubuyobozi: Kigali City / Gasabo.";
  assert.equal(translateText(place, "en"), "I found Gasabo. Its administrative hierarchy is: Kigali City / Gasabo.");
  assert.equal(translateText(place, "fr"), "J'ai trouvé Gasabo. Sa hiérarchie administrative est : Kigali City / Gasabo.");

  const noLeader = "Nta muyobozi wemejwe wanditswe kuri akarere ya Gasabo, kandi nta muyobozi wo ku rwego rwo hejuru wabonetse muri database. Nta zina cyangwa nimero nshobora guhimba. Intambwe ikurikira ni ukumenyesha ibiro by'ubuyobozi bw'ako gace ko aya makuru abura.";
  assert.match(translateText(noLeader, "en"), /^No verified leader is listed for district Gasabo/);
  assert.match(translateText(noLeader, "en"), /I will not invent a name or phone number/);
  assert.match(translateText(noLeader, "fr"), /^Aucun responsable vérifié n'est répertorié pour le\/la district Gasabo/);
  assert.match(translateText(noLeader, "fr"), /Je n'inventerai ni nom ni numéro de téléphone/);
});
