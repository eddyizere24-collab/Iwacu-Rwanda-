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
    assert.deepEqual(classifyRemoteCommand("Open local leaders"), { type: "navigate", path: "/abayobozi" });
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
});
