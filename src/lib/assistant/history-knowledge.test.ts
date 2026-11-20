import assert from "node:assert/strict";
import test from "node:test";
import {
  getRwandaHistoryReply,
  isRwandaHistoryTopic,
  resolveRwandaHistoryTopic,
  RWANDA_HISTORY_TOPICS,
} from "./history-knowledge";

const languageQueries = [
  ["rw", "Jenoside yakorewe Abatutsi mu 1994 ni iki?"],
  ["en", "What is the 1994 Genocide against the Tutsi?"],
  ["fr", "Qu'est-ce que le génocide perpétré contre les Tutsi en 1994 ?"],
] as const;

test("history topic list is stable and every topic is recognized", () => {
  assert.equal(RWANDA_HISTORY_TOPICS.length, 8);
  for (const topic of RWANDA_HISTORY_TOPICS) assert.equal(isRwandaHistoryTopic(topic), true);
  assert.equal(isRwandaHistoryTopic("made_up_topic"), false);
});

test("recognizes a genocide overview question in Kinyarwanda, English and French", () => {
  for (const [, query] of languageQueries) {
    assert.equal(resolveRwandaHistoryTopic(query), "genocide_overview");
  }
});

const cases: Array<[string, string, string]> = [
  ["legal definition", "Jenoside isobanurwa ite mu mategeko?", "genocide_definition"],
  ["historical background", "Amateka mbere ya Jenoside yakorewe Abatutsi", "genocide_background"],
  ["preparation", "Jenoside yateguwe ite mbere ya 1994?", "genocide_planning"],
  ["beginning", "Byagenze bite ku wa 6 na 7 Mata 1994?", "genocide_beginning"],
  ["justice", "Inkiko Gacaca zakoraga zite?", "genocide_justice"],
  ["survivors", "Ni izihe ngaruka ku bacitse ku icumu?", "genocide_survivors"],
  ["commemoration", "Kwibuka bitangira ryari?", "kwibuka"],
];

for (const [label, query, expected] of cases) {
  test("resolves " + label + " questions", () => {
    assert.equal(resolveRwandaHistoryTopic(query), expected);
  });
}

test("returns reviewed answers and source page/section locators for all 8 topics", () => {
  for (const topic of RWANDA_HISTORY_TOPICS) {
    for (const query of [
      "Jenoside yakorewe Abatutsi mu 1994 ni iki?",
      "What is the genocide against the Tutsi?",
      "Qu'est-ce que le génocide contre les Tutsi ?",
    ]) {
      const reply = getRwandaHistoryReply(topic, query);
      assert.ok(reply.answer.length > 100, topic + " should have a substantial answer");
      assert.ok(reply.sources.length > 0, topic + " must include sources");
      assert.ok(reply.sources.every((source) => source.url?.startsWith("https://")), topic + " sources must be HTTPS");
      assert.ok(reply.sources.every((source) => Boolean(source.snippet?.trim())), topic + " must include precise locators");
      assert.ok(reply.suggestions.length >= 2, topic + " should support follow-up conversation");
    }
  }
});

