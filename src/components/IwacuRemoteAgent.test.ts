import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  classifyRemoteCommand,
  detectSpokenLocale,
  getSpeechRecognitionHint,
  REMOTE_AGENT_ALLOWED_ROUTES,
} from "@/lib/remote-agent/commands";

async function source(path: string): Promise<string> {
  return readFile(join(process.cwd(), path), "utf8");
}

test("voice language is inferred from recognized speech without a visible language picker", () => {
  assert.equal(detectSpokenLocale("Muraho, ndashaka kumenya aho ndi"), "rw");
  assert.equal(detectSpokenLocale("Hello, I want to find my location"), "en");
  assert.equal(detectSpokenLocale("Bonjour, je voudrais connaître ma position"), "fr");
  assert.equal(detectSpokenLocale("Musanze"), null);
  assert.equal(getSpeechRecognitionHint("rw", ["fr-FR", "en-US"]), "fr-FR");
  assert.equal(getSpeechRecognitionHint("rw", ["en-US"]), "en-US");
  assert.equal(getSpeechRecognitionHint("rw", []), "rw-RW");
});

test("voice commands operate only existing IWACU routes and page sections", () => {
  assert.deepEqual(classifyRemoteCommand("Where am I?"), { type: "location" });
  assert.deepEqual(classifyRemoteCommand("Menya aho ndi"), { type: "location" });
  assert.deepEqual(classifyRemoteCommand("Read this page"), { type: "read_page" });
  assert.deepEqual(classifyRemoteCommand("Soma uru rupapuro"), { type: "read_page" });
  assert.deepEqual(classifyRemoteCommand("Open local leaders"), {
    type: "navigate",
    path: "/#iwacu-local-leaders",
  });
  assert.ok(REMOTE_AGENT_ALLOWED_ROUTES.includes("/amenyesha"));
  assert.ok(!REMOTE_AGENT_ALLOWED_ROUTES.includes("/admin"));
  assert.deepEqual(classifyRemoteCommand("Open an unknown admin page"), {
    type: "ask",
    query: "Open an unknown admin page",
  });
});

test("voice session controls and explicit spoken call confirmation are recognized", () => {
  assert.equal(classifyRemoteCommand("Stop speaking").type, "stop_speaking");
  assert.equal(classifyRemoteCommand("Subiramo").type, "repeat");
  assert.equal(classifyRemoteCommand("Speak slowly").type, "slower");
  assert.equal(classifyRemoteCommand("Komeza").type, "resume");
  assert.equal(classifyRemoteCommand("Close assistant").type, "close");
  assert.equal(classifyRemoteCommand("Subira inyuma").type, "back");
  assert.equal(classifyRemoteCommand("Jya hejuru").type, "scroll_top");
  assert.equal(classifyRemoteCommand("Jya hasi").type, "scroll_bottom");
  assert.equal(classifyRemoteCommand("Yego").type, "confirm_call");
  assert.equal(classifyRemoteCommand("Yes, confirm").type, "confirm_call");
  assert.equal(classifyRemoteCommand("Oui, je confirme").type, "confirm_call");
  assert.equal(classifyRemoteCommand("Oya").type, "cancel_call");
  assert.equal(classifyRemoteCommand("No, cancel").type, "cancel_call");
  assert.deepEqual(classifyRemoteCommand("Hindura ijwi ry'umugore"), { type: "set_voice", gender: "female" });
  assert.deepEqual(classifyRemoteCommand("Hindura ijwi ry'umugabo"), { type: "set_voice", gender: "male" });
});

