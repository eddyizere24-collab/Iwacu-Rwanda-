import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AssistantRequestSchema } from "./contracts";
import { ensureAssistantNextStep, runAssistant, scrubModelInput } from "./engine";
import type { AssistantIntent, AssistantReply } from "./contracts";

describe("Ishakiro direct answers", () => {
  it("explains what IWACU RWANDA is without needing GPS", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "IWACU RWANDA ni iki?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.equal(reply.status, "success");
    assert.match(reply.answer_kiny, /urubuga rwigenga.*ikoranabuhanga/i);
    assert.match(reply.answer_kiny, /si urubuga rwa Leta/i);
    assert.ok(reply.sources.some((source) => /Abo turi bo/.test(source.label)));
    assert.equal(reply.context?.knowledge_topic, "iwacu_rwanda");
  });

  it("explains Kigali and its administrative structure", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Kigali ni iki?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /umurwa mukuru w'u Rwanda/i);
    assert.match(reply.answer_kiny, /Gasabo, Kicukiro na Nyarugenge/i);
    assert.match(reply.answer_kiny, /rutandukanye n'Intara enye/i);
    assert.ok(reply.sources.some((source) => /City of Kigali/.test(source.label)));
  });

  it("explains Rwanda's identity and geography", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "U Rwanda ni iki?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Repubulika y'u Rwanda/i);
    assert.match(reply.answer_kiny, /Uganda.*Tanzania.*Burundi.*Congo/i);
    assert.ok(reply.sources.some((source) => /Government of Rwanda/.test(source.label)));
  });

  it("continues a Kigali knowledge conversation with its district count", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({
      query: "Igizwe n'uturere tungahe?", context: { knowledge_topic: "kigali" },
    }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /uturere 3: Gasabo, Kicukiro na Nyarugenge/i);
  });

  it("answers who the assistant is in Kinyarwanda", async () => {
    const request = AssistantRequestSchema.parse({ query: "Urinde?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "identity");
    assert.match(reply.answer_kiny, /Iwacu AI.*IWACU RWANDA/i);
    assert.match(reply.answer_kiny, /nt.*mpimbe|ntabwo.*mpimbe/i);
  });

  it("recognises the exact French identity question", async () => {
    const request = AssistantRequestSchema.parse({ query: "Qui êtes-vous ?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "identity");
    assert.match(reply.answer_kiny, /Iwacu AI/);
  });

  it("answers Gasabo's administrative parent without requiring prior chat context", async () => {
    const request = AssistantRequestSchema.parse({ query: "Akarere ka Gasabo kari mu Ntara iyihe?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "place_facts");
    assert.equal(reply.status, "success");
    assert.equal(reply.answer_kiny, "Akarere ka Gasabo kari mu Mujyi wa Kigali.");
    assert.ok(reply.sources.some((source) => /offline administrative index/.test(source.label)));
    assert.doesNotMatch(reply.answer_kiny, /Intara ya Umujyi wa Kigali/);
  });

  it("uses the offline district scope before requesting Gasabo leader records", async () => {
    const request = AssistantRequestSchema.parse({ query: "Meya w'Akarere ka Gasabo ni nde?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "leader_by_place");
    assert.doesNotMatch(
      reply.answer_kiny,
      /Nta makuru nshobora kwemeza/i,
    );
    assert.match(
      reply.answer_kiny,
      /amakuru y'abayobozi|umuyobozi wemejwe|Abayobozi banditswe|Nta muyobozi wemejwe/i,
    );
  });

  it("answers Gasabo sector count from the level-specific offline hierarchy", async () => {
    const request = AssistantRequestSchema.parse({ query: "Akarere ka Gasabo gafite imirenge ingahe?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "place_facts");
    assert.equal(reply.status, "success");
    assert.match(reply.answer_kiny, /Gasabo.*imirenge 15/i);
    assert.match(reply.confidence_label ?? "", /offline administrative index|index y'inzego/i);
    assert.ok(reply.sources.some((source) => /offline administrative index/i.test(source.label)));
  });

  it("answers Rwanda-wide district count from the official Government snapshot", async () => {
    const request = AssistantRequestSchema.parse({ query: "Mu Rwanda hari uturere tungahe?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "national_facts");
    assert.equal(reply.status, "success");
    assert.match(reply.answer_kiny, /30 uturere/);
    assert.match(reply.answer_kiny, /4 intara/);
    assert.match(reply.answer_kiny, /Umujyi wa Kigali 1/);
    assert.match(reply.answer_kiny, /416 imirenge/);
    assert.match(reply.answer_kiny, /2,148 utugari/);
    assert.match(reply.answer_kiny, /14,837 imidugudu/);
    assert.match(reply.confidence_label ?? "", /Guverinoma y.u Rwanda/);
    assert.match(reply.sources?.[0]?.url ?? "", /gov\.rw/);
  });

  it("answers a national province count when asked", async () => {
    const request = AssistantRequestSchema.parse({ query: "U Rwanda rufite intara zingahe?" });
    const reply = await runAssistant(request);
    assert.equal(reply.intent, "national_facts");
    assert.match(reply.answer_kiny, /4 intara/);
    assert.match(reply.answer_kiny, /Umujyi wa Kigali.*si intara/);
  });
});


function replyFixture(intent: AssistantIntent, status: AssistantReply["status"], answer: string, suggestions: string[] = []): AssistantReply {
  return {
    status,
    intent,
    answer_kiny: answer,
    confidence: "low",
    confidence_label: "",
    data_date_label: "",
    sources: [],
    places: [],
    leaders: [],
    emergency_contacts: [],
    suggestions,
    context: null,
    gap_recorded: false,
    gap_notified: false,
    capability: null,
  };
}

describe("Ishakiro incomplete-answer guardrail", () => {
  it("adds a visible next step and a suggested action when a failed reply has neither", () => {
    const reply = replyFixture("distance", "missing", "Geometry y'ahantu habiri ntiyabonetse. Nta intera ntanze.");
    const guarded = ensureAssistantNextStep(reply);

    assert.equal(guarded.suggestions.length, 1);
    assert.match(guarded.suggestions[0], /Tanga amazina y'ahantu habiri/);
    assert.match(guarded.answer_kiny, /Intambwe ikurikira:/);
    assert.match(guarded.answer_kiny, /Tanga amazina y'ahantu habiri/);
  });

  it("preserves intent-specific suggestions and avoids appending a duplicate next step", () => {
    const reply = replyFixture(
      "place_facts",
      "partial",
      "Nta mibare yizewe nabonye. Ongera ugenzure izina ry'ahantu.",
      ["Hitamo Akarere cyangwa Umurenge ushaka."]
    );
    const guarded = ensureAssistantNextStep(reply);

    assert.deepEqual(guarded.suggestions, reply.suggestions);
    assert.equal(guarded.answer_kiny, reply.answer_kiny);
  });

  it("covers all public data and research intents when a reply is incomplete", () => {
    const intents: AssistantIntent[] = [
      "emergency",
      "my_location",
      "leader_by_location",
      "leader_by_place",
      "leader_contact_followup",
      "person_search",
      "place_lookup",
      "distance",
      "boundaries",
      "signs",
      "place_facts",
      "external_research",
      "out_of_scope",
    ];

    for (const intent of intents) {
      const guarded = ensureAssistantNextStep(replyFixture(intent, "error", "Ibisobanuro ntibyabonetse."));
      assert.ok(guarded.suggestions.length > 0, "next-step suggestion missing for " + intent);
      assert.match(guarded.answer_kiny, /Intambwe ikurikira:/, "visible next step missing for " + intent);
    }
  });

  it("does not rewrite a complete successful answer", () => {
    const reply = replyFixture("national_facts", "success", "U Rwanda rufite 30 uturere.");
    assert.equal(ensureAssistantNextStep(reply), reply);
  });
});


it("sanitizes personal contact details and coordinate pairs before optional model input", () => {
  const cleaned = scrubModelInput("My email is eddy@example.com, call +250 788 123 456, location -1.9441, 30.0619.");
  assert.doesNotMatch(cleaned, /eddy@example\.com|788 123 456|-1\.9441|30\.0619/);
  assert.match(cleaned, /\[email removed\]/);
  assert.match(cleaned, /\[coordinates removed\]/);
  assert.match(cleaned, /\[number removed\]/);
});
