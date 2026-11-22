"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, Phone, X } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { useAccessibleDialog } from "@/hooks/useAccessibleDialog";
import { useSharedLocation } from "@/components/LocationProvider";
import { translateText, type Locale } from "@/lib/i18n";
import { VERIFIED_EMERGENCY_NUMBERS } from "@/lib/rwanda-geo";
import type {
  AssistantConversationContext,
  AssistantLocationContext,
  AssistantReply,
} from "@/lib/assistant/contracts";
import {
  classifyRemoteCommand,
  detectSpokenLocale,
  getSpeechRecognitionHint,
  normalizeSpokenText,
  type RemoteAgentCommand,
} from "@/lib/remote-agent/commands";
import { pickVoice, type VoicePick } from "@/lib/remote-agent/voice-selection";
import RW_PHRASES from "@/lib/remote-agent/rw-phrases.json";
import { SILENT_WAV, fetchKinyarwandaAudioUrl, loadPhraseManifest, makeSpeechChunks } from "@/lib/voice/rw-speech";

type SpeechAlternativeLike = { transcript: string; confidence?: number };
type SpeechResultLike = ArrayLike<SpeechAlternativeLike> & { isFinal?: boolean };
type SpeechResultEventLike = { results: ArrayLike<SpeechResultLike>; resultIndex?: number };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type PendingCall = {
  number: string;
  label: string;
  source: string;
};

type AgentHistoryTurn = { role: "user" | "assistant"; content: string };

const LANGUAGES: Record<Locale, { hint: string; greeting: string; listening: string; unavailable: string }> = {
  rw: {
    hint: "Vuga icyo ushaka. Ushobora kuvuga Ikinyarwanda, English cyangwa Français.",
    greeting: RW_PHRASES.greeting,
    listening: "Ndakumva...",
    unavailable: "Iyi browser ntiyemera kumva ijwi hano. Koresha browser ishyigikira Speech Recognition.",
  },
  en: {
    hint: "Tell me what you need. You may speak Kinyarwanda, English or French.",
    greeting: "Hello! I am Iwacu Agent. I am ready to help: tell you where you are, read the emergency numbers, show your local leaders, and answer your questions. Tell me what you need.",
    listening: "I'm listening...",
    unavailable: "This browser does not provide speech recognition here. Please use a supported browser.",
  },
  fr: {
    hint: "Dites-moi ce dont vous avez besoin. Vous pouvez parler en kinyarwanda, anglais ou français.",
    greeting: "Bonjour ! Je suis Iwacu Agent. Je suis prêt à vous aider : vous dire où vous êtes, lire les numéros d'urgence, vous montrer vos responsables locaux et répondre à vos questions. Dites-moi ce dont vous avez besoin.",
    listening: "Je vous écoute...",
    unavailable: "Ce navigateur ne permet pas la reconnaissance vocale ici. Utilisez un navigateur compatible.",
  },
};

const VOICE_TAGS: Record<Locale, string[]> = {
  rw: ["rw-rw", "rw"],
  en: ["en-", "en_"],
  fr: ["fr-", "fr_"],
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const browser = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

async function waitForVoice(locale: Locale, gender: "male" | "female"): Promise<VoicePick<SpeechSynthesisVoice>> {
  const none: VoicePick<SpeechSynthesisVoice> = { voice: null, pitch: 1, genderMatched: false };
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return none;
  const prefixes = VOICE_TAGS[locale];
  const findVoice = () => pickVoice(window.speechSynthesis.getVoices(), prefixes, gender);

  const initial = findVoice();
  if (initial.voice) return initial;
  // Voices are already loaded and none fits this language: there is nothing to wait for.
  if (window.speechSynthesis.getVoices().length > 0) return initial;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(findVoice());
    };
    const handleVoicesChanged = () => {
      if (findVoice().voice) finish();
    };
    const timeout = window.setTimeout(finish, 600);
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
  });
}

function toAssistantLocation(data: ReturnType<typeof useSharedLocation>["data"]): AssistantLocationContext | null {
  if (!data || !data.level || data.level === "country") return null;
  const level = data.level;
  const rank = ["province", "district", "sector", "cell", "village"] as const;
  if (!rank.includes(level as (typeof rank)[number])) return null;
  const current = data.hierarchy?.[level];
  if (!current?.scope_code || !current.name_kiny) return null;

  const path = rank
    .filter((item) => rank.indexOf(item) <= rank.indexOf(level as (typeof rank)[number]))
    .flatMap((item) => {
      const unit = data.hierarchy?.[item];
      return unit?.scope_code && unit.name_kiny
        ? [{ level: item, scope_code: unit.scope_code, name_kiny: unit.name_kiny }]
        : [];
    });

  return {
    level,
    scope_code: current.scope_code,
    name_kiny: current.name_kiny,
    path,
  };
}

function agentLog(event: string, detail = ""): void {
  try {
    const body = JSON.stringify({ event, detail: detail.slice(0, 80) });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/remote-agent/log", new Blob([body], { type: "application/json" }));
    }
  } catch { /* diagnostics are optional */ }
}

