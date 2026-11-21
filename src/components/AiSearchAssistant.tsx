"use client";

import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight, ChevronDown, ExternalLink, Maximize2, Minimize2, MapPin, MessageCircle,
  Phone, Globe, RotateCcw, Send, ShieldCheck, UserRound, Mic, Volume2, Pause, Play, Square,
} from "lucide-react";
import type { AssistantLocationContext, AssistantReply } from "@/lib/assistant/contracts";
import { useI18n } from "@/components/LocaleProvider";
import { normalizeAssistantBrand } from "@/lib/i18n";
import { isAssistantLocationQuestion } from "@/lib/assistant/intent";
import { isSiteExplanationQuestion } from "@/lib/assistant/site-explainer";
import { IwacuAISun } from "@/components/RwandanSun";
import { useIshakiroConversation, type IshakiroChatMessage } from "@/components/IshakiroConversationProvider";
import {
  DICTATION_LANGUAGES,
  DICTATION_LANGUAGE_NAMES,
  DICTATION_LANG_TAGS,
  appendSession,
  composeDictation,
  decideAfterSessionEnd,
  isDictationLanguage,
  nextQuickFailureCount,
  sessionTranscript,
  type DictationLanguage,
  type SpeechResultLike,
} from "@/lib/voice/dictation-text";

interface AiSearchAssistantProps {
  location?: AssistantLocationContext | null;
  locationStatus?: "idle" | "requesting_gps" | "locating" | "success" | "error" | "offline";
  locationIsLastKnown?: boolean;
  onRequestLocation?: () => void;
}