test("answers each topic in the visitor's selected language", () => {
  const rw = getRwandaHistoryReply("genocide_overview", "Jenoside yakorewe Abatutsi mu 1994 ni iki?");
  const en = getRwandaHistoryReply("genocide_overview", "What is the 1994 Genocide against the Tutsi?");
  const fr = getRwandaHistoryReply("genocide_overview", "Qu'est-ce que le génocide perpétré contre les Tutsi ?");
  assert.match(rw.answer, /Guverinoma y'u Rwanda/);
  assert.match(en.answer, /Government of Rwanda/);
  assert.match(fr.answer, /Gouvernement du Rwanda/);
});

test("keeps the cause of the 6 April 1994 plane crash unasserted", () => {
  const rw = getRwandaHistoryReply("genocide_beginning", "Byagenze bite ku wa 6 Mata 1994?");
  const en = getRwandaHistoryReply("genocide_beginning", "What happened on 6 April 1994?");
  const fr = getRwandaHistoryReply("genocide_beginning", "Que s'est-il passé le 6 avril 1994 ?");
  assert.match(rw.answer, /kitamenyekanye/);
  assert.match(en.answer, /remained unknown/);
  assert.match(fr.answer, /est restée inconnue/);
  assert.doesNotMatch(en.answer, /the RPF shot down|the government shot down/i);
});

test("preserves the distinction between indictments and convictions", () => {
  const reply = getRwandaHistoryReply("genocide_justice", "What did the ICTR do?");
  assert.match(reply.answer, /an indictment is not a conviction/i);
});

test("does not generalize a limited survivor interview sample to all survivors", () => {
  const reply = getRwandaHistoryReply("genocide_survivors", "Abacitse ku icumu");
  assert.match(reply.answer, /bidahagarariye ibitekerezo cyangwa ubuzima bw'abacitse ku icumu bose/);
});

test("keeps a history follow-up in its previous topic", () => {
  assert.equal(resolveRwandaHistoryTopic("Komeza umbwire", "genocide_planning"), "genocide_planning");
  assert.equal(resolveRwandaHistoryTopic("Tell me more", "genocide_survivors"), "genocide_survivors");
  assert.equal(resolveRwandaHistoryTopic("Explique davantage", "genocide_justice"), "genocide_justice");
});

test("does not hijack unrelated questions into genocide history", () => {
  assert.equal(resolveRwandaHistoryTopic("U Rwanda rufite uturere tungahe?"), null);
  assert.equal(resolveRwandaHistoryTopic("What is the weather in Kigali?"), null);
  assert.equal(resolveRwandaHistoryTopic("Quelle est la capitale du Rwanda ?"), null);
});

test("routes a plain 7 April 1994 question to the historical timeline, not Kwibuka", () => {
  assert.equal(resolveRwandaHistoryTopic("What happened on 7 April 1994?"), "genocide_beginning");
  assert.equal(resolveRwandaHistoryTopic("Ni iki cyabaye ku wa 7 Mata 1994?"), "genocide_beginning");
  assert.equal(resolveRwandaHistoryTopic("Qu'est-il arrivé le 7 avril 1994 ?"), "genocide_beginning");
});

test("routes explicit Kwibuka questions to the commemoration topic", () => {
  assert.equal(resolveRwandaHistoryTopic("Kwibuka bitangira ryari?"), "kwibuka");
  assert.equal(resolveRwandaHistoryTopic("When does Kwibuka begin?"), "kwibuka");
  assert.equal(resolveRwandaHistoryTopic("Quand commence le Kwibuka ?"), "kwibuka");
});

test("all cited source identifiers resolve and every citation has a page or section locator", () => {
  const expectedSourceCounts: Record<(typeof RWANDA_HISTORY_TOPICS)[number], number> = {
    genocide_overview: 3,
    genocide_definition: 2,
    genocide_background: 2,
    genocide_planning: 3,
    genocide_beginning: 3,
    genocide_justice: 4,
    genocide_survivors: 2,
    kwibuka: 3,
  };
  for (const topic of RWANDA_HISTORY_TOPICS) {
    const reply = getRwandaHistoryReply(topic, "What is the history?");
    assert.equal(reply.sources.length, expectedSourceCounts[topic], topic + " has missing source registry references");
    assert.ok(reply.sources.every((source) => Boolean(source.snippet?.trim())), topic + " has a source without a locator");
  }
});

test("understands typo-tolerant Kinyarwanda history questions", () => {
  assert.equal(
    resolveRwandaHistoryTopic("Jenocide yakorewe Abatutzi mu 1994 niiki?"),
    "genocide_overview",
  );
  assert.equal(
    resolveRwandaHistoryTopic("Mbwira amateka ya Jenoside yakorewe Abatutsi"),
    "genocide_background",
  );
  assert.equal(
    resolveRwandaHistoryTopic("Jenoside yateguwe gute mbere ya 1994?"),
    "genocide_planning",
  );
  assert.equal(
    resolveRwandaHistoryTopic("Jenoside yatangiye ryari?"),
    "genocide_beginning",
  );
  assert.equal(resolveRwandaHistoryTopic("Kwibuk bitangira ryari?"), "kwibuka");
});

test("understands different sentence structures in English and French", () => {
  assert.equal(
    resolveRwandaHistoryTopic("Can you tell me about the 1994 Genocid against the Tutsi?"),
    "genocide_overview",
  );
  assert.equal(
    resolveRwandaHistoryTopic("Parlez-moi de l'histoire du génocide contre les Tutsi"),
    "genocide_background",
  );
  assert.equal(
    resolveRwandaHistoryTopic("Quand a commencé le génocide contre les Tutsi ?"),
    "genocide_beginning",
  );
  assert.equal(
    resolveRwandaHistoryTopic("Comment les juridictions Gacaca fonctionnaient-elles ?"),
    "genocide_justice",
  );
});

test("does not route unrelated questions into genocide history", () => {
  assert.equal(resolveRwandaHistoryTopic("What is the history of Kigali?"), null);
  assert.equal(resolveRwandaHistoryTopic("How do I prepare for an exam?"), null);
  assert.equal(resolveRwandaHistoryTopic("Quelle est l'histoire de Kigali ?"), null);
});


test("understands contextual follow-ups whose subject is implicit", () => {
  assert.equal(resolveRwandaHistoryTopic("yateguwe ite?", "genocide_overview"), "genocide_planning");
  assert.equal(resolveRwandaHistoryTopic("yatangiye ryari?", "genocide_overview"), "genocide_beginning");
  assert.equal(resolveRwandaHistoryTopic("byagenze gute?", "genocide_beginning"), "genocide_beginning");
  assert.equal(resolveRwandaHistoryTopic("what happened next?", "genocide_planning"), "genocide_planning");
});
