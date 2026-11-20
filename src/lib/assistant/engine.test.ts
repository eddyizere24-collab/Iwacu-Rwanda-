import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AssistantRequestSchema } from "./contracts";
import { ensureAssistantNextStep, runAssistant, scrubModelInput } from "./engine";
import type { AssistantIntent, AssistantReply } from "./contracts";
import { clearExternalResearchCacheForTests } from "./external-research";

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
    assert.match(reply.answer_kiny, /urwego rwa mbere.*Intara enye|si Intara ya gatanu/i);
    assert.ok(reply.sources.some((source) => /City of Kigali/.test(source.label)));
  });

  it("explains Nyamasheke with the District's published facts and source", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Nyamasheke ni iki?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.equal(reply.status, "success");
    assert.match(reply.answer_kiny, /Intara y'Iburengerazuba/);
    assert.match(reply.answer_kiny, /Imirenge 15/);
    assert.doesNotMatch(reply.answer_kiny, /Imidugudu 588/);
    assert.match(reply.answer_kiny, /Rusizi.*Karongi.*Nyamagabe/);
    assert.ok(reply.sources.some((source) => /nyamasheke.gov.rw/.test(source.url ?? "")));
    assert.equal(reply.context?.knowledge_topic, "nyamasheke");
  });

  it("continues a Nyamasheke knowledge conversation about sectors", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({
      query: "Ifite imirenge ingahe?", context: { knowledge_topic: "nyamasheke" },
    }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Imirenge 15/);
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

  it("answers Rwanda census population with the census year clearly stated", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Abaturage b'u Rwanda ni bangahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /13,246,394/);
    assert.match(reply.answer_kiny, /2022/);
    assert.ok(reply.sources.some((source) => /statistics.gov.rw/.test(source.url ?? "")));
    assert.equal(reply.context?.knowledge_topic, "rwanda_population");
  });

  it("explains the official languages of Rwanda", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Indimi zemewe mu Rwanda ni izihe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Ikinyarwanda/);
    assert.match(reply.answer_kiny, /Icyongereza.*Igifaransa.*Igiswahili/);
    assert.equal(reply.context?.knowledge_topic, "rwanda_languages");
  });

  it("explains the national symbols and anthem", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Ibendera ry'u Rwanda risobanura iki?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Rwanda Nziza/);
    assert.match(reply.answer_kiny, /Ubumwe, Umurimo, Gukunda Igihugu/);
    assert.ok(reply.sources.some((source) => /gov\.rw/.test(source.url ?? "")));
  });

  it("explains the branches of government and the Parliament", async () => {
    const governance = await runAssistant(AssistantRequestSchema.parse({ query: "Amashami y'ubutegetsi bw'u Rwanda ni ayahe?" }));
    const parliament = await runAssistant(AssistantRequestSchema.parse({ query: "Inteko Ishinga Amategeko y'u Rwanda ni iki?" }));
    assert.equal(governance.intent, "general_knowledge");
    assert.match(governance.answer_kiny, /amashami atatu/i);
    assert.match(governance.answer_kiny, /ubucamanza/i);
    assert.equal(parliament.intent, "general_knowledge");
    assert.match(parliament.answer_kiny, /Sena n'Umutwe w'Abadepite/);
    assert.ok(parliament.sources.some((source) => /parliament.gov.rw/.test(source.url ?? "")));
  });

  it("answers basic geography, currency, time-zone and culture questions", async () => {
    const geography = await runAssistant(AssistantRequestSchema.parse({ query: "U Rwanda ruherereye he?" }));
    const currency = await runAssistant(AssistantRequestSchema.parse({ query: "Ifaranga ry'u Rwanda ni irihe?" }));
    const culture = await runAssistant(AssistantRequestSchema.parse({ query: "Umuganda ni iki?" }));
    assert.equal(geography.intent, "general_knowledge");
    assert.match(geography.answer_kiny, /Afurika yo Hagati/);
    assert.match(geography.answer_kiny, /Uganda.*Tanzania.*Burundi/);
    assert.equal(currency.intent, "general_knowledge");
    assert.match(currency.answer_kiny, /FRW/);
    assert.match(currency.answer_kiny, /UTC\+2/);
    assert.equal(culture.intent, "general_knowledge");
    assert.match(culture.answer_kiny, /imirimo rusange/);
    assert.ok(culture.sources.some((source) => /highlights\/governance/.test(source.url ?? "")));
  });

  it("automatically searches the web for unknown questions only when enabled", async () => {
    const keys = [
      "IWACU_EXTERNAL_RESEARCH_ENABLED", "IWACU_EXTERNAL_RESEARCH_PROVIDER", "TAVILY_API_KEY",
      "IWACU_AI_ANSWER_ENABLED", "IWACU_AI_PROVIDER", "IWACU_AI_ROUTING_ENABLED",
      "IWACU_AI_BENCHMARK_PASSED", "IWACU_AI_USAGE_LIMITS_VERIFIED", "IWACU_AI_MODEL",
      "IWACU_AI_USAGE_HMAC_KEY", "GEMINI_API_KEY", "GROQ_API_KEY",
    ];
    const saved = new Map(keys.map((key) => [key, process.env[key]]));
    const originalFetch = globalThis.fetch;
    try {
      process.env.IWACU_EXTERNAL_RESEARCH_ENABLED = "true";
      process.env.IWACU_EXTERNAL_RESEARCH_PROVIDER = "tavily";
      process.env.TAVILY_API_KEY = "test-only-not-a-real-key";
      for (const key of keys.filter((value) => value.startsWith("IWACU_AI_") || value.endsWith("_API_KEY"))) {
        if (key !== "TAVILY_API_KEY") delete process.env[key];
      }
      clearExternalResearchCacheForTests();
      globalThis.fetch = async () => new Response(JSON.stringify({
        results: [{
          title: "Official Rwanda budget announcement",
          url: "https://www.gov.rw/news",
          content: "The Ministry published a public budget announcement on 8 November 2026.",
          published_date: "2026-11-08",
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });

      const reply = await runAssistant(AssistantRequestSchema.parse({
        query: "What is the latest Rwanda budget announcement in November 2026?",
      }));
      assert.equal(reply.intent, "external_research");
      assert.equal(reply.status, "success");
      assert.match(reply.answer_kiny, /budget announcement/i);
      assert.ok(reply.sources.some((source) => /gov\.rw/.test(source.url ?? "")));
      assert.equal(reply.capability, "external_research");
    } finally {
      globalThis.fetch = originalFetch;
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      clearExternalResearchCacheForTests();
    }
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


describe("Ishakiro Kigali City knowledge", () => {
  it("answers the City of Kigali area from the official City overview", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Ubuso bw'Umujyi wa Kigali bungana iki?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /730 km²/);
    assert.ok(reply.sources.some((source) => (source.url ?? "").includes("kigalicity.gov.rw")), query + " source URLs: " + reply.sources.map((source) => source.url ?? source.label).join(" | "));
  });

  it("answers district population with the census year and breakdown", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Abaturage ba Gasabo ni bangahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /879,505/);
    assert.match(reply.answer_kiny, /2022/);
    assert.match(reply.answer_kiny, /443,987/);
    assert.ok(reply.sources.some((source) => /statistics\.gov\.rw/.test(source.url ?? "")));
  });

  it("answers a sector population and its administrative parent", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Abaturage bo mu Murenge wa Kinyinya ni bangahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Karere ka Gasabo/);
    assert.match(reply.answer_kiny, /125,400/);
    assert.match(reply.answer_kiny, /63,081/);
    assert.match(reply.answer_kiny, /62,319/);
    assert.match(reply.answer_kiny, /Kanama 2022/);
  });

  it("lists all Gasabo sectors with the verified count", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Akarere ka Gasabo gafite imirenge iyihe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /imirenge 15/);
    assert.match(reply.answer_kiny, /Bumbogo.*Kacyiru.*Kinyinya.*Rutunga/);
    assert.ok(reply.sources.some((source) => /kigalicity\.gov\.rw/.test(source.url ?? "")));
  });

  it("answers the history of Kigali without assigning city history to every sector", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Amateka y'Umujyi wa Kigali ni ayahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /1907/);
    assert.match(reply.answer_kiny, /1962/);
    assert.ok(reply.sources.some((source) => /visitrwanda\.com/.test(source.url ?? "")));
  });

  it("does not invent a historical record for an individual sector", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Amateka y'Umurenge wa Kacyiru ni ayahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Ntabwo mfite inyandiko y'amateka/i);
    assert.match(reply.answer_kiny, /30,036/);
    assert.ok(reply.sources.some((source) => /statistics\.gov\.rw/.test(source.url ?? "")));
  });

  it("answers the Kigali population in French using the same census source", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Quelle est la population de Kigali ?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /1 745 555/);
    assert.match(reply.answer_kiny, /août 2022/);
    assert.ok(reply.sources.some((source) => /statistics\.gov\.rw/.test(source.url ?? "")));
  });

  it("answers the area of a specific Kigali district", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Ubuso bw'Akarere ka Gasabo bungana iki?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /429\.3 km²/);
    assert.match(reply.answer_kiny, /730 km²/);
  });

  it("resolves a uniquely named sector even when the visitor omits the word sector", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Abaturage ba Kinyinya ni bangahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Umurenge wa Kinyinya/);
    assert.match(reply.answer_kiny, /125,400/);
  });

  it("distinguishes Kicukiro Sector from Kicukiro District when the level is stated", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Abaturage bo mu Murenge wa Kicukiro ni bangahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Umurenge wa Kicukiro/);
    assert.match(reply.answer_kiny, /14,039/);
    assert.match(reply.answer_kiny, /Karere ka Kicukiro/);
  });

});



