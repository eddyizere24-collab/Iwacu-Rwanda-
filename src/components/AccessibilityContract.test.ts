import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { translateText } from "../lib/i18n";

async function source(path: string): Promise<string> {
  return readFile(join(process.cwd(), path), "utf8");
}

test("the skip link is first in the app shell, localized, and targets the main landmark", async () => {
  const layout = await source("src/app/layout.tsx");
  assert.match(layout, /translateText\("Jya ku bikubiye muri uru rubuga", initialLocale\)/);
  assert.match(layout, /href="#main-content"/);
  assert.match(layout, /<main id="main-content" tabIndex=\{-1\}/);
  assert.equal(translateText("Jya ku bikubiye muri uru rubuga", "en"), "Skip to main content");
  assert.equal(translateText("Jya ku bikubiye muri uru rubuga", "fr"), "Aller au contenu principal");
});

test("accessibility preferences are optional, persistent, schema-checked, and resettable", async () => {
  const provider = await source("src/components/AccessibilityProvider.tsx");
  const settings = await source("src/components/AccessibilitySettings.tsx");
  assert.match(provider, /iwacu-accessibility-v1/);
  assert.match(provider, /normalizeAccessibilitySettings/);
  assert.match(provider, /localStorage\.setItem/);
  assert.match(provider, /resetAccessibilitySettings/);
  for (const option of ["textScale", "highContrast", "reducedMotion", "lowDataMode", "easyUseMode"]) {
    assert.match(provider, new RegExp(option));
  }
  for (const scale of ['"100"', '"125"', '"150"', '"200"']) assert.ok(provider.includes(scale));
  assert.match(settings, /useAccessibleDialog/);
  assert.match(settings, /aria-modal="true"/);
  assert.match(settings, /Amafoto meza ya IWACU RWANDA yose agumaho/);
});

test("the accessibility settings use real radio inputs and labeled switches", async () => {
  const settings = await source("src/components/AccessibilitySettings.tsx");
  assert.match(settings, /type="radio"/);
  assert.match(settings, /name="iwacu-text-scale"/);
  assert.match(settings, /type="checkbox"/);
  assert.match(settings, /aria-labelledby="iwacu-accessibility-title"/);
  assert.match(settings, /aria-describedby="iwacu-accessibility-description"/);
});

test("easy-use mode is optional and retains list, location, leader, AI, emergency and guided routes", async () => {
  const easy = await source("src/components/EasyAccessPanel.tsx");
  assert.match(easy, /if \(!easyUseMode\) return null/);
  for (const phrase of [
    "Menya aho ndi",
    "Bona abayobozi",
    "Hitamo umudugudu ku rutonde",
    "Baza Iwacu AI",
    "tel:112",
    "Mfasha intambwe ku yindi",
    "ReadAloudButton",
    "useAccessibleDialog",
  ]) assert.ok(easy.includes(phrase), `Missing easy-use route: ${phrase}`);
  assert.match(easy, /aria-modal="true"/);
  assert.match(easy, /guideSteps\.length/);
});

test("speech input stays user-initiated and transcript must be reviewed and submitted explicitly", async () => {
  const assistant = await source("src/components/AiSearchAssistant.tsx");
  assert.match(assistant, /function handleVoiceInput\(\)/);
  assert.match(assistant, /recognition\.start\(\)/);
  assert.match(assistant, /setQuery\(transcript\)/);
  assert.match(assistant, /function handleFormSubmit/);
  assert.match(assistant, /onSubmit=\{handleFormSubmit\}/);
  assert.match(assistant, /aria-live="polite"/);
  assert.match(assistant, /recognitionRef\.current\?\.abort\(\)/);
  assert.doesNotMatch(assistant, /recognition\.onresult\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]{0,500}?handleSearch\(/);
});

