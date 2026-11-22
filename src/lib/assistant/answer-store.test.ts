import assert from "node:assert/strict";
import test from "node:test";
import {
  isStorableQuestion,
  lookupStoredAnswer,
  normalizeQuestion,
  storeAnswer,
  type AnswerStoreClient,
} from "./answer-store";

test("normalizes accents, case and punctuation so rephrased spellings match", () => {
  assert.equal(normalizeQuestion("  Malariya NI iki?! "), "malariya ni iki");
  assert.equal(normalizeQuestion("Qu’est-ce que l’été ?"), "quest ce que lete");
});

test("only stores public, self-contained questions", () => {
  assert.equal(isStorableQuestion("Malariya iterwa n'iki?", false), true);
  assert.equal(isStorableQuestion("Nomero yanjye ni 0788123456 mpamagare", false), false);
  assert.equal(isStorableQuestion("eddy@example.com ni iki", false), false);
  assert.equal(isStorableQuestion("na we?", true), false);
  assert.equal(isStorableQuestion("ni iki", false), false);
  assert.equal(isStorableQuestion("Sobanura iby'ubuhinzi bwa kijyambere mu Rwanda", true), true);
});

test("lookup returns the stored answer only for a found row", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client: AnswerStoreClient = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: { found: true, answer: "  Igisubizo  " }, error: null };
    },
  };
  assert.equal(await lookupStoredAnswer("Malariya ni iki?", "rw", 0.7, () => client), "Igisubizo");
  assert.equal(calls[0].name, "lookup_assistant_answer_v1");
  assert.equal(calls[0].args.p_norm, "malariya ni iki");
  assert.equal(calls[0].args.p_lang, "rw");

  const missing: AnswerStoreClient = { rpc: async () => ({ data: { found: false }, error: null }) };
  assert.equal(await lookupStoredAnswer("x y z abc", "rw", 0.7, () => missing), null);
  const broken: AnswerStoreClient = { rpc: async () => { throw new Error("down"); } };
  assert.equal(await lookupStoredAnswer("x y z abc", "rw", 0.7, () => broken), null);
});

test("store reports success only when the database confirms it", async () => {
  const ok: AnswerStoreClient = { rpc: async () => ({ data: { stored: true }, error: null }) };
  assert.equal(await storeAnswer("Malariya ni iki?", "Igisubizo", "rw", "ai", () => ok), true);
  const refused: AnswerStoreClient = { rpc: async () => ({ data: { stored: false }, error: null }) };
  assert.equal(await storeAnswer("Malariya ni iki?", "Igisubizo", "rw", "ai", () => refused), false);
  assert.equal(await storeAnswer("Malariya ni iki?", "", "rw", "ai", () => ok), false);
});
