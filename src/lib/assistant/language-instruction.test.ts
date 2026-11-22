import assert from "node:assert/strict";
import test from "node:test";
import { getAnswerLanguageInstruction } from "./model-provider";
const g = (t: string) => getAnswerLanguageInstruction([{ role: "user", content: t }]);
test("language", () => {
  assert.match(g("U Rwanda ruherereye he?"), /Kinyarwanda/);
  assert.match(g("Quelle est la capitale du Rwanda ?"), /French/);
  assert.match(g("Where is Rwanda located?"), /English/);
  assert.match(g("Donne-moi le numéro de téléphone du maire du district de Musanze"), /French/);
  assert.match(g("Qui est le chef de la cellule de Kacyiru actuellement ?"), /French/);
  assert.match(g("Give me the phone number of the mayor of Huye District"), /English/);
  assert.match(g("Who is the head of the village of Rugando right now?"), /English/);
  assert.match(g("Mpa nimero ya telefone ya meya w'akarere ka Gasabo"), /Kinyarwanda/);
  assert.match(g("Ni nde gitifu w'umurenge wa Nyamirambo uyu munsi?"), /Kinyarwanda/);
  assert.match(g("Muraho neza, mbwira umujyi wa Kigali ugizwe n'uturere tungahe?"), /Kinyarwanda/);
});