type SpeechResultEventLike = { results: ArrayLike<SpeechResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type WakeLockSentinelLike = { release: () => Promise<void> };
const DICTATION_LANGUAGE_STORAGE_KEY = "iwacu-dictation-language";
const QUESTION_MAX_LENGTH = 500;
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const STARTER_GROUPS = [
  {
    label: "Sobanukirwa IWACU",
    questions: ["IWACU RWANDA ni iki?"],
  },
  {
    label: "Ahantu",
    questions: ["Kigali ni iki?", "Nyamasheke ni iki?"],
  },
  {
    label: "Ubumenyi ku Rwanda",
    questions: [
      "U Rwanda rufite uturere tungahe?",
      "Abaturage b'u Rwanda ni bangahe?",
      "Indimi zemewe mu Rwanda ni izihe?",
      "Ibendera ry'u Rwanda risobanura iki?",
    ],
  },
  {
    label: "Abayobozi n'ubutabazi",
    questions: ["Ninde uyobora umurenge wa Kacyiru?", "Mpa nimero z'ubutabazi."],
  },
];

function makeMessageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function safeTelephone(value: string): string {
  return value.replace(/[^0-9+]/g, "");
}

function isTelephoneType(type: string): boolean {
  return /phone|mobile|telephone|tel|whatsapp/i.test(type);
}

function leaderInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function administrativeLevelName(level: string): string {
  const labels: Record<string, string> = {
    village: "Umudugudu",
    cell: "Akagari",
    sector: "Umurenge",
    district: "Akarere",
    province: "Intara",
    country: "Igihugu",
  };
  return labels[level] || "Aho akorera";
}

export function AiSearchAssistant({
  location = null,
  locationStatus = "idle",
  locationIsLastKnown = false,
  onRequestLocation,
}: AiSearchAssistantProps) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const { messages, setMessages, conversationContext, setConversationContext } = useIshakiroConversation();
  const [loading, setLoading] = useState(false);
  const [waitingForLocation, setWaitingForLocation] = useState(false);
  const [pendingLocationQuery, setPendingLocationQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStarters, setShowStarters] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [recognizedTranscript, setRecognizedTranscript] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [chosenDictationLanguage, setChosenDictationLanguage] = useState<DictationLanguage | null>(null);
  const dictationLanguage: DictationLanguage = chosenDictationLanguage ?? locale;
  const dictationLanguageRef = useRef<DictationLanguage>(dictationLanguage);
  dictationLanguageRef.current = dictationLanguage;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Dictation bookkeeping lives in refs so a restart never loses or repeats words.
  const wantRecordingRef = useRef(false);
  const sessionIdRef = useRef(0);
  const baseTextRef = useRef("");
  const previousSessionsRef = useRef("");
  const currentSessionRef = useRef("");
  const lastActivityRef = useRef(0);
  const sessionStartedRef = useRef(0);
  const quickFailuresRef = useRef(0);
  const lastErrorRef = useRef<string | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const speechRequestIdRef = useRef(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const lastOutsideFocusRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const questionBoxRef = useRef<HTMLTextAreaElement | null>(null);
  const requestReplyRef = useRef<((text: string, currentLocation: AssistantLocationContext | null) => Promise<void>) | null>(null);

  async function requestReply(textToSearch: string, currentLocation: AssistantLocationContext | null) {
    const recentHistory = messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.text,
    }));
    // A deferred GPS request can run after React has appended the current
    // question to state; the current query is already sent separately.
    if (
      recentHistory.length > 0 &&
      recentHistory[recentHistory.length - 1].role === "user" &&
      recentHistory[recentHistory.length - 1].content === textToSearch
    ) {
      recentHistory.pop();
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ishakiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          query: textToSearch,
          location: currentLocation,
          context: conversationContext,
          history: recentHistory,
        }),
      });

      const json = await res.json() as AssistantReply & { message_kiny?: string };
      if (!res.ok || !json.answer_kiny) {
        throw new Error(json.message_kiny || "Ntibyashobotse kubona igisubizo. Ongera ugerageze.");
      }

      setConversationContext(json.context ?? null);
      setMessages((current) => current.concat({
        id: makeMessageId(),
        role: "assistant",
        text: json.answer_kiny,
        reply: json,
      }));
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : "Ikibazo cyabaye mu gihe cyo gushakisha. Ongera ugerageze.";
      setError(message);
      setMessages((current) => current.concat({
        id: makeMessageId(),
        role: "assistant",
        text: "Ntabwo nashoboye kugera ku makuru ubu. Nta gisubizo mpimbye. Ongera ugerageze.",
      }));
    } finally {
      setLoading(false);
    }
  }
  requestReplyRef.current = requestReply;

  // The question box grows upward as words are added (like a chat app), so nothing is hidden,
  // and scrolls only after it reaches a comfortable height.
  useLayoutEffect(() => {
    const box = questionBoxRef.current;
    if (!box) return;
    box.style.height = "auto";
    const maxHeight = Math.min(window.innerHeight * 0.35, 220);
    box.style.height = Math.min(box.scrollHeight, maxHeight) + "px";
    box.style.overflowY = box.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [query, isExpanded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [messages, loading, waitingForLocation]);

  useEffect(() => () => {
    wantRecordingRef.current = false;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    void wakeLockRef.current?.release().catch(() => undefined);
    recognitionRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DICTATION_LANGUAGE_STORAGE_KEY);
      if (isDictationLanguage(saved)) setChosenDictationLanguage(saved);
    } catch {
      // Storage can be blocked; the page language is then used.
    }
  }, []);

  useEffect(() => {
    // A phone can pause the page (screen off, other app). Carry on when the person comes back.
    const resumeWhenVisible = () => {
      if (document.visibilityState === "visible" && wantRecordingRef.current && !recognitionRef.current) {
        scheduleDictationRestart(150);
      }
    };
    document.addEventListener("visibilitychange", resumeWhenVisible);
    return () => document.removeEventListener("visibilitychange", resumeWhenVisible);
  }, []);

  useEffect(() => {
    const rememberOutsideFocus = (event: FocusEvent) => {
      const target = event.target;
      if (
        !isExpanded &&
        target instanceof HTMLElement &&
        !dialogRef.current?.contains(target)
      ) {
        lastOutsideFocusRef.current = target;
      }
    };
    document.addEventListener("focusin", rememberOutsideFocus);
    return () => document.removeEventListener("focusin", rememberOutsideFocus);
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        stopDictation(true);
        setIsExpanded(false);
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      const restoreTarget = lastOutsideFocusRef.current;
      if (restoreTarget?.isConnected) restoreTarget.focus({ preventScroll: true });
      else dialogRef.current?.focus({ preventScroll: true });
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!pendingLocationQuery || !location || loading || locationIsLastKnown) return;
    const pending = pendingLocationQuery;
    setPendingLocationQuery(null);
    setWaitingForLocation(false);
    void requestReplyRef.current?.(pending, location);
  }, [location, pendingLocationQuery, loading, locationIsLastKnown]);

  useEffect(() => {
    if (!pendingLocationQuery || !["error", "offline"].includes(locationStatus)) return;
    setPendingLocationQuery(null);
    setWaitingForLocation(false);
    setMessages((current) => current.concat({
      id: makeMessageId(),
      role: "assistant",
      text: "Ntibyashobotse kumenya aho uri ubu. Ntabwo ngiye gutanga izina ry'umuyobozi ntaramenya aho agomba gushakirwa. Ongera ugerageze kumenya aho uri, cyangwa ubaze izina ry'Umurenge/Akarere ushaka.",
    }));
  }, [locationStatus, pendingLocationQuery]);

  async function handleSearch(rawQuery: string) {
    const textToSearch = rawQuery.trim();
    if (!textToSearch || loading || waitingForLocation) return;
    stopDictation(false);
    stopSpeech();
    setVoiceNotice(null);
    setRecognizedTranscript("");
    setQuery("");
    setError(null);
    setMessages((current) => current.concat({
      id: makeMessageId(),
      role: "user",
      text: textToSearch,
    }));

    // "How do you know where I am?" is a question about the site, not a request to find the person.
    const asksAboutOwnLocation = isAssistantLocationQuestion(textToSearch) && !isSiteExplanationQuestion(textToSearch);

    if (asksAboutOwnLocation && (!location || locationIsLastKnown)) {
      if (!onRequestLocation) {
        setMessages((current) => current.concat({
          id: makeMessageId(),
          role: "assistant",
          text: "Banza ukande Menya aho ndi ku rubuga kugira ngo nshakishe umuyobozi w'aho uri.",
        }));
        return;
      }
      setPendingLocationQuery(textToSearch);
      setWaitingForLocation(true);
      onRequestLocation();
      return;
    }

    await requestReply(textToSearch, location);
  }

  function getRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
    const browser = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
  }

  function writeDictation(includeCurrent = true) {
    const transcript = composeDictation(
      baseTextRef.current,
      previousSessionsRef.current,
      includeCurrent ? currentSessionRef.current : "",
      QUESTION_MAX_LENGTH,
    );
    setQuery(transcript);
    return transcript;
  }

  async function requestDictationWakeLock() {
    // Keeps the screen on while someone speaks for a long time. Optional: ignored where unsupported.
    try {
      const wakeLock = (navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      }).wakeLock;
      if (!wakeLock || wakeLockRef.current) return;
      const sentinel = await wakeLock.request("screen");
      if (!wantRecordingRef.current) {
        void sentinel.release().catch(() => undefined);
        return;
      }
      wakeLockRef.current = sentinel;
    } catch {
      // Not allowed or not supported: dictation still works.
    }
  }

  function releaseDictationWakeLock() {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    void sentinel?.release().catch(() => undefined);
  }

  function stopDictation(graceful: boolean) {
    wantRecordingRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    releaseDictationWakeLock();
    setIsRecording(false);
    const recognition = recognitionRef.current;
    if (recognition && graceful) {
      // Let the phone finish the last word; onend then keeps what was heard.
      try {
        recognition.stop();
      } catch {
        recognition.abort();
      }
      return;
    }
    // Hard stop: later events from this session must not touch the text box.
    sessionIdRef.current += 1;
    recognitionRef.current = null;
    try {
      recognition?.abort();
    } catch {
      // Already stopped.
    }
    previousSessionsRef.current = appendSession(previousSessionsRef.current, currentSessionRef.current);
    currentSessionRef.current = "";
  }

  function finishDictationWithNotice(message: string) {
    stopDictation(false);
    setVoiceNotice(message);
  }

  function scheduleDictationRestart(delayMs: number) {
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!wantRecordingRef.current || recognitionRef.current) return;
      try {
        startRecognitionSession(dictationLanguageRef.current);
      } catch {
        finishDictationWithNotice(t("Microphone ntiyafungutse. Ushobora kwandika ikibazo nk'uko bisanzwe."));
      }
    }, delayMs);
  }

  function startRecognitionSession(language: DictationLanguage) {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) throw new Error("speech-recognition-unavailable");
    const recognition = new Recognition();
    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;
    recognition.lang = DICTATION_LANG_TAGS[language];
    recognition.interimResults = true;
    // Continuous: the phone keeps listening through pauses; we also restart it if it stops by itself.
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    currentSessionRef.current = "";
    sessionStartedRef.current = Date.now();

    recognition.onresult = (event) => {
      if (sessionId !== sessionIdRef.current) return;
      const heard = sessionTranscript(event.results);
      if (!heard) return;
      lastActivityRef.current = Date.now();
      quickFailuresRef.current = 0;
      lastErrorRef.current = null;
      currentSessionRef.current = heard;
      const transcript = composeDictation(
        baseTextRef.current,
        previousSessionsRef.current,
        heard,
        QUESTION_MAX_LENGTH,
      );
      setQuery(transcript);
      const lastResult = event.results[event.results.length - 1];
      const lastPhrase = lastResult?.[0]?.transcript?.trim();
      if (lastPhrase && lastResult?.isFinal) setRecognizedTranscript(lastPhrase);
    };
    recognition.onerror = (event) => {
      if (sessionId !== sessionIdRef.current) return;
      lastErrorRef.current = event.error;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        finishDictationWithNotice(t("Telefone ntiyemeye gukoresha microphone. Ushobora gukomeza kwandika ikibazo."));
      } else if (event.error === "language-not-supported") {
        finishDictationWithNotice(t("Browser ya telefone yawe ntiyumva urwo rurimi. Kanda mu mwanya wo kwandika, ukoreshe ikimenyetso cya microphone kiri ku keyboard (Gboard), cyangwa wandike ikibazo."));
      } else if (event.error === "audio-capture") {
        finishDictationWithNotice(t("Microphone ntiyabonetse cyangwa ntikora kuri iyi telefone. Ushobora kwandika ikibazo."));
      } else if (event.error === "network") {
        // Brief network drops are retried in onend; a lasting one stops there with a clear message.
        setVoiceNotice(t("Serivisi yo kumva ijwi ntiyashoboye kugera ku muyoboro. Reba internet cyangwa wandike ikibazo."));
      } else if (event.error === "no-speech") {
        // A pause is normal: listening continues and restarts quietly.
      } else if (event.error === "aborted") {
        // Stopped by the phone or by us: onend decides whether to continue.
      }
    };
    recognition.onend = () => {
      if (sessionId !== sessionIdRef.current) return;
      previousSessionsRef.current = appendSession(previousSessionsRef.current, currentSessionRef.current);
      currentSessionRef.current = "";
      recognitionRef.current = null;
      if (!wantRecordingRef.current) {
        setIsRecording(false);
        return;
      }
      const now = Date.now();
      const decision = decideAfterSessionEnd({
        now,
        lastActivityAt: lastActivityRef.current,
        sessionStartedAt: sessionStartedRef.current,
        quickFailures: quickFailuresRef.current,
      });
      quickFailuresRef.current = nextQuickFailureCount({
        now,
        sessionStartedAt: sessionStartedRef.current,
        quickFailures: quickFailuresRef.current,
      });
      if (decision.action === "stop") {
        finishDictationWithNotice(decision.reason === "silence"
          ? t("Nta jambo ryumvikanye mu gihe kirekire, gufata ijwi byarahagaze. Kanda “Vuga” kugira ngo ukomeze.")
          : lastErrorRef.current === "network"
            ? t("Serivisi yo kumva ijwi ntiyashoboye kugera ku muyoboro. Reba internet cyangwa wandike ikibazo.")
            : t("Gufata ijwi byahagaze kubera ikibazo cya browser. Kanda “Vuga” wongere ugerageze, cyangwa wandike ikibazo."));
        return;
      }
      scheduleDictationRestart(decision.delayMs);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleVoiceInput() {
    // One tap starts, the next tap stops. The ref is set before start() so two fast taps cannot create two recordings.
    if (wantRecordingRef.current) {
      stopDictation(true);
      return;
    }
    if (!getRecognitionConstructor()) {
      setVoiceNotice(t("Iyi browser ntishyigikira kumva ijwi hano. Ushobora kwandika ikibazo nk'uko bisanzwe."));
      return;
    }
    // A previous session may still be finishing: drop it so only one listens.
    if (recognitionRef.current) stopDictation(false);

    baseTextRef.current = query.slice(0, QUESTION_MAX_LENGTH);
    previousSessionsRef.current = "";
    currentSessionRef.current = "";
    lastActivityRef.current = Date.now();
    quickFailuresRef.current = 0;
    lastErrorRef.current = null;
    wantRecordingRef.current = true;
    setRecognizedTranscript("");
    setVoiceNotice(null);
    try {
      startRecognitionSession(dictationLanguageRef.current);
      setIsRecording(true);
      void requestDictationWakeLock();
    } catch {
      wantRecordingRef.current = false;
      recognitionRef.current = null;
      setIsRecording(false);
      setVoiceNotice(t("Microphone ntiyafungutse. Ushobora kwandika ikibazo nk'uko bisanzwe."));
    }
  }

  function handleDictationLanguageChange(language: DictationLanguage) {
    setChosenDictationLanguage(language);
    dictationLanguageRef.current = language;
    try {
      window.localStorage.setItem(DICTATION_LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Remembering the choice is a convenience only.
    }
    if (!wantRecordingRef.current) return;
    // Switch language in the middle of dictation without losing what was said.
    const previousRecognition = recognitionRef.current;
    sessionIdRef.current += 1;
    recognitionRef.current = null;
    try {
      previousRecognition?.abort();
    } catch {
      // Already stopped.
    }
    previousSessionsRef.current = appendSession(previousSessionsRef.current, currentSessionRef.current);
    currentSessionRef.current = "";
    quickFailuresRef.current = 0;
    scheduleDictationRestart(150);
  }

  function handleQuestionTyped(value: string) {
    // Typing means the person takes over: dictation stops and the typed text becomes the truth.
    if (wantRecordingRef.current || recognitionRef.current) {
      stopDictation(false);
    }
    setQuery(value);
  }
  function waitForMatchingSpeechVoice(languagePrefix: string): Promise<SpeechSynthesisVoice | null> {
    const synthesis = window.speechSynthesis;
    const findVoice = () => synthesis.getVoices().find((voice) =>
      voice.lang.toLowerCase().startsWith(languagePrefix)
    ) ?? null;

    const current = findVoice();
    if (current) return Promise.resolve(current);

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        synthesis.removeEventListener("voiceschanged", handleVoicesChanged);
        resolve(findVoice());
      };
      const handleVoicesChanged = () => {
        if (findVoice()) finish();
      };
      const timeout = window.setTimeout(finish, 1200);
      synthesis.addEventListener("voiceschanged", handleVoicesChanged);
    });
  }

  async function readAnswer(message: IshakiroChatMessage) {
    const requestId = ++speechRequestIdRef.current;
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      setVoiceNotice(t("Iyi telefone ntishyigikira gusoma igisubizo mu ijwi. Ushobora gusoma inyandiko cyangwa gukoresha screen reader."));
      return;
    }

    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const spokenText = normalizeAssistantBrand(t(message.text));
    // The stored assistant answer field is Kinyarwanda. Only switch to the UI
    // language when a verified dictionary translation actually exists.
    const spokenLocale = spokenText !== message.text ? locale : "rw";
    const languagePrefix = spokenLocale === "rw" ? "rw" : spokenLocale;
    const matchingVoice = await waitForMatchingSpeechVoice(languagePrefix);
    if (requestId !== speechRequestIdRef.current) return;

    if (!matchingVoice) {
      setVoiceNotice(spokenLocale === "rw"
        ? t("Nta jwi ry'Ikinyarwanda riri kuri iyi telefone. Koresha TalkBack cyangwa usome inyandiko.")
        : t("Nta jwi rihuye n'ururimi wahisemo kuri iyi telefone. Ushobora gusoma inyandiko."));
      setSpeakingMessageId(null);
      setSpeechPaused(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.voice = matchingVoice;
    utterance.lang = matchingVoice.lang;
    utterance.onend = () => {
      if (requestId !== speechRequestIdRef.current) return;
      setSpeakingMessageId(null);
      setSpeechPaused(false);
    };
    utterance.onerror = () => {
      if (requestId !== speechRequestIdRef.current) return;
      setSpeakingMessageId(null);
      setSpeechPaused(false);
      setVoiceNotice(t("Ntibyashobotse gusoma iki gisubizo mu ijwi. Inyandiko iracyahari."));
    };
    setVoiceNotice(null);
    setSpeakingMessageId(message.id);
    setSpeechPaused(false);
    synthesis.speak(utterance);
  }

  function toggleSpeechPause() {
    if (!("speechSynthesis" in window)) return;
    if (speechPaused) {
      window.speechSynthesis.resume();
      setSpeechPaused(false);
    } else {
      window.speechSynthesis.pause();
      setSpeechPaused(true);
    }
  }

  function stopSpeech() {
    speechRequestIdRef.current += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    setSpeechPaused(false);
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSearch(query);
  }

  function handleReset() {
    stopSpeech();
    stopDictation(false);
    setVoiceNotice(null);
    setRecognizedTranscript("");
    setMessages([]);
    setConversationContext(null);
    setPendingLocationQuery(null);
    setWaitingForLocation(false);
    setQuery("");
    setError(null);
  }

  return (
    <section
      ref={dialogRef}
      role={isExpanded ? "dialog" : undefined}
      aria-modal={isExpanded ? true : undefined}
      id="iwacu-ai-assistant"
      aria-label={t("Iwacu AI")}
      tabIndex={-1}
      className={isExpanded
        ? "photo-wash-gorilla iwacu-isha-shell fixed inset-0 z-[80] flex h-[100dvh] min-h-0 w-screen flex-col overflow-hidden rounded-none border-0 shadow-none"
        : "photo-wash-gorilla iwacu-isha-shell relative overflow-hidden rounded-[28px] border border-white/70 shadow-[0_18px_48px_rgba(6,35,26,0.16)]"}
    >
      <div className={"photo-surface photo-gorilla iwacu-isha-header relative px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5 " + (isExpanded ? "shrink-0" : "")}>
        <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-white/70">
              <IwacuAISun size={34} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#FAD201]">
                IWACU RWANDA · AI
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-display text-base font-extrabold tracking-tight text-white sm:text-xl">
                  {t("Iwacu AI")}
                </h2>
                <span className="rounded-full border border-[#FAD201]/50 bg-[#FAD201]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#FFF2A8]">AI</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-white/85">
                {t("Baza, ganira, ushake amakuru y'ubuyobozi.")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (isExpanded) stopDictation(true);
                setIsExpanded((current) => !current);
              }}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/60 px-3 py-2 text-white hover:bg-white/15"
              aria-label={t(isExpanded ? "Subiza Iwacu AI hasi" : "Fungura Iwacu AI kuri ecran yose")}
              aria-expanded={isExpanded}
              title={t(isExpanded ? "Subiza Iwacu AI hasi" : "Fungura Iwacu AI kuri ecran yose")}
            >
              {isExpanded
                ? <Minimize2 className="h-4 w-4" aria-hidden />
                : <Maximize2 className="h-4 w-4" aria-hidden />}
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-white/60 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                aria-label={t("Tangira ikiganiro gishya")}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{t("Tangira bundi bushya")}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={isExpanded
        ? "iwacu-chat-canvas flex min-h-0 flex-1 flex-col bg-[#F7FAF8] p-3 sm:p-5"
        : "iwacu-chat-canvas bg-[#F7FAF8] p-3 sm:p-5"}>
        <div
          className={isExpanded
            ? "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1"
            : "max-h-[52vh] space-y-3 overflow-y-auto overscroll-contain pr-1"}
          role="log"
          aria-label={t("Ikiganiro na Iwacu AI")}
          aria-live="polite"
          aria-relevant="additions"
          aria-atomic="false"
        >
          {messages.length === 0 && (
            <div className="iwacu-chat-answer-card rounded-2xl border border-[#D9E6DF] bg-white p-3 sm:p-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#DDE8E1]">
                  <IwacuAISun size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-[#123D2D]">{t("Muraho, ndi Iwacu AI.")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#455B50]">
                    {t("Nshobora gushaka ahantu n'abayobozi, kuguha amakuru y'ubutabazi no kukubwira aho amakuru abura.")}
                    {" "}
                    {t("Igisubizo cyose cy'amakuru kigomba kugira aho cyavuye.")}
                  </p>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#52685C]">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#16865B]" aria-hidden />
                      {t("Ntabwo mpimba amakuru")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5 text-[#16865B]" aria-hidden />
                      {t("Amakuru aturuka mu bubiko bwemewe")}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#60746A]">
                    {t("Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.")}
                  </p>
                </div>
              </div>
              <div className="mt-2.5">
                {isExpanded ? (
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#20603D]">
                    {t("Ibibazo by'ibanze")}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowStarters((current) => !current)}
                    aria-expanded={showStarters}
                    aria-controls="iwacu-isha-starters"
                    className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-[#D6E5DB] bg-[#F4F9F5] px-3 text-xs font-extrabold text-[#174B37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                  >
                    <span>{t("Ibibazo by'ibanze")}</span>
                    <ChevronDown className={"h-4 w-4 shrink-0 transition-transform " + (showStarters ? "rotate-180" : "")} aria-hidden />
                  </button>
                )}
                {(isExpanded || showStarters) && (
                  <div id="iwacu-isha-starters" className="mt-2 grid gap-2 sm:grid-cols-2">
                    {STARTER_GROUPS.map((group, groupIndex) => (
                      <section key={group.label} className="iwacu-isha-question-group rounded-2xl border border-[#D6E5DB] p-2.5">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="iwacu-isha-question-index flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black">
                            0{groupIndex + 1}
                          </span>
                          <h3 className="text-[11px] font-extrabold tracking-wide text-[#174B37]">
                            {t(group.label)}
                          </h3>
                        </div>
                        <div className="space-y-1.5">
                          {group.questions.map((starter) => (
                            <button
                              key={starter}
                              type="button"
                              onClick={() => void handleSearch(starter)}
                              disabled={loading}
                              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-[#E1EAE4] bg-white/90 px-3 py-2 text-left text-xs font-semibold leading-relaxed text-[#174B37] transition-colors hover:border-[#16865B] hover:bg-[#F1F8F3] disabled:opacity-50"
                            >
                              <span>{t(starter)}</span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-[#16865B]" aria-hidden />
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={message.role === "user" ? "max-w-[92%] sm:max-w-[82%]" : "w-full max-w-[96%]"}>
                <div className={"flex items-start gap-2.5 " + (message.role === "user" ? "flex-row-reverse" : "")}>
                  <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full " + (
                    message.role === "user" ? "bg-[#DCE9F6] text-[#23517A]" : "bg-white ring-1 ring-[#DDE8E1]"
                  )}>
                    {message.role === "user"
                      ? <UserRound className="h-4 w-4" aria-hidden />
                      : <IwacuAISun size={28} />}
                  </div>

                  <div
                    data-no-localize={message.role === "user" ? "true" : undefined}
                    className={"min-w-0 rounded-2xl px-4 py-3 shadow-sm " + (
                    message.role === "user"
                      ? "rounded-tr-md bg-[#DCE9F6] text-[#173B5C]"
                      : "iwacu-chat-answer-card rounded-tl-md border border-[#DDE8E1] bg-white text-[#1B352A]"
                  )}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.role === "assistant" ? normalizeAssistantBrand(t(message.text)) : message.text}</p>
                    {message.role === "assistant" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {speakingMessageId === message.id ? (
                          <>
                            <button
                              type="button"
                              onClick={toggleSpeechPause}
                              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#BFD6C8] bg-[#F4F9F5] px-3 py-2 text-xs font-bold text-[#174B37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                              aria-label={t(speechPaused ? "Komeza gusoma" : "Hagarika akanya gusoma")}
                            >
                              {speechPaused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                              {t(speechPaused ? "Komeza" : "Hagarika akanya")}
                            </button>
                            <button
                              type="button"
                              onClick={stopSpeech}
                              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#BFD6C8] bg-white px-3 py-2 text-xs font-bold text-[#174B37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                            >
                              <Square className="h-3.5 w-3.5" aria-hidden />
                              {t("Hagarika gusoma")}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => readAnswer(message)}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#BFD6C8] bg-[#F4F9F5] px-3 py-2 text-xs font-bold text-[#174B37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
                          >
                            <Volume2 className="h-4 w-4" aria-hidden />
                            {t("Soma igisubizo")}
                          </button>
                        )}
                      </div>
                    )}


                    {message.reply?.gap_recorded && (
                      <p role="status" className="mt-2 rounded-xl bg-[#EAF4EE] px-3 py-2 text-xs leading-relaxed text-[#174B37]">
                        {message.reply.gap_notified
                          ? t("Iri menyesha ryagejejwe ku buyobozi bubishinzwe.")
                          : t("Iri menyyesha ryabitswe, ariko nta konti y'ubuyobozi ishobora kurihabwa ubu.")}
                      </p>
                    )}

                    {message.reply && (
                      <div className="mt-3 space-y-3">
                        {message.reply.places?.map((place) => (
                          <a
                            key={place.scope_code}
                            href={"/abayobozi/aho/" + encodeURIComponent(place.scope_code)}
                            className="flex min-h-[54px] items-center justify-between gap-3 rounded-xl border border-[#D8E5DD] bg-[#F5FAF7] p-3 text-left hover:border-[#16865B]"
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <MapPin className="h-4 w-4 shrink-0 text-[#16865B]" aria-hidden />
                              <span className="min-w-0">
                                <span data-no-localize="true" className="block text-sm font-semibold text-[#123D2D]">{locale === "en" && place.name_eng ? place.name_eng : place.name_kiny}</span>
                                <span className="mt-0.5 block text-[11px] text-[#60746A]">{t(place.full_path)}</span>
                              </span>
                            </span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-[#60746A]" aria-hidden />
                          </a>
                        ))}

                        {message.reply.leaders?.map((leader) => (
                          <article key={leader.appointment_id} className="overflow-hidden rounded-2xl border border-[#D8E5DD] bg-white">
                            <div className="p-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D7E5DC] bg-[#EAF4EE] text-sm font-bold text-[#216243]">
                                  <span aria-hidden>{leaderInitials(leader.display_name)}</span>
                                  {leader.photo_url && (
                                    <img
                                      src={leader.photo_url}
                                      alt={leader.display_name}
                                      loading="lazy"
                                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                                      className="absolute inset-0 h-full w-full object-cover"
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 data-no-localize="true" className="text-sm font-bold text-[#123D2D]">{leader.display_name}</h3>
                                  <p className="mt-1 text-xs font-semibold text-[#315D47]">{locale === "en" ? (leader.role_eng || t("Umwanya ntiwanditswe")) : locale === "fr" ? (leader.role_fra || leader.role_eng || t("Umwanya ntiwanditswe")) : leader.role_kiny}</p>
                                  <p className="mt-0.5 text-[11px] text-[#6B7B72]">
                                    {t(administrativeLevelName(leader.place_level))}: <span data-no-localize="true">{locale === "en" && leader.place_name_eng ? leader.place_name_eng : leader.place_name}</span>
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-[#EAF4EE] px-2 py-1 text-[10px] font-semibold text-[#216243]">
                                  {t("Mu makuru rusange")}
                                </span>
                              </div>

                              {leader.contacts?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {leader.contacts.map((contact, index) => {
                                    if (!isTelephoneType(contact.type)) return null;
                                    const telephone = safeTelephone(contact.value);
                                    if (!telephone) return null;
                                    return (
                                      <a
                                        key={contact.type + index}
                                        href={"tel:" + telephone}
                                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0B6846] px-3 py-2 text-xs font-bold text-white hover:bg-[#075437]"
                                      >
                                        <Phone className="h-3.5 w-3.5" aria-hidden />
                                        {t(contact.label || contact.value)}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}

                              <a
                                href={"/abayobozi/" + encodeURIComponent(leader.appointment_id)}
                                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#08734B] hover:underline"
                              >
                                {t("Reba amakuru y'uyu muyobozi")}
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              </a>
                            </div>
                          </article>
                        ))}

                        {message.reply.emergency_contacts?.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {message.reply.emergency_contacts.map((contact) => (
                              <a
                                key={contact.number}
                                href={"tel:" + safeTelephone(contact.number)}
                                className="flex min-h-[52px] items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 hover:bg-red-100"
                              >
                                <span className="min-w-0">
                                  <span className="block text-xs font-semibold text-[#6E2424]">{t(contact.name_kiny)}</span>
                                  <span className="mt-0.5 block text-[10px] text-[#8A5555]">{t(contact.source)}</span>
                                </span>
                                <span className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">{contact.number}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {(message.reply.confidence_label || message.reply.sources?.length > 0) && (
                          <div className="rounded-xl bg-[#F3F7F4] p-3">
                            {message.reply.confidence_label && (
                              <p className="text-[11px] leading-relaxed text-[#52685C]">
                                <strong>{t("Icyizere:")}</strong> {t(message.reply.confidence_label)}
                              </p>
                            )}
                            {message.reply.sources?.map((source, index) => (
                              <div key={source.label + index} className="mt-2 border-t border-[#DDE8E1] pt-2">
                                <p className="text-[10px] leading-relaxed text-[#60746A]">
                                  <strong>{t("Inkomoko:")}</strong>{" "}
                                  {source.url ? (
                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">
                                      {t(source.label)}
                                    </a>
                                  ) : t(source.label)}
                                  {" "}· {source.data_date || t("Itariki yo gutangaza ntiyatangajwe.")}
                                  {source.trust_tier && (
                                    <span className="ml-1 rounded bg-[#E7F0EA] px-1.5 py-0.5">
                                      {source.trust_tier === "official_government" ? t("Leta") :
                                        source.trust_tier === "intergovernmental_academic" ? t("Umuryango mpuzamahanga / uburezi") :
                                          source.trust_tier === "reputable_publisher" ? t("Itangazamakuru") : t("Irindi soko")}
                                    </span>
                                  )}
                                </p>
                                {source.snippet && (
                                  <p data-no-localize="true" className="mt-1 text-[11px] leading-relaxed text-[#455B50]">{source.snippet}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {message.reply.gap_recorded && (
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                            {t("Icyuho cy'amakuru cyanditswe kugira ngo kizakurikiranwe.")}
                          </p>
                        )}

                        {message.reply.suggestions?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {message.reply.suggestions.map((suggestion, index) => (
                              <button
                                key={suggestion + index}
                                type="button"
                                onClick={() => void handleSearch(suggestion)}
                                disabled={loading}
                                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#BFD6C8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#245B3D] hover:bg-[#EDF7F1] disabled:opacity-50"
                              >
                                {t(suggestion)}
                                <ArrowRight className="h-3 w-3" aria-hidden />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {(loading || waitingForLocation) && (
            <div className="flex items-center gap-3 px-1 py-2" role="status">
              <IwacuAISun size={34} className="sun-pulse" />
              <span className="text-xs text-[#52685C]">
                {waitingForLocation ? t("Turimo kumenya aho uri kugira ngo dushake umuyobozi...") : t("Turimo kugenzura amakuru...")}
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        {voiceNotice && (
          <p role="status" aria-live="polite" className="mt-2 rounded-xl border border-[#c8dbcf] bg-[#f2f8f4] px-3 py-1.5 text-[11px] leading-snug text-[#294c37]">
            {voiceNotice}
          </p>
        )}
        {recognizedTranscript && (
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {t("Amagambo telefone yumvise:")} {recognizedTranscript}
          </p>
        )}

        <form onSubmit={handleFormSubmit} className={isExpanded
          ? "mt-3 shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
          : "mt-3"}>
          <label htmlFor="iwacu-assistant-question" className="sr-only">{t("Andika ikibazo cyawe")}</label>
          <div className="flex items-end gap-1 rounded-[20px] border border-[#C8DBCF] bg-white p-1 shadow-inner transition-colors focus-within:border-[#16865B]">
            <textarea
              id="iwacu-assistant-question"
              ref={questionBoxRef}
              value={query}
              onChange={(event) => handleQuestionTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSearch(query);
                }
              }}
              placeholder={t(isRecording ? "Ndakumva… vuga." : "Andika ikibazo cyawe hano...")}
              rows={1}
              maxLength={QUESTION_MAX_LENGTH}
              className="min-h-[40px] min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-2.5 py-2.5 text-sm leading-5 text-[#183D2D] outline-none placeholder:text-[#8B9A91]"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={loading}
              className={"relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0] disabled:opacity-50 " + (
                isRecording
                  ? "bg-[#08734B] text-white shadow-[0_0_0_3px_rgba(8,115,75,0.18)]"
                  : "bg-[#EAF4EE] text-[#174B37] hover:bg-[#DCEEE3]"
              )}
              aria-label={t(isRecording ? "Hagarika gufata ijwi" : "Vuga ikibazo")}
              title={t(isRecording ? "Hagarika gufata ijwi" : "Vuga ikibazo")}
              aria-pressed={isRecording}
            >
              {isRecording && (
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-[#08734B]/30 motion-safe:animate-ping" />
              )}
              <Mic className="relative h-4 w-4" aria-hidden />
            </button>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#08734B] text-white transition-colors hover:bg-[#075437] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("Ohereza ikibazo")}
              title={t("Ohereza ikibazo")}
            >
              {loading
                ? <IwacuAISun size={20} className="sun-pulse" />
                : <Send className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {isRecording ? t("Urimo kumva ijwi ryawe. Komeza uvuge, amagambo arandikwa uko uyavuze. Kanda “Hagarika” urangije, urebe inyandiko mbere yo kohereza.") : ""}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[10px] text-[#72847A]">
            <label className="relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[#C8DBCF] bg-[#F4F9F5] pl-2 pr-1.5 text-[11px] font-bold text-[#174B37] focus-within:ring-2 focus-within:ring-[#00A3E0]">
              <Globe className="h-3 w-3" aria-hidden />
              <span aria-hidden>{DICTATION_LANGUAGE_NAMES[dictationLanguage]}</span>
              <ChevronDown className="h-3 w-3" aria-hidden />
              <select
                value={dictationLanguage}
                onChange={(event) => {
                  if (isDictationLanguage(event.target.value)) handleDictationLanguageChange(event.target.value);
                }}
                aria-label={t("Vuga mu rurimi:")}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                {DICTATION_LANGUAGES.map((language) => (
                  <option key={language} value={language} lang={language}>{DICTATION_LANGUAGE_NAMES[language]}</option>
                ))}
              </select>
            </label>
            <span className="min-w-0 flex-1 truncate text-right">{t("Ntukandike amakuru y'ibanga.")}</span>
            <span className="shrink-0 tabular-nums">{query.length}/{QUESTION_MAX_LENGTH}</span>
          </div>
        </form>
      </div>
    </section>
  );
}
