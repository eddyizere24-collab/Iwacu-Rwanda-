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
    greeting: "Muraho. Ndi umufasha wa IWACU. Mbwira icyo nkworere.",
    listening: "Ndakumva...",
    unavailable: "Iyi browser ntiyemera kumva ijwi hano. Koresha browser ishyigikira Speech Recognition.",
  },
  en: {
    hint: "Tell me what you need. You may speak Kinyarwanda, English or French.",
    greeting: "Hello. I am IWACU's voice assistant. Tell me what you would like me to do.",
    listening: "I'm listening...",
    unavailable: "This browser does not provide speech recognition here. Please use a supported browser.",
  },
  fr: {
    hint: "Dites-moi ce dont vous avez besoin. Vous pouvez parler en kinyarwanda, anglais ou français.",
    greeting: "Bonjour. Je suis l'assistant vocal d'IWACU. Dites-moi ce que vous souhaitez faire.",
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

function makeSpeechChunks(text: string, maxLength: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const value = sentence.trim();
    if (!value) continue;
    if (current && (current.length + value.length + 1) > maxLength) {
      chunks.push(current);
      current = "";
    }
    if (value.length <= maxLength) {
      current = current ? current + " " + value : value;
      continue;
    }
    const words = value.split(/\s+/);
    for (const word of words) {
      if (current && current.length + word.length + 1 > maxLength) {
        chunks.push(current);
        current = "";
      }
      current = current ? current + " " + word : word;
    }
  }

  if (current) chunks.push(current);
  return chunks;
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

  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [statusText, setStatusText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [callAction, setCallAction] = useState<PendingCall | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const dialogRef = useAccessibleDialog(open, () => setOpen(false));

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
  const pendingCallRef = useRef<PendingCall | null>(null);
  const processingRef = useRef(false);
  const speechRateRef = useRef(0.96);
  const latestHandlerRef = useRef<(text: string) => Promise<void>>(async () => undefined);

  localeRef.current = locale;
  openRef.current = open;

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

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
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    const resolve = activeSpeechResolveRef.current;
    activeSpeechResolveRef.current = null;
    resolve?.();
  }, []);

  const closeAgent = useCallback(() => {
    openRef.current = false;
    shouldListenRef.current = false;
    setOpen(false);
    setCallAction(null);
    pendingCallRef.current = null;
    pendingLocationRef.current = false;
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
    const installedVoices = typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis.getVoices()
      : [];
    const voicePrefix = VOICE_TAGS[outputLocale];
    // The first IWACU voice profile is male-only. Browser voice names are not
    // guaranteed to expose gender, so an unlabelled voice is not assumed male.
    const voice = installedVoices.find((item) =>
      voicePrefix.some((prefix) => item.lang.toLowerCase().startsWith(prefix)) &&
      /\b(male|masculine|man)\b/i.test(item.name)
    ) ?? null;

    const usePindoKinyarwanda = outputLocale === "rw" && !voice;
    const chunks = makeSpeechChunks(clean, usePindoKinyarwanda ? 850 : 230);
    speechQueueRef.current = chunks.slice(1);
    setAnswerText(clean);

    if (!voice && !usePindoKinyarwanda) {
      const message = outputLocale === "en"
        ? "No verified male voice for this language is available on this phone. The answer remains available as text."
        : outputLocale === "fr"
          ? "Aucune voix masculine vérifiée dans cette langue n'est disponible sur ce téléphone. La réponse reste disponible en texte."
          : "Nta jwi ry'umugabo ryemejwe muri uru rurimi kuri iyi telefone. Igisubizo kiracyagaragara mu nyandiko.";
      setVoiceError(message);
      setStatusText(message);
      return;
    }

    speakingRef.current = true;
    setStatusText(outputLocale === "rw" ? "Ndavuga..." : outputLocale === "en" ? "Speaking..." : "Je parle...");

    for (const chunk of chunks) {
      if (sequence !== speechSequenceRef.current || !openRef.current) break;
      currentSpeechChunkRef.current = chunk;
      speechBoundaryRef.current = 0;

      if (usePindoKinyarwanda) {
        await new Promise<void>(async (resolve) => {
          activeSpeechResolveRef.current = resolve;
          try {
            const response = await fetch("/api/remote-agent/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              cache: "no-store",
              body: JSON.stringify({ text: chunk }),
            });
            if (!response.ok) {
              activeSpeechResolveRef.current = null;
              setVoiceError(localeRef.current === "en"
                ? "A verified male Kinyarwanda voice is not configured on this device yet. The answer remains available as text."
                : localeRef.current === "fr"
                  ? "Aucune voix masculine kinyarwanda vérifiée n'est configurée sur cet appareil. La réponse reste disponible en texte."
                  : "Nta jwi ry'umugabo ry'Ikinyarwanda ryemejwe kuri iyi telefone. Igisubizo kiracyagaragara mu nyandiko.");
              resolve();
              return;
            }
            const payload = await response.json() as { audioUrl?: string };
            if (!payload.audioUrl || sequence !== speechSequenceRef.current) {
              activeSpeechResolveRef.current = null;
              resolve();
              return;
            }
            const audio = new Audio(payload.audioUrl);
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
          utterance.lang = voice.lang;
          utterance.rate = speechRateRef.current;
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
    const previousHistory = historyRef.current.slice(-7).map((turn) => ({
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
        { role: "user", content: safeQuery },
        { role: "assistant", content: reply.answer_kiny.slice(0, 1200) },
      ].slice(-8);
      processingRef.current = false;

      const activeLocale = localeRef.current;
      const localizedAnswer = localizeAssistantAnswer(reply.answer_kiny, activeLocale);
      const answer = localizedAnswer ?? localizedUnavailableTranslation(activeLocale);
      setAnswerText(answer);

      const lowerQuery = normalizeSpokenText(safeQuery);
      const asksToCall = /\b(hamagara|mpamagara|call|phone|appelle|appelez|telephoner)\b/.test(lowerQuery);
      const emergency = reply.emergency_contacts?.[0];
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
        void location.locate();
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
      await handleApiQuestion(command.query || rawText);
    }
  }, [cancelSpeech, closeAgent, handleApiQuestion, location, router, say, speakText]);

  const handleUtterance = useCallback(async (rawText: string) => {
    const value = rawText.trim();
    if (!value || handledTranscriptRef.current === value) return;
    handledTranscriptRef.current = value;
    setTranscript(value);
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
      void handleApiQuestion(localeRef.current === "en" ? "Where am I?"
        : localeRef.current === "fr" ? "Où suis-je ?"
          : "Menya aho ndi");
    } else if (location.status === "error" || location.status === "offline") {
      pendingLocationRef.current = false;
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
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false;
        const message = localeRef.current === "en" ? "Microphone permission was denied. Close and reopen the voice assistant after allowing microphone access."
          : localeRef.current === "fr" ? "L'accès au microphone a été refusé. Autorisez le microphone puis rouvrez l'assistant vocal."
            : "Telefone ntiyemereye gukoresha microphone. Emera uruhushya rwa microphone hanyuma wongere ufungure umufasha.";
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
          ? "The speech service or microphone is unavailable. Check the connection and microphone, then reopen the assistant."
          : localeRef.current === "fr"
            ? "Le service vocal ou le microphone est indisponible. Vérifiez la connexion et le microphone, puis rouvrez l'assistant."
            : "Serivisi yo kumva ijwi cyangwa microphone ntiboneka. Reba internet na microphone, wongere ufungure umufasha.";
        setVoiceError(message);
        setStatusText(message);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setVoiceError(event.error);
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
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
      setVoiceError(localeRef.current === "en" ? "The microphone could not start. Please close and reopen the voice assistant."
        : localeRef.current === "fr" ? "Le microphone n'a pas pu démarrer. Fermez puis rouvrez l'assistant vocal."
          : "Microphone ntiyafungutse. Funga umufasha wongere umufungure.");
      shouldListenRef.current = false;
    }
  }, [cancelSpeech]);

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
    // Start recognition directly from the visitor's tap so the browser can
    // show its microphone permission prompt as part of that user gesture.
    startListening();
    void speakText(greeting, localeRef.current);
  };

  const iconLabel = locale === "en" ? "Open IWACU voice assistant"
    : locale === "fr" ? "Ouvrir l'assistant vocal IWACU"
      : "Fungura umufasha wa IWACU ukoresha ijwi";

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="iwacu-header-control inline-flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAD201]"
        aria-label={iconLabel}
        title={iconLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <AudioLines className="h-5 w-5" aria-hidden />
      </button>

      {open && portalTarget && createPortal(
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-[#061b12]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAgent();
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={locale === "en" ? "IWACU voice assistant" : locale === "fr" ? "Assistant vocal IWACU" : "Umufasha wa IWACU ukoresha ijwi"}
            tabIndex={-1}
            className="flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[26px] border border-[#d3e3d9] bg-[#fbfdfb] text-[#123D2D] shadow-[0_-12px_48px_rgba(6,35,26,0.24)] sm:max-h-[70dvh] sm:rounded-[26px]"
          >
            <div className="flex items-center justify-between gap-3 bg-[#174a31] px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12">
                  <AudioLines className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">{locale === "en" ? "IWACU Remote Agent" : locale === "fr" ? "Agent vocal IWACU" : "Umufasha w'ijwi wa IWACU"}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-white/80" aria-live="polite">{statusText || LANGUAGES[locale].listening}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAgent}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10"
                aria-label={locale === "en" ? "Close voice assistant" : locale === "fr" ? "Fermer l'assistant vocal" : "Funga umufasha"}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-xs leading-relaxed text-[#52685C]">
                {LANGUAGES[locale].hint}
              </p>
              {transcript && (
                <div className="rounded-xl bg-[#edf5ef] px-3 py-2 text-sm text-[#31543f]">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-[#557563]">
                    {locale === "en" ? "I heard" : locale === "fr" ? "J'ai entendu" : "Ibyo numvise"}
                  </span>
                  {transcript}
                </div>
              )}
              {answerText && (
                <div className="rounded-2xl border border-[#d8e6dd] bg-white px-4 py-3 text-sm leading-relaxed shadow-sm" aria-live="polite">
                  {answerText}
                </div>
              )}
              {voiceError && (
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  {voiceError}
                </p>
              )}
              {callAction && (
                <div className="rounded-xl border border-[#e8c8c8] bg-[#fff7f7] p-3">
                  <p className="text-sm font-bold text-[#752b2b]">{callAction.label}: {callAction.number}</p>
                  <p className="mt-1 text-[11px] text-[#755050]">{callAction.source}</p>
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
              <p className="text-[10px] leading-relaxed text-[#72847A]">
                {locale === "en"
                  ? "Your microphone is active only while this assistant is open. Close it to stop listening."
                  : locale === "fr"
                    ? "Le microphone reste actif uniquement lorsque cet assistant est ouvert. Fermez-le pour arrêter l'écoute."
                    : "Microphone ikora gusa igihe uyu mufasha afunguye. Umufunge kugira ngo ihagarare."}
              </p>
            </div>
          </section>
        </div>,
        portalTarget
      )}
    </>
  );
}
