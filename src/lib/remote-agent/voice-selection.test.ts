import assert from "node:assert/strict";
import test from "node:test";
import { FEMALE_PITCH, MALE_PITCH, pickVoice } from "./voice-selection";

const voices = [
  { name: "English United States", lang: "en-US", localService: true, default: true },
  { name: "en-us-x-iom#male_1-local", lang: "en_US", localService: true },
  { name: "en-us-x-sfg#female_2-local", lang: "en_US", localService: true },
  { name: "Français France", lang: "fr-FR", localService: true },
  { name: "Thomas (Female)", lang: "fr-FR" },
];

test("a voice whose name states the gender is used as is", () => {
  const male = pickVoice(voices, ["en-", "en_"], "male");
  assert.equal(male.voice?.name, "en-us-x-iom#male_1-local");
  assert.equal(male.genderMatched, true);
  assert.equal(male.pitch, 1);
  assert.equal(pickVoice(voices, ["en-", "en_"], "female").voice?.name, "en-us-x-sfg#female_2-local");
});

test("an unlabelled voice is still used, with a lower or higher pitch, so the agent is never silent", () => {
  const male = pickVoice(voices, ["fr-", "fr_"], "male");
  assert.equal(male.voice?.name, "Français France");
  assert.equal(male.genderMatched, false);
  assert.equal(male.pitch, MALE_PITCH);
  const female = pickVoice([{ name: "Français France", lang: "fr-FR" }], ["fr-"], "female");
  assert.equal(female.voice?.name, "Français France");
  assert.equal(female.pitch, FEMALE_PITCH);
});

test("a voice labelled with the opposite gender is never used for the other gender", () => {
  const onlyFemale = [{ name: "Thomas (Female)", lang: "fr-FR" }];
  assert.equal(pickVoice(onlyFemale, ["fr-"], "male").voice, null);
});

test("no voice for the language means no voice (the answer stays as text)", () => {
  assert.equal(pickVoice(voices, ["rw"], "male").voice, null);
  assert.equal(pickVoice([], ["en-"], "female").voice, null);
});

test("woman and man are told apart", () => {
  const v = [{ name: "Voice Woman", lang: "en-GB" }, { name: "Voice Man", lang: "en-GB" }];
  assert.equal(pickVoice(v, ["en-"], "male").voice?.name, "Voice Man");
  assert.equal(pickVoice(v, ["en-"], "female").voice?.name, "Voice Woman");
});
