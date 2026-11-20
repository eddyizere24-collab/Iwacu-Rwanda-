import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAssistantQuery } from "./query-normalization";

test("normalizes common Kinyarwanda and history spelling mistakes conservatively", () => {
  assert.equal(normalizeAssistantQuery("Jenocide yakorewe Abatutzi"), "jenoside yakorewe abatutsi");
  assert.equal(normalizeAssistantQuery("Akarare ka Gasabo"), "akarere ka gasabo");
  assert.equal(normalizeAssistantQuery("Umurenje wa Kacyiru"), "umurenge wa kacyiru");
  assert.equal(normalizeAssistantQuery("Akagali ka Kamatamu"), "akagari ka kamatamu");
  assert.equal(normalizeAssistantQuery("Kwibuk bitangira ryari?"), "kwibuka bitangira ryari");
});

test("repairs common joined Kinyarwanda words without changing the question", () => {
  assert.equal(normalizeAssistantQuery("Jenoside niiki?"), "jenoside ni iki");
  assert.equal(normalizeAssistantQuery("Abacitsekuicumu"), "abacitse ku icumu");
});

test("folds French accents and punctuation for matching", () => {
  assert.equal(
    normalizeAssistantQuery("Qu'est-ce que le génocide perpétré contre les Tutsi ?"),
    "qu'est-ce que le genocide perpetré contre les tutsi",
  );
});

test("does not rewrite ordinary words or named places by guesswork", () => {
  assert.equal(normalizeAssistantQuery("Gasabo Kigali Huye"), "gasabo kigali huye");
  assert.equal(normalizeAssistantQuery("umuhanda w'iwacu"), "umuhanda w'iwacu");
});
