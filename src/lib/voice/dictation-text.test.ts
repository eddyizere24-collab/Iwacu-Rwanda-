import assert from "node:assert/strict";
import test from "node:test";
import {
  addPhrase,
  appendSession,
  composeDictation,
  decideAfterSessionEnd,
  isDictationLanguage,
  joinText,
  sessionTranscript,
  DICTATION_LANG_TAGS,
} from "./dictation-text";

function results(...phrases: string[]) {
  return phrases.map((transcript) => Object.assign([{ transcript }], { isFinal: true }));
}

test("language tags cover Kinyarwanda, English and French", () => {
  assert.equal(DICTATION_LANG_TAGS.rw, "rw-RW");
  assert.equal(DICTATION_LANG_TAGS.en, "en-US");
  assert.equal(DICTATION_LANG_TAGS.fr, "fr-FR");
  assert.equal(isDictationLanguage("rw"), true);
  assert.equal(isDictationLanguage("sw"), false);
});

test("separate phrases are joined in order", () => {
  assert.equal(sessionTranscript(results("mu Rwanda hari", "uturere tungahe")), "mu Rwanda hari uturere tungahe");
});

test("Android cumulative repeats do not duplicate the sentence", () => {
  assert.equal(
    sessionTranscript(results("mu Rwanda", "mu Rwanda hari", "mu Rwanda hari uturere", "mu Rwanda hari uturere tungahe")),
    "mu Rwanda hari uturere tungahe",
  );
});

test("an identical repeated result is kept once, a shorter echo is dropped", () => {
  assert.deepEqual(addPhrase(["hello world"], "Hello world"), ["Hello world"]);
  assert.deepEqual(addPhrase(["hello world"], "hello"), ["hello world"]);
  assert.deepEqual(addPhrase(["hello world"], "how are you"), ["hello world", "how are you"]);
  assert.deepEqual(addPhrase(["a"], "   "), ["a"]);
});

test("a restart keeps earlier text and never writes a repeated tail twice", () => {
  assert.equal(appendSession("", "bonjour"), "bonjour");
  assert.equal(appendSession("bonjour", "comment ça va"), "bonjour comment ça va");
  assert.equal(appendSession("bonjour comment ça va", "comment ça va"), "bonjour comment ça va");
  assert.equal(appendSession("bonjour", "bonjour comment ça va"), "bonjour comment ça va");
  assert.equal(appendSession("bonjour", ""), "bonjour");
});

test("long dictation across several restarts stays complete and in order", () => {
  let previous = "";
  const sessions = ["Muraho neza", "nashakaga kumenya", "umuyobozi w'umudugudu", "mu karere ka Gasabo"];
  for (const session of sessions) previous = appendSession(previous, session);
  assert.equal(previous, "Muraho neza nashakaga kumenya umuyobozi w'umudugudu mu karere ka Gasabo");
});

test("text typed before dictation is kept and spacing is clean", () => {
  assert.equal(composeDictation("", "", "hello", 500), "hello");
  assert.equal(composeDictation("Ikibazo:", "", "hello", 500), "Ikibazo: hello");
  assert.equal(composeDictation("Ikibazo: ", "mbere", "hello", 500), "Ikibazo: mbere hello");
  assert.equal(composeDictation("abc", "", "", 500), "abc");
  assert.equal(composeDictation("", "x".repeat(600), "", 500).length, 500);
  assert.equal(joinText("  a ", "", " b  "), "a b");
});

test("silence over a minute stops dictation, ordinary pauses restart it quietly", () => {
  const base = { now: 100_000, sessionStartedAt: 90_000, quickFailures: 0 };
  assert.deepEqual(decideAfterSessionEnd({ ...base, lastActivityAt: 95_000 }), { action: "restart", delayMs: 120 });
  assert.deepEqual(decideAfterSessionEnd({ ...base, lastActivityAt: 30_000 }), { action: "stop", reason: "silence" });
});

test("a browser that fails instantly over and over is not retried forever", () => {
  const quick = { now: 100_300, sessionStartedAt: 100_000, lastActivityAt: 100_000 };
  assert.equal(decideAfterSessionEnd({ ...quick, quickFailures: 0 }).action, "restart");
  assert.deepEqual(decideAfterSessionEnd({ ...quick, quickFailures: 3 }), { action: "stop", reason: "unstable" });
});