describe("Ishakiro expanded Kigali city profile", () => {
  it("explains Kigali's official vision in French", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Quelle est la vision de la Ville de Kigali ?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Centre d'excellence urbaine en Afrique/);
    assert.ok(reply.sources.some((source) => /kigalicity\.gov\.rw/.test(source.url ?? "")));
  });

  it("explains the City's responsibilities in Kinyarwanda", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Inshingano z'Umujyi wa Kigali ni izihe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /gushyira mu bikorwa.*politiki za Leta/i);
    assert.match(reply.answer_kiny, /umutekano/i);
  });

  it("explains Kigali Master Plan 2050 without presenting plans as completed projects", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "What is Kigali Master Plan 2050?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /4 September 2020/);
    assert.match(reply.answer_kiny, /not every planned project/i);
    assert.ok(reply.sources.some((source) => /kigalicity\.gov\.rw/.test(source.url ?? "")));
  });

  it("answers Kicukiro-specific tourism questions from the district source", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "What attractions can I visit in Kicukiro?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Kigali Cultural Village/);
    assert.match(reply.answer_kiny, /Gahanga International Cricket Stadium/);
    assert.ok(reply.sources.some((source) => /kicukiro\.gov\.rw/.test(source.url ?? "")));
  });

  it("explains Kigali's economic contribution while distinguishing residents from commuters", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Kigali contributes how much to Rwanda's economy?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /41%/);
    assert.match(reply.answer_kiny, /1,860,000/);
    assert.match(reply.answer_kiny, /1,745,555/);
  });

  it("answers district-level cell counts", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Akarere ka Nyarugenge gafite utugari tungahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /utugari 47/);
    assert.match(reply.answer_kiny, /imirenge 10/);
  });

  it("does not conceal conflicting official village totals", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Umujyi wa Kigali ufite imidugudu ingahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /1,155/);
    assert.match(reply.answer_kiny, /1,163/);
    assert.match(reply.answer_kiny, /ntiyahuye|ntirahuzwa|ntarahuzwa/i);
    assert.ok(reply.sources.some((source) => /Annual_Report_2024-2025/.test(source.url ?? "")));
  });

  it("identifies conflicting Gasabo village counts as a source discrepancy", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Gasabo ifite imidugudu ingahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /485/);
    assert.match(reply.answer_kiny, /481/);
  });

  it("returns City coordinates as reference coordinates, not as a user's location", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "What are Kigali's coordinates?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /1°56'38\.6/);
    assert.match(reply.answer_kiny, /30°03'42\.9/);
    assert.match(reply.answer_kiny, /not a visitor's current location/);
  });

  it("distinguishes general climate information from a live weather forecast", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Ikirere cya Kigali kiba kimeze gite?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /27°C/);
    assert.match(reply.answer_kiny, /16°C/);
    assert.match(reply.answer_kiny, /si iteganyagihe/i);
  });
});