test("spoken output does not silently substitute an unrelated language voice", async () => {
  const readAloud = await source("src/components/ReadAloudButton.tsx");
  const assistant = await source("src/components/AiSearchAssistant.tsx");
  assert.match(readAloud, /voice\.lang\.toLowerCase\(\)\.startsWith\(languagePrefix/);
  assert.match(assistant, /waitForMatchingSpeechVoice\(languagePrefix\)/);
  assert.match(readAloud, /Nta jwi ry'Ikinyarwanda riri kuri iyi telefone/);
  assert.match(assistant, /Nta jwi ry'Ikinyarwanda riri kuri iyi telefone/);
});

test("reduced-motion and low-data preferences do not disable IWACU's existing photographs", async () => {
  const css = await source("src/app/globals.css");
  const map = await source("src/components/MapPinPicker.tsx");
  for (const image of [
    "rwanda-hills-640.webp",
    "rwanda-hills-1280.webp",
    "akagera-giraffes.jpg",
    "volcanoes-national-park.jpg",
    "tea-plantation-rwanda.jpg",
    "gorilla-face.webp",
    "gorilla-family.webp",
  ]) assert.ok(css.includes(image), `Existing photo reference was removed: ${image}`);
  assert.match(css, /data-iwacu-reduced-motion="true"/);
  assert.match(map, /updateWhenZooming: !lowDataMode/);
  assert.match(map, /keepBuffer: lowDataMode \? 0 : 2/);
  assert.match(map, /if \(lowDataMode\)/);
  assert.match(map, /Imbibi ntizikururwa/);
});

test("the public inclusion guide is trilingual and does not falsely claim RSL videos are available", async () => {
  const page = await source("src/components/AccessibilityInfoPage.tsx");
  const brief = await source("docs/COMMUNITY_ACCESSIBLE_MEDIA_BRIEF_2026-11-11.md");
  for (const locale of ["rw:", "en:", "fr:"]) assert.ok(page.includes(locale));
  assert.match(page, /Ntituratangaza ko ayo mashusho yamaze kuboneka/);
  assert.match(page, /We are not claiming those videos are already available/);
  assert.match(page, /Nous ne prétendons pas que ces vidéos sont déjà disponibles/);
  assert.match(brief, /at least two independent fluent Deaf RSL reviewers/);
  assert.match(brief, /Never use AI-generated signing/);
  assert.match(brief, /These are draft scripts, not recordings/);
  assert.doesNotMatch(page, /<video\b/i);
});

test("location and microphone permissions remain user-controlled", async () => {
  const home = await source("src/app/page.tsx");
  const assistant = await source("src/components/AiSearchAssistant.tsx");
  assert.match(home, /permission\.state !== "granted"/);
  assert.match(home, /function handleLocateClick\(\)/);
  assert.match(home, /onClick=\{handleLocateClick\}/);
  assert.match(assistant, /onClick=\{handleVoiceInput\}/);
  assert.doesNotMatch(assistant, /navigator\.mediaDevices\.getUserMedia/);
  assert.doesNotMatch(assistant, /useEffect\([\s\S]{0,500}recognition\.start\(/);
});

test("easy-use cards distinguish services that need internet from locally saved options", async () => {
  const easy = await source("src/components/EasyAccessPanel.tsx");
  const list = "Urutonde rwabitswe kuri telefone rushobora gukora nta internet. Ntukeneye ikarita.";
  const leaders = "Banza umenye aho uri. Amakuru mashya y'abayobozi asaba internet.";
  const ai = "Iwacu AI ikenera internet. Ushobora kwandika cyangwa kuvuga ikibazo niba telefone ibishyigikira.";
  const emergency = "Nimero zibitswe kuri telefone. Guhamagara ntibisaba internet.";
  for (const phrase of [list, leaders, ai, emergency]) assert.ok(easy.includes(phrase));
  for (const phrase of [list, leaders, ai, emergency]) {
    assert.notEqual(translateText(phrase, "en"), phrase);
    assert.notEqual(translateText(phrase, "fr"), phrase);
  }
});


test("fixed-pixel text utilities scale at every supported accessibility size", async () => {
  const css = await source("src/app/globals.css");
  for (const scale of ["125", "150", "200"]) {
    for (const size of ["14", "15", "16", "17", "18", "19", "20"]) {
      const selector = 'html[data-iwacu-text-size="' + scale + '"] [class*="text-[' + size + 'px]"]';
      assert.ok(css.includes(selector), "Missing text scaling rule: " + selector);
    }
  }
});

test("the AI conversation history is a polite, additions-only screen-reader log", async () => {
  const assistant = await source("src/components/AiSearchAssistant.tsx");
  assert.match(assistant, /role="log"/);
  assert.match(assistant, /aria-label=\{t\("Ikiganiro na Iwacu AI"\)\}/);
  assert.match(assistant, /aria-live="polite"/);
  assert.match(assistant, /aria-relevant="additions"/);
  assert.match(assistant, /aria-atomic="false"/);
});
