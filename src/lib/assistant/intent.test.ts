import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AssistantContextSchema } from "./contracts";
import { classifyAssistantIntent, extractPlacePair } from "./intent";

const evaluationQuestions: Array<[string, string]> = [
  [
    "Urinde?",
    "identity"
  ],
  [
    "Who are you?",
    "identity"
  ],
  [
    "Qui êtes-vous ?",
    "identity"
  ],
  [
    "Qui es-tu ?",
    "identity"
  ],
  [
    "Mu Rwanda hari uturere tungahe?",
    "national_facts"
  ],
  [
    "How many districts are there in Rwanda?",
    "national_facts"
  ],
  [
    "Combien de districts y a-t-il au Rwanda?",
    "national_facts"
  ],
  [
    "Meya w'Akarere ka Gasabo ni nde?",
    "leader_by_place"
  ],
  [
    "Ninde uyobora umurenge wa Kacyiru?",
    "leader_by_place"
  ],
  [
    "Umuyobozi w'umurenge wa Kacyiru ni nde?",
    "leader_by_place"
  ],
  [
    "Who leads Kacyiru?",
    "leader_by_place"
  ],
  [
    "Who is the mayor of Gasabo?",
    "leader_by_place"
  ],
  [
    "Meya wa Gasabo ni nde?",
    "leader_by_place"
  ],
  [
    "Umuyobozi wa Kacyiru ni nde?",
    "leader_by_place"
  ],
  [
    "Umuyobozi w'Akarere ka Gasabo ni nde?",
    "leader_by_place"
  ],
  [
    "Qui est le maire de Gasabo?",
    "leader_by_place"
  ],
  [
    "Qui dirige le secteur de Kacyiru?",
    "leader_by_place"
  ],
  [
    "Meya w'Akarere ka Huye ni nde?",
    "leader_by_place"
  ],
  [
    "Umuyobozi w'akagari ka Kamatamu ni nde?",
    "leader_by_place"
  ],
  [
    "Umukuru w'umudugudu wa Kabagari ni nde?",
    "leader_by_place"
  ],
  [
    "Who is the leader of Gisenyi?",
    "leader_by_place"
  ],
  [
    "Qui est le maire de Kigali?",
    "leader_by_place"
  ],
  [
    "Qui dirige le district de Gasabo?",
    "leader_by_place"
  ],
  [
    "Meya wa Huye ni nde?",
    "leader_by_place"
  ],
  [
    "Ninde uyobora Akarere ka Gasabo?",
    "leader_by_place"
  ],
  [
    "Who is in charge of Kacyiru?",
    "leader_by_place"
  ],
  [
    "Who leads the village of Kamatamu?",
    "leader_by_place"
  ],
  [
    "Ninde uyobora aho ndi?",
    "leader_by_location"
  ],
  [
    "Ninde uyobora aho uri?",
    "leader_by_location"
  ],
  [
    "Ninde uyobora aho turi?",
    "leader_by_location"
  ],
  [
    "Mpa nimero z'umuyobozi w'umudugudu wanjye.",
    "leader_by_location"
  ],
  [
    "Tell me my village leader's number",
    "leader_by_location"
  ],
  [
    "Who leads near me?",
    "leader_by_location"
  ],
  [
    "Mpa nimero y'umuyobozi uri hafi yanjye",
    "leader_by_location"
  ],
  [
    "Menya umuyobozi w'aho ndi",
    "leader_by_location"
  ],
  [
    "Ninde uyobora iwacu?",
    "leader_by_location"
  ],
  [
    "Umuyobozi wanjye ni nde?",
    "leader_by_location"
  ],
  [
    "Who is in charge where I am?",
    "leader_by_location"
  ],
  [
    "Mpa nimero y'umukuru w'umudugudu wanjye",
    "leader_by_location"
  ],
  [
    "Shaka umuyobozi w'aho ndi",
    "leader_by_location"
  ],
  [
    "Tell me the leader of my village",
    "leader_by_location"
  ],
  [
    "Ninde uri hafi yanjye uyobora?",
    "leader_by_location"
  ],
  [
    "My location leader please",
    "leader_by_location"
  ],
  [
    "Who manages near me?",
    "leader_by_location"
  ],
  [
    "Menya aho ndi",
    "my_location"
  ],
  [
    "Aho ndi he?",
    "my_location"
  ],
  [
    "Where am I?",
    "my_location"
  ],
  [
    "Où suis-je?",
    "my_location"
  ],
  [
    "Shaka umuyobozi witwa Muhire Boniface",
    "person_search"
  ],
  [
    "Nshaka umuyobozi witwa John Doe",
    "person_search"
  ],
  [
    "Ndashaka umuyobozi witwa Peter Nkurunziza",
    "person_search"
  ],
  [
    "Umuyobozi witwa Aline Kayitesi",
    "person_search"
  ],
  [
    "Umuntu witwa John Doe",
    "person_search"
  ],
  [
    "Leader named Jane Doe",
    "person_search"
  ],
  [
    "Person named John Smith",
    "person_search"
  ],
  [
    "Find leader James Brown",
    "person_search"
  ],
  [
    "Search for leader called Peter Smith",
    "person_search"
  ],
  [
    "I think Muhire Boniface leads in Western Province",
    "person_search"
  ],
  [
    "I believe Alice Brown is the leader in Kigali",
    "person_search"
  ],
  [
    "Who is John Smith?",
    "person_search"
  ],
  [
    "Who's Jane Doe?",
    "person_search"
  ],
  [
    "Qui est Jean Bosco?",
    "person_search"
  ],
  [
    "Ninde witwa Aline?",
    "person_search"
  ],
  [
    "Ndinde witwa Claudine?",
    "person_search"
  ],
  [
    "Leader called Muhire",
    "person_search"
  ],
  [
    "Umuyobozi witwa Muhire",
    "person_search"
  ],
  [
    "I think Joseph Mugisha leads in Western Province, maybe a sector",
    "person_search"
  ],
  [
    "Who is Eric Niyonzima?",
    "person_search"
  ],
  [
    "Polisi ndatabaza",
    "emergency"
  ],
  [
    "Hamagara ambulance",
    "emergency"
  ],
  [
    "Icyo nakora mu nkongi?",
    "emergency"
  ],
  [
    "Emergency number please",
    "emergency"
  ],
  [
    "Nimero za ambulance",
    "emergency"
  ],
  [
    "Impanuka yabaye",
    "emergency"
  ],
  [
    "Polisi",
    "emergency"
  ],
  [
    "Ihohoterwa",
    "emergency"
  ],
  [
    "Numéro urgence",
    "emergency"
  ],
  [
    "Fire rescue",
    "emergency"
  ],
  [
    "Wakora iki?",
    "help"
  ],
  [
    "Ushobora gukora iki?",
    "help"
  ],
  [
    "Wafasha iki?",
    "help"
  ],
  [
    "Wamfasha iki?",
    "help"
  ],
  [
    "Nkeneye ubufasha",
    "help"
  ],
  [
    "Ungire inama",
    "help"
  ],
  [
    "What can you do?",
    "help"
  ],
  [
    "How can you help me?",
    "help"
  ],
  [
    "Conseil",
    "help"
  ],
  [
    "Comment aider?",
    "help"
  ],
  [
    "Muraho",
    "greeting"
  ],
  [
    "Mwaramutse",
    "greeting"
  ],
  [
    "Mwiriwe",
    "greeting"
  ],
  [
    "Bite",
    "greeting"
  ],
  [
    "Hello",
    "greeting"
  ],
  [
    "Hi",
    "greeting"
  ],
  [
    "Bonjour",
    "greeting"
  ],
  [
    "Bonsoir",
    "greeting"
  ],
  [
    "Salut",
    "greeting"
  ],
  [
    "Mwaramutse neza",
    "greeting"
  ],
  [
    "Who will win tonight's match?",
    "out_of_scope"
  ],
  [
    "What is the weather today?",
    "out_of_scope"
  ],
  [
    "Give me a joke",
    "out_of_scope"
  ],
  [
    "Explain quantum mechanics",
    "out_of_scope"
  ],
  [
    "Write a poem about the moon",
    "out_of_scope"
  ],
  [
    "Tell me a song",
    "out_of_scope"
  ],
  [
    "What is the capital of France?",
    "out_of_scope"
  ],
  [
    "How do I cook rice?",
    "out_of_scope"
  ],
  [
    "Translate this sentence",
    "out_of_scope"
  ],
  [
    "What time is it?",
    "out_of_scope"
  ],
  [
    "Imbibi za Kacyiru ziri he?",
    "boundaries"
  ],
  [
    "Show the boundaries of Gasabo",
    "boundaries"
  ],
  [
    "Where is the border of this district?",
    "boundaries"
  ],
  [
    "Limites du secteur de Kacyiru",
    "boundaries"
  ],
  [
    "Umurongo w'imbibi za Kamatamu",
    "boundaries"
  ],
  [
    "Intera iri hagati ya Gasabo na Huye ni metero zingahe?",
    "distance"
  ],
  [
    "How far is Kacyiru from Gasabo?",
    "distance"
  ],
  [
    "Quelle est la distance entre Kigali et Huye?",
    "distance"
  ],
  [
    "Ibyapa biri hafi yanjye ni ibihe?",
    "signs"
  ],
  [
    "Show road signs near Kacyiru",
    "signs"
  ],
  [
    "Panneaux routiers de Gasabo",
    "signs"
  ],
  [
    "Akarere ka Gasabo gafite imirenge ingahe?",
    "place_facts"
  ],
  [
    "How many sectors are in Gasabo district?",
    "place_facts"
  ],
  [
    "Combien de secteurs compte le district de Gasabo?",
    "place_facts"
  ]
];