describe("Ishakiro Kigali administrative name disambiguation", () => {
  it("lists Gasabo sectors for an English sector-list question", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Which sectors are in Gasabo?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Gasabo District has 15 sectors/);
    assert.match(reply.answer_kiny, /Bumbogo.*Rutunga/);
  });

  it("answers the 35-sector count for Kigali City, not Kigali Sector", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "How many sectors are in Kigali?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /City of Kigali has 35 sectors/);
    assert.doesNotMatch(reply.answer_kiny, /Nyarugenge District has 10 sectors/);
  });

  it("distinguishes Kigali Sector from Kigali City when the sector level is stated", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Abaturage bo mu Murenge wa Kigali ni bangahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Umurenge wa Kigali/);
    assert.match(reply.answer_kiny, /61,499/);
    assert.match(reply.answer_kiny, /Karere ka Nyarugenge/);
  });

  it("keeps Nyarugenge District population separate from Nyarugenge Sector", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Abaturage ba Nyarugenge ni bangahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Akarere ka Nyarugenge/);
    assert.match(reply.answer_kiny, /374,319/);
    assert.doesNotMatch(reply.answer_kiny, /Umurenge wa Nyarugenge/);
  });

  it("answers Kicukiro Sector population when the user explicitly names the sector", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "Abaturage bo mu Murenge wa Kicukiro ni bangahe?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Umurenge wa Kicukiro/);
    assert.match(reply.answer_kiny, /14,039/);
    assert.match(reply.answer_kiny, /Karere ka Kicukiro/);
  });
});