test("the remote agent is only a compact top-header control and reuses the existing site providers", async () => {
  const header = await source("src/components/AppHeader.tsx");
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(header, /<IwacuRemoteAgent \/>/);
  assert.ok(header.indexOf("<IwacuRemoteAgent />") > header.indexOf('href="/amenyesha"'));
  assert.ok(header.indexOf("<IwacuRemoteAgent />") < header.indexOf("<AccessibilitySettings />"));
  assert.match(agent, /useI18n\(\)/);
  assert.match(agent, /useSharedLocation\(\)/);
  assert.match(agent, /setLocale\(detected\)/);
  assert.match(agent, /fetch\("\/api\/ishakiro"/);
  assert.match(agent, /router\.push\(command\.path\)/);
  assert.match(agent, /getElementById\("main-content"\)/);
  assert.match(agent, /recognition\.continuous = true/);
  assert.match(agent, /cancelSpeech\(true\)/);
  assert.match(agent, /window\.speechSynthesis\.cancel\(\)/);
  assert.doesNotMatch(agent, /<textarea\b|<input\b|LanguageSwitcher|VoiceLab/);
  assert.doesNotMatch(agent, /<main\b|<header\b/);
});

test("location is taken from the existing location provider, not a mock or an IP guess", async () => {
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(agent, /location\.locate\(\)/);
  assert.match(agent, /toAssistantLocation\(location\.data\)/);
  assert.match(agent, /!location\.isLastKnown/);
  assert.doesNotMatch(agent, /mockLocation|DEMO FIXTURE|fakeLocation/);
});

test("call actions require a spoken confirmation and verified emergency number", async () => {
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(agent, /VERIFIED_EMERGENCY_NUMBERS\.find/);
  assert.match(agent, /pendingCallRef\.current/);
  assert.match(agent, /command\.type === "confirm_call"/);
  assert.match(agent, /window\.location\.href = "tel:" \+ digits/);
  assert.match(agent, /isSafeCompletePhone/);
  assert.match(agent, /asksForPhoneNumber/);
  assert.match(agent, /phoneDigitsForSpeech/);
  assert.match(agent, /Say yes if you want me to open the phone call/);
  assert.match(agent, /VERIFIED_EMERGENCY_NUMBERS\.find/);
});

test("Kinyarwanda TTS fallback is owner-gated, rate-limited and does not upload microphone audio", async () => {
  const route = await source("src/app/api/remote-agent/tts/route.ts");
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(route, /IWACU_REMOTE_AGENT_PINDO_TTS_ENABLED !== "true"/);
  assert.doesNotMatch(route, /MALE_VOICE_VERIFIED/);
  assert.match(route, /createIpRateLimiter/);
  assert.match(route, /https:\/\/api\.pindo\.io\/ai\/tts\/rw\/public/);
  assert.match(route, /audioUrl\.protocol !== "https:"/);
  assert.match(agent, /fetch\("\/api\/remote-agent\/tts"/);
  assert.doesNotMatch(route, /getUserMedia|MediaRecorder/);
});

test("the agent always speaks with a voice of the right language and separates male and female by pitch when the phone does not label voices", async () => {
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(agent, /pickVoice\(window\.speechSynthesis\.getVoices\(\), prefixes, gender\)/);
  assert.match(agent, /utterance\.pitch = pick\.pitch/);
  assert.doesNotMatch(agent, /No verified voice matching/);
});

test("Iwacu Agent behaves like a remote control: one tap starts it, nothing opens, a long press shows the written conversation", async () => {
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(agent, /aria-pressed=\{open\}/);
  assert.match(agent, /if \(open\) closeAgent\(\);\s*else \{ unlockAudio\(\); onOpen\(\); \}/);
  assert.match(agent, /window\.setTimeout\(\(\) => \{[\s\S]{0,200}setLogOpen\(true\)/);
  assert.match(agent, /\{logOpen && portalTarget && createPortal\(/);
  assert.doesNotMatch(agent, /\{open && portalTarget && createPortal\(/);
  assert.match(agent, /Iwacu Agent/);
  assert.doesNotMatch(agent, /Umufasha w'ijwi|Remote Agent|assistant vocal|voice assistant/);
});

test("the agent never answers with a refusal: it says what it can do, and acts on one keyword", async () => {
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(agent, /reply\.intent === "out_of_scope"/);
  assert.match(agent, /helpText\(activeLocale\)/);
  assert.match(agent, /command\.type === "switch_language"/);
  assert.match(agent, /command\.needsLocation/);
  assert.match(agent, /now - handledAtRef\.current < 2000/);
});

test("Kinyarwanda voice is unlocked on the tap, fetched in parallel and falls back to the phone's own connection", async () => {
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(agent, /unlockAudio\(\); onOpen\(\)/);
  assert.match(agent, /chunks\.map\(\(part\) => fetchKinyarwandaAudioUrl\(part\)\)/);
  assert.match(agent, /https:\/\/api\.pindo\.io\/ai\/tts\/rw\/public/);
  assert.match(agent, /speechRateRef = useRef\(1\.25\)/);
});

test("the agent greets first and listens afterwards once the microphone is allowed, at full volume", async () => {
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.match(agent, /iwacu-agent-mic-ok/);
  assert.match(agent, /afterSpeechRef\.current = listenOnce/);
  assert.match(agent, /utterance\.volume = 1/);
});

test("the greeting names Iwacu Agent in every language and the engine is woken by the first touch", async () => {
  const agent = await source("src/components/IwacuRemoteAgent.tsx");
  assert.equal((agent.match(/greeting: "[^"]*Iwacu Agent\./g) ?? []).length, 3);
  assert.match(agent, /addEventListener\("pointerdown", wake/);
  assert.match(agent, /pausedForSpeechRef\.current = true/);
});