describe("Ishakiro intent evaluation v1", () => {
  it("contains at least 100 distinct evaluation questions", () => {
    assert.ok(evaluationQuestions.length >= 100);
    assert.equal(new Set(evaluationQuestions.map(([query]) => query)).size, evaluationQuestions.length);
  });

  for (const [query, expectedIntent] of evaluationQuestions) {
    it(query, () => {
      const result = classifyAssistantIntent(query, null, null);
      assert.equal(result.intent, expectedIntent, "wrong intent for: " + query);

      if (expectedIntent === "person_search") {
        assert.ok(result.personQuery && result.personQuery.length >= 2, "person name was not extracted");
      }
      if (expectedIntent === "leader_by_place") {
        assert.ok(result.placeQuery && result.placeQuery.length >= 2, "place was not extracted");
      }
    });
  }

  it("recognises a follow-up contact question using prior conversation context", () => {
    const context = AssistantContextSchema.parse({
      intent: "leader_by_place",
      scope_code: "RW-01-01-01",
      place_name: "Kacyiru",
      level: "sector",
    });
    const result = classifyAssistantIntent("Nimero ye", context, null);
    assert.equal(result.intent, "leader_contact_followup");
  });

  it("keeps the previous place when a follow-up asks for its leader", () => {
    const context = AssistantContextSchema.parse({
      intent: "place_lookup",
      scope_code: "RW-P1-D12-S1207",
      place_name: "Kacyiru",
      level: "sector",
    });
    const result = classifyAssistantIntent("Ninde uyobora aka karere?", context, null);
    assert.equal(result.intent, "leader_by_place");
    assert.equal(result.placeQuery, null);
  });

  it("routes a conversational request for more detail to the previous place", () => {
    const context = AssistantContextSchema.parse({
      intent: "place_lookup",
      scope_code: "RW-P1-D12-S1207",
      place_name: "Kacyiru",
      level: "sector",
    });
    const result = classifyAssistantIntent("Mbwira byinshi kuri yo", context, null);
    assert.equal(result.intent, "place_facts");
    assert.equal(result.placeQuery, null);
  });

  it("recognizes Kinyarwanda contact follow-up with 'kandi'", () => {
    const context = AssistantContextSchema.parse({
      intent: "leader_by_place",
      scope_code: "RW-P1-D12-S1207",
      place_name: "Kacyiru",
      level: "sector",
    });
    assert.equal(classifyAssistantIntent("Kandi nimero ye?", context, null).intent, "leader_contact_followup");
  });

  it("recognizes contextual leader follow-up questions", () => {
    const context = AssistantContextSchema.parse({
      intent: "place_lookup",
      scope_code: "RW-P1-D12-S1207",
      place_name: "Kacyiru",
      level: "sector",
    });
    assert.equal(classifyAssistantIntent("Ni nde?", context, null).intent, "leader_by_place");
    assert.equal(classifyAssistantIntent("Who leads there?", context, null).intent, "leader_by_place");
  });

  it("switches to a newly named place during an ongoing conversation", () => {
    const context = AssistantContextSchema.parse({
      intent: "place_lookup",
      scope_code: "RW-P1-D12-S1207",
      place_name: "Kacyiru",
      level: "sector",
    });
    const lookup = classifyAssistantIntent("Naho Kicukiro?", context, null);
    assert.equal(lookup.intent, "place_lookup");
    assert.equal(lookup.placeQuery, "kicukiro");

    const facts = classifyAssistantIntent("Naho Kicukiro ifite imirenge ingahe?", context, null);
    assert.equal(facts.intent, "place_facts");
    assert.equal(facts.placeQuery, "kicukiro");
  });

  it("recognizes contextual parent and child-list follow-ups", () => {
    const context = AssistantContextSchema.parse({
      intent: "place_lookup",
      scope_code: "RW-P1-D12-S1207",
      place_name: "Kacyiru",
      level: "sector",
    });
    assert.equal(classifyAssistantIntent("Muri akahe karere?", context, null).intent, "place_facts");
    assert.equal(classifyAssistantIntent("Ni izihe?", context, null).intent, "place_facts");
  });

  it("does not treat emergency questions as ordinary leader searches", () => {
    const result = classifyAssistantIntent("Meya wa Gasabo, police emergency", null, null);
    assert.equal(result.intent, "emergency");
  });
});