describe("Ishakiro individual sector questions", () => {
  it("answers an English population question for Kicukiro Sector, not the sector list", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "What is the population of Kicukiro Sector?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Kicukiro Sector/);
    assert.match(reply.answer_kiny, /14,039/);
    assert.doesNotMatch(reply.answer_kiny, /has 10 sectors/);
  });

  it("answers an English population question for Kigali Sector, not the whole City", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({ query: "How many people live in Kigali Sector?" }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /Kigali Sector/);
    assert.match(reply.answer_kiny, /61,499/);
    assert.match(reply.answer_kiny, /Nyarugenge District/);
  });
});

describe("Ishakiro Kigali full sector catalogue and language quality", () => {
  const allKigaliSectors = [
    "Bumbogo", "Gatsata", "Gikomero", "Gisozi", "Jabana", "Jali", "Kacyiru",
    "Kimihurura", "Kimironko", "Kinyinya", "Ndera", "Nduba", "Remera",
    "Rusororo", "Rutunga", "Gahanga", "Gatenga", "Gikondo", "Kagarama",
    "Kanombe", "Kicukiro", "Kigarama", "Masaka", "Niboye", "Nyarugunga",
    "Gitega", "Kanyinya", "Kigali", "Kimisagara", "Mageregere", "Muhima",
    "Nyakabanda", "Nyamirambo", "Nyarugenge", "Rwezamenyo",
  ];

  it("lists all 35 Kigali sectors grouped by district in Kinyarwanda, English and French", async () => {
    const queries = [
      "Imirenge yose y'Umujyi wa Kigali ni iyihe?",
      "List all sectors in Kigali City.",
      "Quels sont les secteurs de la Ville de Kigali ?",
    ];

    for (const query of queries) {
      const reply = await runAssistant(AssistantRequestSchema.parse({ query }));
      assert.equal(reply.intent, "general_knowledge", "wrong intent for: " + query);
      for (const sector of allKigaliSectors) {
        assert.ok(reply.answer_kiny.includes(sector), sector + " missing for: " + query);
      }
      assert.match(reply.answer_kiny, /35/);
      assert.ok(reply.sources.some((source) => /kigalicity\\.gov\\.rw/.test(source.url ?? "")));
    }
  });

  it("detects English attraction questions and answers in English", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({
      query: "What attractions can I visit in Kicukiro?",
    }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /^Kicukiro District highlights include/);
  });

  it("detects French attraction questions and answers in French", async () => {
    const reply = await runAssistant(AssistantRequestSchema.parse({
      query: "Quels sont les sites à visiter à Kigali ?",
    }));
    assert.equal(reply.intent, "general_knowledge");
    assert.match(reply.answer_kiny, /^Parmi les sites à visiter à Kigali/);
  });
});
