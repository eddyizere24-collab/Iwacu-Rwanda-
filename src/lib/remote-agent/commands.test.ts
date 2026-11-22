import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyRemoteCommand,
  detectSpokenLocale,
  getSpeechRecognitionHint,
} from "./commands";

describe("remote agent spoken-language detection", () => {
  it("detects Kinyarwanda without requiring a language picker", () => {
    assert.equal(detectSpokenLocale("Muraho, ndashaka kumenya aho ndi"), "rw");
  });

  it("detects English", () => {
    assert.equal(detectSpokenLocale("Hello, I want to find my location"), "en");
  });

  it("detects French", () => {
    assert.equal(detectSpokenLocale("Bonjour, je voudrais connaître ma position"), "fr");
  });

  it("does not force a language when there is too little evidence", () => {
    assert.equal(detectSpokenLocale("Musanze"), null);
  });

  it("uses the phone language as a recognition hint without displaying a selector", () => {
    assert.equal(getSpeechRecognitionHint("rw", ["fr-FR", "en-US"]), "fr-FR");
    assert.equal(getSpeechRecognitionHint("rw", ["en-US"]), "en-US");
    assert.equal(getSpeechRecognitionHint("rw", []), "rw-RW");
  });
});

describe("remote agent remote-control commands", () => {
  it("recognizes location requests", () => {
    assert.deepEqual(classifyRemoteCommand("Menya aho ndi"), { type: "location" });
    assert.deepEqual(classifyRemoteCommand("Where am I?"), { type: "location" });
    assert.deepEqual(classifyRemoteCommand("Où suis-je ?"), { type: "location" });
  });

  it("recognizes page reading", () => {
    assert.equal(classifyRemoteCommand("Read this page").type, "read_page");
    assert.equal(classifyRemoteCommand("Soma uru rupapuro").type, "read_page");
  });

  it("maps only allow-listed existing website routes", () => {
    assert.deepEqual(classifyRemoteCommand("Open local leaders"), { type: "navigate", path: "/#iwacu-local-leaders" });
    assert.deepEqual(classifyRemoteCommand("Jya ku amamenyesha"), { type: "navigate", path: "/amenyesha" });
    assert.deepEqual(classifyRemoteCommand("Go to an unknown admin page"), {
      type: "ask",
      query: "Go to an unknown admin page",
    });
  });

  it("recognizes voice session controls", () => {
    assert.equal(classifyRemoteCommand("Stop speaking").type, "stop_speaking");
    assert.equal(classifyRemoteCommand("Subiramo").type, "repeat");
    assert.equal(classifyRemoteCommand("Speak slowly").type, "slower");
    assert.equal(classifyRemoteCommand("Komeza").type, "resume");
    assert.equal(classifyRemoteCommand("Close assistant").type, "close");
  });

  it("recognizes an explicit spoken call confirmation", () => {
    assert.equal(classifyRemoteCommand("Yes, confirm").type, "confirm_call");
    assert.equal(classifyRemoteCommand("No, cancel").type, "cancel_call");
  });

  it("recognizes voice switching without a settings picker", () => {
    assert.deepEqual(classifyRemoteCommand("Hindura ijwi ry'umugore"), { type: "set_voice", gender: "female" });
    assert.deepEqual(classifyRemoteCommand("Hindura ijwi ry'umugabo"), { type: "set_voice", gender: "male" });
    assert.deepEqual(classifyRemoteCommand("Female voice"), { type: "set_voice", gender: "female" });
    assert.deepEqual(classifyRemoteCommand("Male voice"), { type: "set_voice", gender: "male" });
  });
});

describe("remote agent emergency and conversation commands", () => {
  it("recognizes emergency numbers and the written conversation", () => {
  assert.deepEqual(classifyRemoteCommand("Nimero z'ubutabazi"), { type: "emergency" });
  assert.deepEqual(classifyRemoteCommand("Emergency numbers"), { type: "emergency" });
  assert.deepEqual(classifyRemoteCommand("Numéros d'urgence"), { type: "emergency" });
  assert.deepEqual(classifyRemoteCommand("Erekana ibyo twavuze"), { type: "show_log" });
  assert.deepEqual(classifyRemoteCommand("Show conversation"), { type: "show_log" });
  });
});

describe("remote agent keyword spotting", () => {
  it("acts on one recognised word inside a long, messy sentence", () => {
    assert.equal(classifyRemoteCommand("Muraho nari ndi kugenda mu nzira numva ntazi neza ndashaka kumenya aho ndi ubu").type, "location");
    assert.equal(classifyRemoteCommand("Well hello there, I was walking and I need the emergency numbers please").type, "emergency");
    assert.equal(classifyRemoteCommand("Mbwira nimero z'ubutabazi ariko vuba vuba").type, "emergency");
    assert.equal(classifyRemoteCommand("Bonjour je cherche les numéros d'urgence s'il vous plaît").type, "emergency");
  });

  it("keeps calls and leaders on the question path with location when the person means their own place", () => {
    assert.equal(classifyRemoteCommand("Hamagara polisi").type, "ask");
    const own = classifyRemoteCommand("Nshaka umuyobozi w'umudugudu wanjye");
    assert.deepEqual(own, { type: "ask", query: "Nshaka umuyobozi w'umudugudu wanjye", needsLocation: true });
    const other = classifyRemoteCommand("Ninde uyobora umurenge wa Kacyiru? Ni umuyobozi ki?");
    assert.equal(other.type, "ask");
    assert.equal((other as { needsLocation?: boolean }).needsLocation, false);
  });

  it("answers a plain request for help or a greeting with what the agent can do instead of refusing", () => {
    assert.equal(classifyRemoteCommand("Ndashaka umfashe").type, "help");
    assert.equal(classifyRemoteCommand("Muraho").type, "help");
    assert.equal(classifyRemoteCommand("Hello").type, "help");
    assert.equal(classifyRemoteCommand("Can you help me").type, "help");
  });

  it("switches the spoken language by voice", () => {
    assert.deepEqual(classifyRemoteCommand("Vuga icyongereza"), { type: "switch_language", locale: "en" });
    assert.deepEqual(classifyRemoteCommand("Speak French"), { type: "switch_language", locale: "fr" });
    assert.deepEqual(classifyRemoteCommand("Parle en Kinyarwanda"), { type: "switch_language", locale: "rw" });
    assert.deepEqual(classifyRemoteCommand("Kinyarwanda"), { type: "switch_language", locale: "rw" });
  });
});