describe("Ishakiro place extraction and explicit research routing", () => {
  it("extracts the place from Kinyarwanda hierarchy questions", () => {
    const result = classifyAssistantIntent("Akarere ka Gasabo gafite imirenge ingahe?", null, null);
    assert.equal(result.intent, "place_facts");
    assert.equal(result.placeQuery, "gasabo");
  });
  it("extracts the place from English hierarchy questions", () => {
    const result = classifyAssistantIntent("How many sectors are in Gasabo district?", null, null);
    assert.equal(result.intent, "place_facts");
    assert.equal(result.placeQuery, "gasabo");
  });
  it("extracts the place from French hierarchy questions", () => {
    const result = classifyAssistantIntent("Combien de secteurs compte le district de Gasabo?", null, null);
    assert.equal(result.intent, "place_facts");
    assert.equal(result.placeQuery, "gasabo");
  });
  it("resolves a named district parent question in Kinyarwanda", () => {
    const result = classifyAssistantIntent("Akarere ka Gasabo kari mu Ntara iyihe?", null, null);
    assert.equal(result.intent, "place_facts");
    assert.equal(result.placeQuery, "gasabo");
    assert.equal(result.requestedLevel, "district");
    assert.equal(result.requestedParent, true);
  });
  it("resolves a named-place parent question in English", () => {
    const result = classifyAssistantIntent("Which province is Gasabo in?", null, null);
    assert.equal(result.intent, "place_facts");
    assert.equal(result.placeQuery, "gasabo");
    assert.equal(result.requestedParent, true);
    assert.equal(result.requestedLevel, "district");
  });
  it("resolves a named-place parent question in French", () => {
    const result = classifyAssistantIntent("Dans quelle province se trouve Gasabo ?", null, null);
    assert.equal(result.intent, "place_facts");
    assert.equal(result.placeQuery, "gasabo");
    assert.equal(result.requestedParent, true);
    assert.equal(result.requestedLevel, "district");
  });
  it("extracts the place from English boundaries questions", () => {
    const result = classifyAssistantIntent("Show the boundaries of Gasabo", null, null);
    assert.equal(result.intent, "boundaries");
    assert.equal(result.placeQuery, "gasabo");
  });
  it("extracts the place from Kinyarwanda boundaries questions", () => {
    const result = classifyAssistantIntent("Imbibi za Kacyiru ziri he?", null, null);
    assert.equal(result.intent, "boundaries");
    assert.equal(result.placeQuery, "kacyiru");
  });
  it("extracts both explicitly named places in Kinyarwanda", () => {
    const result = classifyAssistantIntent("Intera iri hagati ya Gasabo na Huye ni metero zingahe?", null, null);
    assert.equal(result.intent, "distance");
    assert.equal(result.placeQuery, "gasabo");
    assert.equal(result.secondaryPlaceQuery, "huye");
    assert.deepEqual(extractPlacePair("Intera iri hagati ya Gasabo na Huye ni metero zingahe?"), { first: "gasabo", second: "huye" });
  });
  it("extracts both explicitly named places in English", () => {
    const result = classifyAssistantIntent("How far is Kacyiru from Gasabo?", null, null);
    assert.equal(result.intent, "distance");
    assert.equal(result.placeQuery, "kacyiru");
    assert.equal(result.secondaryPlaceQuery, "gasabo");
  });
  it("extracts both explicitly named places in French", () => {
    const result = classifyAssistantIntent("Quelle est la distance entre Kigali et Huye?", null, null);
    assert.equal(result.intent, "distance");
    assert.equal(result.placeQuery, "kigali");
    assert.equal(result.secondaryPlaceQuery, "huye");
  });
  it("routes explicit Kinyarwanda internet research only when requested", () => {
    const result = classifyAssistantIntent("Shakisha amakuru kuri internet ajyanye na gahunda z'uburezi mu Rwanda", null, null);
    assert.equal(result.intent, "external_research");
    assert.match(result.placeQuery ?? "", /gahunda z'uburezi mu rwanda/i);
  });
  it("routes explicit English and French web research", () => {
    assert.equal(classifyAssistantIntent("Search the web for Rwanda education policy", null, null).intent, "external_research");
    assert.equal(classifyAssistantIntent("Recherche en ligne sur la politique éducative au Rwanda", null, null).intent, "external_research");
  });
  it("does not turn ordinary online topics into web-search instructions", () => {
    assert.equal(classifyAssistantIntent("What is online banking?", null, null).intent, "out_of_scope");
  });
  it("keeps emergencies ahead of external-search routing", () => {
    assert.equal(classifyAssistantIntent("Search online for emergency ambulance number", null, null).intent, "emergency");
  });
});