function looksLikeSpeechEcho(transcript: string, currentSpeech: string): boolean {
  const heard = normalizeSpokenText(transcript);
  const spoken = normalizeSpokenText(currentSpeech);
  if (!heard || !spoken) return false;
  if (spoken.includes(heard) || heard.includes(spoken)) return true;
  const heardWords = new Set(heard.split(" ").filter((word) => word.length > 2));
  const spokenWords = new Set(spoken.split(" ").filter((word) => word.length > 2));
  if (!heardWords.size || !spokenWords.size) return false;
  let overlap = 0;
  for (const word of heardWords) if (spokenWords.has(word)) overlap += 1;
  return overlap / Math.min(heardWords.size, spokenWords.size) >= 0.72;
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function phoneDigitsForSpeech(value: string): string {
  return phoneDigits(value).split("").join(" ");
}

function isSafeCompletePhone(value: string): boolean {
  if (!value || /[x*•]/i.test(value) || !/^[+0-9().\s-]+$/.test(value)) return false;
  const digits = phoneDigits(value);
  return digits.length >= 9 && digits.length <= 15;
}

function isPhoneContact(type: string): boolean {
  return /phone|mobile|telephone|tel|whatsapp/i.test(type);
}

function pageText(): { text: string; truncated: boolean } {
  const main = document.getElementById("main-content");
  if (!main) return { text: "", truncated: false };

  const clone = main.cloneNode(true) as HTMLElement;
  clone.querySelectorAll([
    "script",
    "style",
    "noscript",
    "button",
    "input",
    "textarea",
    "select",
    "nav",
    "[aria-hidden='true']",
    "[role='dialog']",
    ".sr-only",
    "[data-agent-ignore='true']",
  ].join(",")).forEach((element) => element.remove());

  const text = (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
  const maxLength = 3600;
  return {
    text: text.slice(0, maxLength),
    truncated: text.length > maxLength,
  };
}

function helpText(locale: Locale): string {
  if (locale === "en") return "I can tell you where you are, read the emergency numbers, find your local leaders, read this page aloud and answer questions about Rwanda. Just say one word, for example: where am I, or: emergency.";
  if (locale === "fr") return "Je peux vous dire où vous êtes, lire les numéros d'urgence, trouver vos responsables locaux, lire cette page à voix haute et répondre aux questions sur le Rwanda. Dites simplement un mot, par exemple : où suis-je, ou : urgence.";
  return RW_PHRASES.help;
}

function localizedUnavailableTranslation(locale: Locale): string {
  if (locale === "en") return "I found a result, but I cannot safely confirm a translation of this answer in your language yet. I will not read it using the wrong language voice.";
  if (locale === "fr") return "J'ai trouvé un résultat, mais je ne peux pas encore confirmer sa traduction dans votre langue. Je ne vais pas le lire avec une voix dans une langue incorrecte.";
  return "Nabonye igisubizo, ariko sinshobora kwemeza ko ubusobanuro bwacyo mu rundi rurimi bwagenzuwe.";
}

function localizeAssistantAnswer(answer: string, locale: Locale): string | null {
  if (locale === "rw") return answer;
  const translated = translateText(answer, locale);
  if (translated !== answer) return translated;
  const detected = detectSpokenLocale(answer);
  return detected === locale ? answer : null;
}

export function IwacuRemoteAgent() {
  const { locale, setLocale } = useI18n();
  const location = useSharedLocation();
  const router = useRouter();

  // "open" means the voice session is on (like a remote control that is switched on).
  // Nothing opens on screen: the site stays as it is and is operated by voice.
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [turns, setTurns] = useState<Array<{ role: "user" | "agent"; text: string }>>([]);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [statusText, setStatusText] = useState("");
  const [, setTranscript] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [callAction, setCallAction] = useState<PendingCall | null>(null);
  const [voiceError, setVoiceError] = useState("");

  const dialogRef = useAccessibleDialog(logOpen, () => setLogOpen(false));
  const longPressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const localeRef = useRef<Locale>(locale);
  const openRef = useRef(false);
  const shouldListenRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionLangRef = useRef("");
  const attemptedRecognitionLanguagesRef = useRef<string[]>([]);
  const handledTranscriptRef = useRef("");
  const requestAbortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<AgentHistoryTurn[]>([]);
  const contextRef = useRef<AssistantConversationContext | null>(null);
  const lastAnswerRef = useRef("");
  const pendingResumeRef = useRef("");
  const speechQueueRef = useRef<string[]>([]);
  const currentSpeechChunkRef = useRef("");
  const speechBoundaryRef = useRef(0);
  const speechSequenceRef = useRef(0);
  const activeSpeechResolveRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakingRef = useRef(false);
  const pendingLocationRef = useRef(false);
  const pendingQueryRef = useRef<string | null>(null);
  const handledAtRef = useRef(0);
  const pendingCallRef = useRef<PendingCall | null>(null);
  const processingRef = useRef(false);
  const speechRateRef = useRef(1.25);
  const afterSpeechRef = useRef<(() => void) | null>(null);
  const pausedForSpeechRef = useRef(false);
  const startListeningRef = useRef<(() => void) | null>(null);
  const ttsAudioElRef = useRef<HTMLAudioElement | null>(null);
  const unlockAudio = useCallback(() => {
    try {
      if (!ttsAudioElRef.current) ttsAudioElRef.current = new Audio();
      const el = ttsAudioElRef.current;
      el.src = SILENT_WAV;
      void el.play().catch(() => undefined);
    } catch { /* sound is optional */ }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // The first touch anywhere wakes the phone's speech engine silently, so the greeting starts at once.
    const wake = () => {
      try {
        const silent = new SpeechSynthesisUtterance(" ");
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
      } catch { /* optional */ }
    };
    void loadPhraseManifest();
    window.addEventListener("pointerdown", wake, { once: true, passive: true });
    window.speechSynthesis.getVoices();
    const warm = () => { window.speechSynthesis.getVoices(); };
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, []);
  const voiceGenderRef = useRef<"male" | "female">("male");
  const latestHandlerRef = useRef<(text: string) => Promise<void>>(async () => undefined);

  localeRef.current = locale;
  openRef.current = open;

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!answerText) return;
    setTurns((current) => {
      const last = current[current.length - 1];
      if (last?.role === "agent" && last.text === answerText) return current;
      return [...current.slice(-39), { role: "agent" as const, text: answerText }];
    });
  }, [answerText]);

  const cancelSpeech = useCallback((preserveRemainder: boolean) => {
    if (preserveRemainder && currentSpeechChunkRef.current) {
      const chunk = currentSpeechChunkRef.current;
      const position = speechBoundaryRef.current;
      const remaining = position > 0 && position < chunk.length
        ? chunk.slice(position)
        : chunk;
      const rest = [remaining, ...speechQueueRef.current].filter(Boolean).join(" ");
      if (rest) pendingResumeRef.current = rest;
    }

    speechSequenceRef.current += 1;
    speechQueueRef.current = [];
    speakingRef.current = false;
    currentSpeechChunkRef.current = "";
    speechBoundaryRef.current = 0;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    const resolve = activeSpeechResolveRef.current;
    activeSpeechResolveRef.current = null;
    resolve?.();
    if (pausedForSpeechRef.current) {
      // Speech was stopped: if nothing else starts speaking, listening must come back.
      window.setTimeout(() => {
        if (pausedForSpeechRef.current && !speakingRef.current) {
          pausedForSpeechRef.current = false;
          if (shouldListenRef.current && openRef.current && !recognitionRef.current) startListeningRef.current?.();
        }
      }, 500);
    }
  }, []);

  const closeAgent = useCallback(() => {
    openRef.current = false;
    shouldListenRef.current = false;
    setOpen(false);
    setLogOpen(false);
    setCallAction(null);
    pendingCallRef.current = null;
    pendingLocationRef.current = false;
    pendingQueryRef.current = null;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    cancelSpeech(false);
    setTranscript("");
    setStatusText("");
  }, [cancelSpeech]);

  const speakText = useCallback(async (text: string, outputLocale: Locale) => {
    const clean = text.trim();
    if (!clean) return;

    cancelSpeech(false);
    const sequence = speechSequenceRef.current;
    // Voice lists may be populated asynchronously. Wait briefly. A voice of the right language is
    // always used (pitch separates male and female when the phone does not label its voices).
    const gender = voiceGenderRef.current;
    const pick = await waitForVoice(outputLocale, gender);
    const voice = pick.voice;
    if (sequence !== speechSequenceRef.current || !openRef.current) return;
    const usePindoKinyarwanda = outputLocale === "rw" && !voice;
    const chunks = makeSpeechChunks(clean, usePindoKinyarwanda ? 850 : 420);
    speechQueueRef.current = chunks.slice(1);
    setAnswerText(clean);

    if (!voice && !usePindoKinyarwanda) {
      const message = outputLocale === "en"
        ? "This phone has no speech voice for this language. The answer remains available as text."
        : outputLocale === "fr"
          ? "Ce téléphone n'a aucune voix pour cette langue. La réponse reste disponible en texte."
          : "Iyi telefone nta jwi ifite muri uru rurimi. Igisubizo kiracyagaragara mu nyandiko.";
      setVoiceError(message);
      setStatusText(message);
      return;
    }

    speakingRef.current = true;
    let micAllowed = false;
    try { micAllowed = window.localStorage.getItem("iwacu-agent-mic-ok") === "1"; } catch { /* optional */ }
    if (micAllowed && recognitionRef.current) {
      // An open microphone makes phones play speech quietly: listen again the instant speech ends.
      pausedForSpeechRef.current = true;
      recognitionRef.current.abort();
    }
    setStatusText(outputLocale === "rw" ? "Ndavuga..." : outputLocale === "en" ? "Speaking..." : "Je parle...");

    const urlPromises = usePindoKinyarwanda
      ? chunks.map((part) => fetchKinyarwandaAudioUrl(part))
      : [];

    for (const chunk of chunks) {
      if (sequence !== speechSequenceRef.current || !openRef.current) break;
      currentSpeechChunkRef.current = chunk;
      speechBoundaryRef.current = 0;

      if (usePindoKinyarwanda) {
        // Ask for every part at once, so the next part is ready while the current one plays.
        const urlPromise = urlPromises[chunks.indexOf(chunk)];
        await new Promise<void>(async (resolve) => {
          activeSpeechResolveRef.current = resolve;
          try {
            const audioUrl = await urlPromise;
            if (sequence !== speechSequenceRef.current) {
              activeSpeechResolveRef.current = null;
              resolve();
              return;
            }
            if (!audioUrl) {
              activeSpeechResolveRef.current = null;
              setVoiceError(localeRef.current === "en"
                ? "The Kinyarwanda voice is not available right now. The answer remains available as text."
                : localeRef.current === "fr"
                  ? "La voix kinyarwanda n'est pas disponible pour le moment. La réponse reste disponible en texte."
                  : "Ijwi ry'Ikinyarwanda ntiriboneka ubu. Igisubizo kiracyagaragara mu nyandiko.");
              resolve();
              return;
            }
            const audio = ttsAudioElRef.current ?? new Audio();
            ttsAudioElRef.current = audio;
            audioRef.current = audio;
            audio.onended = () => {
              if (audioRef.current === audio) audioRef.current = null;
              activeSpeechResolveRef.current = null;
              resolve();
            };
            audio.onerror = () => {
              if (audioRef.current === audio) audioRef.current = null;
              activeSpeechResolveRef.current = null;
              resolve();
            };
            audio.src = audioUrl;
            await audio.play();
          } catch {
            activeSpeechResolveRef.current = null;
            resolve();
          }
        });
      } else {
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.voice = voice;
          utterance.lang = voice!.lang;
          utterance.pitch = pick.pitch;
          utterance.rate = speechRateRef.current;
          utterance.volume = 1;
          activeSpeechResolveRef.current = resolve;
          utterance.onboundary = (event) => {
            if (sequence === speechSequenceRef.current && Number.isFinite(event.charIndex)) {
              speechBoundaryRef.current = Math.max(0, event.charIndex);
            }
          };
          utterance.onend = () => {
            if (sequence !== speechSequenceRef.current) return;
            activeSpeechResolveRef.current = null;
            resolve();
          };
          utterance.onerror = () => {
            if (sequence !== speechSequenceRef.current) return;
            activeSpeechResolveRef.current = null;
            resolve();
          };
          window.speechSynthesis.speak(utterance);
        });
      }
    }

    if (sequence === speechSequenceRef.current) {
      speakingRef.current = false;
      currentSpeechChunkRef.current = "";
      speechQueueRef.current = [];
      activeSpeechResolveRef.current = null;
      setStatusText(LANGUAGES[localeRef.current].listening);
      const next = afterSpeechRef.current;
      afterSpeechRef.current = null;
      next?.();
      if (pausedForSpeechRef.current) {
        pausedForSpeechRef.current = false;
        if (shouldListenRef.current && openRef.current && !recognitionRef.current) startListeningRef.current?.();
      }
    }
  }, [cancelSpeech]);

  const say = useCallback((text: string, outputLocale = localeRef.current) => {
    lastAnswerRef.current = text;
    setAnswerText(text);
    void speakText(text, outputLocale);
  }, [speakText]);

  const handleApiQuestion = useCallback(async (query: string) => {
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    processingRef.current = true;
    setStatusText(localeRef.current === "en" ? "Checking IWACU records..." : localeRef.current === "fr" ? "Vérification des données d'IWACU..." : "Ndimo kugenzura amakuru ya IWACU...");

    const safeQuery = query.trim().slice(0, 500);
    const currentLocation = toAssistantLocation(location.data);
    const previousHistory: AgentHistoryTurn[] = historyRef.current.slice(-7).map((turn): AgentHistoryTurn => ({
      role: turn.role,
      content: turn.content.slice(0, 1200),
    }));
    try {
      const response = await fetch("/api/ishakiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          query: safeQuery,
          location: currentLocation,
          context: contextRef.current,
          history: previousHistory,
        }),
      });
      const reply = await response.json() as AssistantReply & { message_kiny?: string };
      if (!response.ok || !reply.answer_kiny) {
        throw new Error(reply.message_kiny || "assistant_unavailable");
      }

      contextRef.current = reply.context ?? contextRef.current;
      historyRef.current = [
        ...previousHistory,
        { role: "user" as const, content: safeQuery },
        { role: "assistant" as const, content: reply.answer_kiny.slice(0, 1200) },
      ].slice(-8);
      processingRef.current = false;

      const activeLocale = localeRef.current;
      if (reply.intent === "out_of_scope") {
        // Never answer a request with a refusal: say what can be done and ask for one word.
        const help = helpText(activeLocale);
        lastAnswerRef.current = help;
        setAnswerText(help);
        void speakText(help, activeLocale);
        return;
      }
      const localizedAnswer = localizeAssistantAnswer(reply.answer_kiny, activeLocale);
      const answer = localizedAnswer ?? localizedUnavailableTranslation(activeLocale);
      setAnswerText(answer);

      const lowerQuery = normalizeSpokenText(safeQuery);
      const asksToCall = /\b(hamagara|mpamagara|call|phone|appelle|appelez|telephoner)\b/.test(lowerQuery);
      const emergency = reply.emergency_contacts?.[0];

      const asksForPhoneNumber =
        /\b(nimero|numero|numéro|phone number|telephone|téléphone|contact|ambulance|ambulansi|samu)\b/.test(lowerQuery);

      if (!asksToCall && asksForPhoneNumber) {
        const verifiedContacts = (reply.emergency_contacts ?? []).flatMap((contact) => {
          const verified = VERIFIED_EMERGENCY_NUMBERS.find((item) =>
            item.number === phoneDigits(contact.number) && item.is_verified
          );
          if (!verified) return [];
          if (/\b(ambulance|ambulansi|samu)\b/.test(lowerQuery) && verified.number !== "912") return [];
          return [{
            number: verified.number,
            label: activeLocale === "en" ? verified.name_eng
              : activeLocale === "fr" ? verified.name_eng
                : verified.name_kiny,
            source: verified.source,
          }];
        });

        const leaderContacts = (reply.leaders ?? []).length === 1
          ? reply.leaders.flatMap((leader) =>
              leader.contacts
                .filter((contact) => isPhoneContact(contact.type) && isSafeCompletePhone(contact.value))
                .map((contact) => ({
                  number: phoneDigits(contact.value),
                  label: leader.display_name,
                  source: "Public leader record returned by IWACU",
                }))
            )
          : [];

        const availableContacts = verifiedContacts.length > 0 ? verifiedContacts : leaderContacts;
        if (availableContacts.length === 1) {
          const contact = availableContacts[0];
          pendingCallRef.current = contact;
          setCallAction(contact);
          const spokenNumber = phoneDigitsForSpeech(contact.number);
          const announcement = activeLocale === "en"
            ? "The verified number for " + contact.label + " is " + spokenNumber + ". Say yes if you want me to open the phone call, or say no to cancel."
            : activeLocale === "fr"
              ? "Le numéro vérifié de " + contact.label + " est " + spokenNumber + ". Dites oui pour ouvrir l'appel, ou non pour annuler."
              : "Nimero yemejwe ya " + contact.label + " ni " + spokenNumber + ". Vuga yego niba ushaka ko mfungura guhamagara, cyangwa oya niba utabishaka.";
          lastAnswerRef.current = announcement;
          setAnswerText(announcement);
          void speakText(announcement, activeLocale);
          return;
        }

        if (availableContacts.length > 1) {
          const lines = availableContacts.slice(0, 6).map((contact) =>
            contact.label + ": " + phoneDigitsForSpeech(contact.number)
          );
          const announcement = activeLocale === "en"
            ? "I found these verified numbers: " + lines.join(". ") + ". Tell me which service you want to call."
            : activeLocale === "fr"
              ? "J'ai trouvé ces numéros vérifiés : " + lines.join(". ") + ". Dites-moi quel service vous souhaitez appeler."
              : "Nabonye iyi nimero zemejwe: " + lines.join(". ") + ". Mbwira serivisi ushaka guhamagara.";
          pendingCallRef.current = null;
          setCallAction(null);
          lastAnswerRef.current = announcement;
          setAnswerText(announcement);
          void speakText(announcement, activeLocale);
          return;
        }

        if ((reply.leaders ?? []).length === 1) {
          const noNumber = activeLocale === "en"
            ? "I found the leader's public record, but it contains no complete verified public phone number. I will not guess one."
            : activeLocale === "fr"
              ? "J'ai trouvé la fiche publique du responsable, mais elle ne contient aucun numéro de téléphone public complet et vérifié. Je ne vais pas en inventer."
              : "Nabonye amakuru rusange y'umuyobozi, ariko nta nimero ya telefone yuzuye kandi yemejwe iri mu makuru ye. Sinshobora kuyihimba.";
          lastAnswerRef.current = noNumber;
          setAnswerText(noNumber);
          void speakText(noNumber, activeLocale);
          return;
        }
      }
      const verifiedEmergency = emergency
        ? VERIFIED_EMERGENCY_NUMBERS.find((item) =>
            item.number === phoneDigits(emergency.number) && item.is_verified
          )
        : null;

      if (asksToCall && emergency && verifiedEmergency) {
        const pending: PendingCall = {
          number: verifiedEmergency.number,
          label: activeLocale === "en" ? verifiedEmergency.name_eng
            : activeLocale === "fr" ? verifiedEmergency.name_eng
              : verifiedEmergency.name_kiny,
          source: verifiedEmergency.source,
        };
        pendingCallRef.current = pending;
        setCallAction(pending);
        const confirmation = activeLocale === "en"
          ? "I found the verified " + pending.label + " number, " + pending.number + ". Say yes to open the call, or say no to cancel."
          : activeLocale === "fr"
            ? "J'ai trouvé le numéro vérifié de " + pending.label + ", " + pending.number + ". Dites oui pour ouvrir l'appel ou non pour annuler."
            : "Nabonye nimero yemejwe ya " + pending.label + ", ni " + pending.number + ". Vuga yego kugira ngo mfungure guhamagara, cyangwa uvuge oya mbihagarike.";
        lastAnswerRef.current = confirmation;
        setAnswerText(confirmation);
        void speakText(confirmation, activeLocale);
        return;
      }

      if (reply.leaders?.length && asksToCall) {
        const leader = reply.leaders[0];
        const phone = leader.contacts.find((item) =>
          isPhoneContact(item.type) && isSafeCompletePhone(item.value)
        );
        if (phone) {
          const pending: PendingCall = {
            number: phoneDigits(phone.value),
            label: leader.display_name,
            source: "Public leader record returned by IWACU",
          };
          pendingCallRef.current = pending;
          setCallAction(pending);
          const confirmation = activeLocale === "en"
            ? "I found a public contact for " + pending.label + ". Say yes to open the call, or no to cancel."
            : activeLocale === "fr"
              ? "J'ai trouvé un contact public pour " + pending.label + ". Dites oui pour ouvrir l'appel ou non pour annuler."
              : "Nabonye nimero rusange ya " + pending.label + ". Vuga yego kugira ngo mfungure guhamagara, cyangwa uvuge oya mbihagarike.";
          lastAnswerRef.current = confirmation;
          setAnswerText(confirmation);
          void speakText(confirmation, activeLocale);
          return;
        }
      }

      lastAnswerRef.current = answer;
      setAnswerText(answer);
      void speakText(answer, activeLocale);
    } catch (error) {
      if (controller.signal.aborted) return;
      processingRef.current = false;
      const activeLocale = localeRef.current;
      const message = activeLocale === "en"
        ? "I could not reach the IWACU information service. I have not made up an answer. Please try again."
        : activeLocale === "fr"
          ? "Je n'ai pas pu joindre le service d'information d'IWACU. Je n'ai pas inventé de réponse. Veuillez réessayer."
          : "Ntabwo nshoboye kugera kuri serivisi y'amakuru ya IWACU. Nta gisubizo mpimbye. Ongera ugerageze.";
      setVoiceError(error instanceof Error ? error.message : "assistant_unavailable");
      lastAnswerRef.current = message;
      setAnswerText(message);
      void speakText(message, activeLocale);
    }
  }, [location.data, speakText]);

  const executeCommand = useCallback(async (command: RemoteAgentCommand, rawText: string) => {
    if (command.type === "set_voice") {
      voiceGenderRef.current = command.gender;

      const confirmation = localeRef.current === "en"
        ? "Voice changed to " + command.gender + "."
        : localeRef.current === "fr"
          ? "Voix réglée sur " + (command.gender === "male" ? "masculine" : "féminine") + "."
          : "Ijwi ryahinduwe rikaba " + (command.gender === "male" ? "ry'umugabo." : "ry'umugore.");
      say(confirmation);
      return;
    }
    if (command.type === "help") {
      say(helpText(localeRef.current));
      return;
    }
    if (command.type === "switch_language") {
      const next = command.locale;
      localeRef.current = next;
      setLocale(next);
      recognitionLangRef.current = next === "rw" ? "rw-RW" : next === "fr" ? "fr-FR" : "en-US";
      recognitionRef.current?.stop();
      say(next === "en" ? "I am listening in English."
        : next === "fr" ? "Je vous écoute en français."
          : RW_PHRASES.switch_rw, next);
      return;
    }
    if (command.type === "show_log") {
      setLogOpen(true);
      return;
    }
    if (command.type === "emergency") {
      const loc = localeRef.current;
      const numbers = VERIFIED_EMERGENCY_NUMBERS.filter((item) => item.is_verified);
      if (numbers.length === 0) {
        say(loc === "en" ? "I have no verified emergency numbers to read. I will not guess any."
          : loc === "fr" ? "Je n'ai aucun numéro d'urgence vérifié à lire. Je ne vais pas en inventer."
            : "Nta nimero z'ubutabazi zemejwe mfite zo gusoma. Sinshobora kuzihimba.");
        return;
      }
      const lines = numbers.map((item) =>
        (loc === "rw" ? item.name_kiny : item.name_eng) + ": " + phoneDigitsForSpeech(item.number)
      );
      say(loc === "en"
        ? "Verified emergency numbers. " + lines.join(". ") + ". Tell me which one you want me to call."
        : loc === "fr"
          ? "Numéros d'urgence vérifiés. " + lines.join(". ") + ". Dites-moi lequel vous voulez appeler."
          : "Nimero z'ubutabazi zemejwe. " + lines.join(". ") + ". Mbwira iyo ushaka ko mpamagara.");
      return;
    }
    if (command.type === "stop_speaking") {
      cancelSpeech(false);
      setStatusText(LANGUAGES[localeRef.current].listening);
      return;
    }
    if (command.type === "repeat") {
      const previous = lastAnswerRef.current;
      if (previous) void speakText(previous, localeRef.current);
      return;
    }
    if (command.type === "slower") {
      speechRateRef.current = Math.max(0.72, speechRateRef.current - 0.12);
      const message = localeRef.current === "en" ? "I will speak more slowly."
        : localeRef.current === "fr" ? "Je vais parler plus lentement."
          : "Ngiye kuvuga buhoro.";
      say(message);
      return;
    }
    if (command.type === "resume") {
      if (pendingResumeRef.current) {
        const remainder = pendingResumeRef.current;
        pendingResumeRef.current = "";
        void speakText(remainder, localeRef.current);
      } else {
        const message = localeRef.current === "en" ? "There is no interrupted answer to resume."
          : localeRef.current === "fr" ? "Il n'y a pas de réponse interrompue à reprendre."
            : "Nta gisubizo nari narahagaritse cyo gukomeza.";
        say(message);
      }
      return;
    }
    if (command.type === "cancel_call") {
      pendingCallRef.current = null;
      setCallAction(null);
      const message = localeRef.current === "en" ? "The call was cancelled."
        : localeRef.current === "fr" ? "L'appel a été annulé."
          : "Guhamagara birahagaritswe.";
      say(message);
      return;
    }
    if (command.type === "confirm_call") {
      const pending = pendingCallRef.current;
      if (!pending) {
        const message = localeRef.current === "en" ? "There is no prepared call to confirm."
          : localeRef.current === "fr" ? "Aucun appel n'attend de confirmation."
            : "Nta guhamagara nari nteguye ngo wemeze.";
        say(message);
        return;
      }
      pendingCallRef.current = null;
      setCallAction(null);
      const digits = phoneDigits(pending.number);
      if (digits.length >= 3) {
        const message = localeRef.current === "en" ? "Opening the phone app for " + pending.label + "."
          : localeRef.current === "fr" ? "Ouverture de l'application téléphone pour " + pending.label + "."
            : "Ngiye gufungura telefone kugira ngo uhamagare " + pending.label + ".";
        say(message);
        window.location.href = "tel:" + digits;
      }
      return;
    }
    if (command.type === "close") {
      closeAgent();
      return;
    }
    if (command.type === "location") {
      if (location.status === "success" && location.data && !location.isLastKnown) {
        await handleApiQuestion(localeRef.current === "en" ? "Where am I?"
          : localeRef.current === "fr" ? "Où suis-je ?"
            : "Menya aho ndi");
      } else {
        pendingLocationRef.current = true;
        setStatusText(localeRef.current === "en" ? "Finding your location..." : localeRef.current === "fr" ? "Recherche de votre position..." : "Ndimo kumenya aho uri...");
        if (location.status !== "requesting_gps" && location.status !== "locating") {
          void location.locate();
        }
      }
      return;
    }
    if (command.type === "read_page") {
      const currentPage = pageText();
      if (!currentPage.text) {
        say(localeRef.current === "en" ? "I could not find readable page content."
          : localeRef.current === "fr" ? "Je n'ai pas trouvé de contenu lisible sur cette page."
            : "Ntabwo nabonye inyandiko nasoma kuri uru rupapuro.");
        return;
      }
      const page = currentPage.truncated
        ? currentPage.text + (localeRef.current === "en" ? ". The page continues beyond this part."
          : localeRef.current === "fr" ? ". La page continue au-delà de cette partie."
            : ". Hari ibindi bikubiye kuri uru rupapuro bitarasomwa.")
        : currentPage.text;
      say(page);
      return;
    }
    if (command.type === "back") {
      router.back();
      const message = localeRef.current === "en" ? "Going back to the previous page."
        : localeRef.current === "fr" ? "Retour à la page précédente."
          : "Nsubiye ku rupapuro rwari rubanje.";
      say(message);
      return;
    }
    if (command.type === "scroll_top" || command.type === "scroll_bottom") {
      const top = command.type === "scroll_top";
      window.scrollTo({
        top: top ? 0 : document.documentElement.scrollHeight,
        behavior: "smooth",
      });
      const message = localeRef.current === "en" ? (top ? "Going to the top of the page." : "Going to the bottom of the page.")
        : localeRef.current === "fr" ? (top ? "Déplacement en haut de la page." : "Déplacement en bas de la page.")
          : (top ? "Ngusubije hejuru ku rupapuro." : "Nkujyanye hasi ku rupapuro.");
      say(message);
      return;
    }
    if (command.type === "navigate") {
      router.push(command.path);
      const confirmation = localeRef.current === "en" ? "I opened the requested section."
        : localeRef.current === "fr" ? "J'ai ouvert la rubrique demandée."
          : "Nafunguye igice wasabye.";
      say(confirmation);
      return;
    }
    if (command.type === "ask") {
      if (pendingCallRef.current) {
        pendingCallRef.current = null;
        setCallAction(null);
      }
      const query = command.query || rawText;
      if (command.needsLocation && !(location.status === "success" && location.data && !location.isLastKnown)) {
        // "My leader" needs where the person is: find it first, then ask the same question.
        pendingQueryRef.current = query;
        pendingLocationRef.current = true;
        setStatusText(localeRef.current === "en" ? "Finding your location..." : localeRef.current === "fr" ? "Recherche de votre position..." : "Ndimo kumenya aho uri...");
        if (location.status !== "requesting_gps" && location.status !== "locating") void location.locate();
        return;
      }
      await handleApiQuestion(query);
    }
  }, [cancelSpeech, closeAgent, handleApiQuestion, location, router, say, speakText]);

  const handleUtterance = useCallback(async (rawText: string) => {
    const value = rawText.trim();
    // The same words twice within 2 seconds are one utterance reported twice; a real repeat is allowed.
    const now = Date.now();
    if (!value || (handledTranscriptRef.current === value && now - handledAtRef.current < 2000)) return;
    handledTranscriptRef.current = value;
    handledAtRef.current = now;
    setTranscript(value);
    setStatusText((localeRef.current === "en" ? "Heard: " : localeRef.current === "fr" ? "J'ai entendu : " : "Nabyumvise: ") + value.slice(0, 120));
    setTurns((current) => [...current.slice(-39), { role: "user" as const, text: value }]);
    setVoiceError("");
    cancelSpeech(true);

    const detected = detectSpokenLocale(value);
    if (detected && detected !== localeRef.current) {
      localeRef.current = detected;
      setLocale(detected);
      recognitionLangRef.current = detected === "rw" ? "rw-RW" : detected === "fr" ? "fr-FR" : "en-US";
      recognitionRef.current?.stop();
    }

    const command = classifyRemoteCommand(value);
    agentLog("heard", command.type + " " + localeRef.current);
    if (command.type === "confirm_call" && !pendingCallRef.current) {
      await handleApiQuestion(value);
      return;
    }
    if (processingRef.current) {
      requestAbortRef.current?.abort();
      processingRef.current = false;
    }
    await executeCommand(command, value);
  }, [cancelSpeech, executeCommand, handleApiQuestion, setLocale]);

  latestHandlerRef.current = handleUtterance;

  useEffect(() => {
    if (!pendingLocationRef.current) return;
    if (location.status === "success" && location.data && !location.isLastKnown) {
      pendingLocationRef.current = false;
      const queued = pendingQueryRef.current;
      pendingQueryRef.current = null;
      void handleApiQuestion(queued ?? (localeRef.current === "en" ? "Where am I?"
        : localeRef.current === "fr" ? "Où suis-je ?"
          : "Menya aho ndi"));
    } else if (location.status === "error" || location.status === "offline") {
      pendingLocationRef.current = false;
      pendingQueryRef.current = null;
      const message = localeRef.current === "en"
        ? "I could not confirm your current location. I will not guess it."
        : localeRef.current === "fr"
          ? "Je n'ai pas pu confirmer votre position actuelle. Je ne vais pas la deviner."
          : "Ntabwo nshoboye kwemeza aho uri ubu. Ntabwo ngiye kuhatekereza.";
      say(message);
    }
  }, [location.status, location.data, location.isLastKnown, handleApiQuestion, say]);

  const startListening = useCallback(() => {
    if (!shouldListenRef.current || !openRef.current || recognitionRef.current) return;
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setVoiceError(LANGUAGES[localeRef.current].unavailable);
      setStatusText(LANGUAGES[localeRef.current].unavailable);
      shouldListenRef.current = false;
      return;
    }

    const recognition = new Recognition();
    const hint = recognitionLangRef.current ||
      getSpeechRecognitionHint(localeRef.current, typeof navigator === "undefined" ? [] : navigator.languages);
    recognition.lang = hint;
    if (!attemptedRecognitionLanguagesRef.current.includes(hint)) {
      attemptedRecognitionLanguagesRef.current.push(hint);
    }
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onstart = () => {
      agentLog("rec_start", recognition.lang);
      try { window.localStorage.setItem("iwacu-agent-mic-ok", "1"); } catch { /* optional */ }
    };
    recognition.onresult = (event) => {
      for (let index = event.resultIndex ?? 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim() ?? "";
        if (!text) continue;
        if (!result.isFinal) {
          setTranscript(text);
          if (speakingRef.current && !looksLikeSpeechEcho(text, currentSpeechChunkRef.current)) {
            cancelSpeech(true);
            setStatusText(LANGUAGES[localeRef.current].listening);
          }
          continue;
        }
        if (speakingRef.current && looksLikeSpeechEcho(text, currentSpeechChunkRef.current)) continue;
        void latestHandlerRef.current(text);
      }
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      agentLog("rec_error", String(event.error));
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false;
        const message = localeRef.current === "en" ? "Microphone permission was denied. Allow microphone access, then tap Iwacu Agent again."
          : localeRef.current === "fr" ? "L'accès au microphone a été refusé. Autorisez le microphone puis touchez de nouveau Iwacu Agent."
            : "Telefone ntiyemereye gukoresha microphone. Emera uruhushya rwa microphone hanyuma wongere ukande Iwacu Agent.";
        setVoiceError(message);
        setStatusText(message);
      } else if (event.error === "language-not-supported") {
        const fallback = ["rw-RW", "en-US", "fr-FR"];
        const next = fallback.find((candidate) => !attemptedRecognitionLanguagesRef.current.includes(candidate));
        if (next) {
          recognitionLangRef.current = next;
          attemptedRecognitionLanguagesRef.current.push(next);
          setStatusText(localeRef.current === "en" ? "Trying another speech language supported by this phone..."
            : localeRef.current === "fr" ? "Essai d'une autre langue vocale prise en charge par ce téléphone..."
              : "Ndimo kugerageza urundi rurimi rushyigikiwe na telefone...");
        } else {
          setVoiceError(LANGUAGES[localeRef.current].unavailable);
          setStatusText(LANGUAGES[localeRef.current].unavailable);
          shouldListenRef.current = false;
        }
      } else if (event.error === "network" || event.error === "audio-capture") {
        shouldListenRef.current = false;
        const message = localeRef.current === "en"
          ? "The speech service or microphone is unavailable. Check the connection and microphone, then tap Iwacu Agent again."
          : localeRef.current === "fr"
            ? "Le service vocal ou le microphone est indisponible. Vérifiez la connexion et le microphone, puis touchez de nouveau Iwacu Agent."
            : "Serivisi yo kumva ijwi cyangwa microphone ntiboneka. Reba internet na microphone, wongere ukande Iwacu Agent.";
        setVoiceError(message);
        setStatusText(message);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setVoiceError(event.error);
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (pausedForSpeechRef.current) return;
      if (shouldListenRef.current && openRef.current) {
        window.setTimeout(() => startListening(), 220);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setStatusText(LANGUAGES[localeRef.current].listening);
      setVoiceError("");
    } catch {
      recognitionRef.current = null;
      setVoiceError(localeRef.current === "en" ? "The microphone could not start. Please tap Iwacu Agent again."
        : localeRef.current === "fr" ? "Le microphone n'a pas pu démarrer. Touchez de nouveau Iwacu Agent."
          : "Microphone ntiyafungutse. Ongera ukande Iwacu Agent.");
      shouldListenRef.current = false;
    }
  }, [cancelSpeech]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  useEffect(() => {
    if (!open) return;
    // Safety net: if the phone ends recognition quietly and nothing restarts it, start it again.
    const timer = window.setInterval(() => {
      if (shouldListenRef.current && openRef.current && !speakingRef.current && !recognitionRef.current && !processingRef.current) {
        agentLog("watchdog_restart");
        pausedForSpeechRef.current = false;
        startListeningRef.current?.();
      }
    }, 1800);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return () => {
      openRef.current = false;
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      cancelSpeech(false);
    };
  }, [open, cancelSpeech]);

  useEffect(() => () => {
    shouldListenRef.current = false;
    recognitionRef.current?.abort();
    requestAbortRef.current?.abort();
    cancelSpeech(false);
  }, [cancelSpeech]);

  const onOpen = () => {
    historyRef.current = [];
    contextRef.current = null;
    handledTranscriptRef.current = "";
    pendingResumeRef.current = "";
    pendingCallRef.current = null;
    pendingLocationRef.current = false;
    setCallAction(null);
    setTranscript("");
    setAnswerText("");
    setTurns([]);
    setVoiceError("");
    openRef.current = true;
    shouldListenRef.current = true;
    recognitionLangRef.current = "";
    attemptedRecognitionLanguagesRef.current = [];
    const greeting = LANGUAGES[localeRef.current].greeting;
    setAnswerText(greeting);
    setStatusText(LANGUAGES[localeRef.current].hint);
    lastAnswerRef.current = greeting;
    setOpen(true);
    let micKnown = false;
    try { micKnown = window.localStorage.getItem("iwacu-agent-mic-ok") === "1"; } catch { /* optional */ }
    if (micKnown) {
      // An open microphone makes phones play speech quietly and late: greet first, then listen.
      const listenOnce = () => {
        afterSpeechRef.current = null;
        if (openRef.current && !recognitionRef.current) startListening();
      };
      afterSpeechRef.current = listenOnce;
      // If speech cannot start or is cut short, listening must still begin.
      window.setTimeout(listenOnce, 9000);
      void speakText(greeting, localeRef.current);
    } else {
      // First time: start recognition from the tap so the browser can ask for the microphone.
      startListening();
      void speakText(greeting, localeRef.current);
    }
  };

  const iconLabel = locale === "en" ? (open ? "Stop Iwacu Agent" : "Start Iwacu Agent: control the site by voice")
    : locale === "fr" ? (open ? "Arrêter Iwacu Agent" : "Démarrer Iwacu Agent : commander le site à la voix")
      : (open ? "Hagarika Iwacu Agent" : "Tangira Iwacu Agent: koresha urubuga uvuga gusa");

  const startLongPress = () => {
    longPressedRef.current = false;
    if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressedRef.current = true;
      setLogOpen(true);
    }, 650);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // A long press only opens the written conversation; a normal tap switches the agent on or off.
          if (longPressedRef.current) {
            longPressedRef.current = false;
            return;
          }
          if (open) closeAgent();
          else { unlockAudio(); onOpen(); }
        }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(event) => event.preventDefault()}
        className={"iwacu-header-control relative inline-flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAD201] " + (open ? "bg-white/25 ring-2 ring-[#FAD201]" : "")}
        aria-label={iconLabel}
        title={iconLabel}
        aria-pressed={open}
      >
        {open && (
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[#FAD201]/30 motion-safe:animate-ping" />
        )}
        <AudioLines className="relative h-5 w-5" aria-hidden />
      </button>
      <span className="sr-only" role="status" aria-live="polite">{open ? statusText : ""}</span>

      {portalTarget && open && !logOpen && (voiceError || callAction) && createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="pointer-events-auto w-full max-w-sm space-y-2">
            {voiceError && (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 shadow-lg">
                {voiceError}
              </p>
            )}
            {callAction && (
              <div className="rounded-xl border border-[#e8c8c8] bg-[#fff7f7] p-3 shadow-lg">
                <p className="text-sm font-bold text-[#752b2b]">{callAction.label}: {callAction.number}</p>
                <a
                  href={"tel:" + phoneDigits(callAction.number)}
                  onClick={() => {
                    pendingCallRef.current = null;
                    setCallAction(null);
                  }}
                  className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#b91c1c] px-4 py-2 text-sm font-bold text-white"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  {locale === "en" ? "Call now" : locale === "fr" ? "Appeler" : "Hamagara"}
                </a>
              </div>
            )}
          </div>
        </div>,
        portalTarget
      )}

      {logOpen && portalTarget && createPortal(
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-[#061b12]/45 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLogOpen(false);
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={locale === "en" ? "Iwacu Agent: conversation" : locale === "fr" ? "Iwacu Agent : conversation" : "Iwacu Agent: ibyo mwavuganye"}
            tabIndex={-1}
            className="flex max-h-[70dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[22px] border border-[#d3e3d9] bg-[#fbfdfb] text-[#123D2D] shadow-[0_-12px_48px_rgba(6,35,26,0.24)] sm:rounded-[22px]"
          >
            <div className="flex items-center justify-between gap-3 bg-[#174a31] px-4 py-2.5 text-white">
              <p className="text-sm font-extrabold">
                Iwacu Agent · {locale === "en" ? "conversation" : locale === "fr" ? "conversation" : "ibyo mwavuganye"}
              </p>
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10"
                aria-label={locale === "en" ? "Close" : locale === "fr" ? "Fermer" : "Funga"}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {turns.length === 0 ? (
                <p className="px-1 py-3 text-xs text-[#52685C]">
                  {locale === "en" ? "Nothing said yet." : locale === "fr" ? "Rien n'a encore été dit." : "Nta cyavuzwe."}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {turns.map((turn, index) => (
                    <li
                      key={index}
                      className={"rounded-xl px-3 py-2 text-[13px] leading-snug " + (turn.role === "user" ? "ml-8 bg-[#edf5ef] text-[#31543f]" : "mr-8 border border-[#d8e6dd] bg-white")}
                    >
                      <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#557563]">
                        {turn.role === "user"
                          ? (locale === "en" ? "You" : locale === "fr" ? "Vous" : "Wowe")
                          : "Iwacu Agent"}
                      </span>
                      {turn.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>,
        portalTarget
      )}
    </>
  );
}
