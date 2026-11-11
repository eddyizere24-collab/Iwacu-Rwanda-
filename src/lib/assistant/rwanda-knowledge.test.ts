import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerRwandaKnowledge } from "./rwanda-knowledge";

describe("Ishakiro source-backed basic Rwanda knowledge", () => {
  it("explains Rwanda with official government source", () => {
    const answer = answerRwandaKnowledge("U Rwanda ni iki?");
    assert.ok(answer);
    assert.match(answer.answer, /Afurika yo Hagati/);
    assert.match(answer.answer, /Kigali/);
    assert.match(answer.answer, /Uganda.*Tanzania.*Burundi.*Kongo/);
    assert.match(answer.source.url, /gov\.rw\/about/);
  });

  it("explains Kigali as the capital and distinguishes it from a province", () => {
    const answer = answerRwandaKnowledge("Kigali ni iki?");
    assert.ok(answer);
    assert.match(answer.answer, /umurwa mukuru/i);
    assert.match(answer.answer, /si Intara ya gatanu/i);
    assert.match(answer.answer, /Gasabo.*Kicukiro.*Nyarugenge/);
    assert.match(answer.source.url, /kigalicity\.gov\.rw/);
  });

  it("explains Nyamasheke with its district website as source", () => {
    const answer = answerRwandaKnowledge("Nyamasheke ni iki?");
    assert.ok(answer);
    assert.match(answer.answer, /Akarere.*Iburengerazuba/);
    assert.match(answer.answer, /Imirenge 15/);
    assert.doesNotMatch(answer.answer, /\\b(?:588|586)\\b/);
    assert.match(answer.answer, /Nyungwe.*Kivu/);
    assert.match(answer.source.url, /nyamasheke\.gov\.rw/);
  });

  it("uses the published IWACU about page to explain the platform", () => {
    const answer = answerRwandaKnowledge("IWACU igamije iki?");
    assert.ok(answer);
    assert.match(answer.answer, /urubuga rwigenga/i);
    assert.match(answer.answer, /ntirusimbura inzego za Leta/i);
    assert.equal(answer.capability, "site_knowledge");
    assert.match(answer.source.url, /\/about$/);
  });

  it("answers administrative unit definitions in English and French", () => {
    const en = answerRwandaKnowledge("What is a district?");
    const fr = answerRwandaKnowledge("Qu'est-ce qu'un district ?");
    assert.ok(en && fr);
    assert.match(en.answer, /administrative level/i);
    assert.match(fr.answer, /niveau administratif/i);
  });

  it("does not invent an unsupported location description", () => {
    assert.equal(answerRwandaKnowledge("Some unknown place ni iki?"), null);
  });
});
