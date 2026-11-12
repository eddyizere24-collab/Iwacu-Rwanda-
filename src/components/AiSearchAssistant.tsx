"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight, ExternalLink, Maximize2, Minimize2, MapPin, MessageCircle,
  Phone, RotateCcw, Send, ShieldCheck, UserRound, Mic, Volume2, Pause, Play, Square,
} from "lucide-react";
import type { AssistantLocationContext, AssistantReply } from "@/lib/assistant/contracts";
import { useI18n } from "@/components/LocaleProvider";
import { isAssistantLocationQuestion } from "@/lib/assistant/intent";
import { IwacuAISun } from "@/components/RwandanSun";

interface AiSearchAssistantProps {
  location?: AssistantLocationContext | null;
  locationStatus?: "idle" | "requesting_gps" | "locating" | "success" | "error" | "offline";
  locationIsLastKnown?: boolean;
  onRequestLocation?: () => void;
}


type SpeechAlternativeLike = { transcript: string };
type SpeechResultLike = ArrayLike<SpeechAlternativeLike> & { isFinal?: boolean };
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
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  reply?: AssistantReply;
};

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationContext, setConversationContext] = useState<AssistantReply["context"]>(null);
  const [loading, setLoading] = useState(false);
  const [waitingForLocation, setWaitingForLocation] = useState(false);
  const [pendingLocationQuery, setPendingLocationQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [recognizedTranscript, setRecognizedTranscript] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechPaused, setSpeechPaused] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechRequestIdRef = useRef(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const lastOutsideFocusRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [messages, loading, waitingForLocation]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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
        recognitionRef.current?.stop();
        setIsRecording(false);
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
    stopSpeech();
    setVoiceNotice(null);
    setRecognizedTranscript("");
    if (window.matchMedia("(max-width: 767px)").matches) setIsExpanded(true);

    setQuery("");
    setError(null);
    setMessages((current) => current.concat({
      id: makeMessageId(),
      role: "user",
      text: textToSearch,
    }));

    const asksAboutOwnLocation = isAssistantLocationQuestion(textToSearch);

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

  function handleVoiceInput() {
    // The ref is set before start() so two fast taps cannot create two recordings.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current.abort();
      }
      return;
    }

    const browser = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceNotice(t("Iyi browser ntishyigikira kumva ijwi hano. Ushobora kwandika ikibazo nk'uko bisanzwe."));
      return;
    }

    const recognition = new Recognition();
    recognition.lang = locale === "rw" ? "rw-RW" : locale === "fr" ? "fr-FR" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) =>
        event.results[index]?.[0]?.transcript ?? ""
      ).join(" ").trim();
      if (transcript) setQuery(transcript);
      const lastResult = event.results[event.results.length - 1];
      if (transcript && lastResult?.isFinal) {
        setRecognizedTranscript(transcript);
      }
    };
    recognition.onerror = (event) => {
      setIsRecording(false);
      recognitionRef.current = null;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceNotice(t("Telefone ntiyemeye gukoresha microphone. Ushobora gukomeza kwandika ikibazo."));
      } else if (event.error === "language-not-supported") {
        setVoiceNotice(t("Ururimi wahisemo ntirushyigikiwe n'ijwi rya iyi browser. Andika ikibazo aho kuvuga."));
      } else if (event.error === "audio-capture") {
        setVoiceNotice(t("Microphone ntiyabonetse cyangwa ntikora kuri iyi telefone. Ushobora kwandika ikibazo."));
      } else if (event.error === "network") {
        setVoiceNotice(t("Serivisi yo kumva ijwi ntiyashoboye kugera ku muyoboro. Reba internet cyangwa wandike ikibazo."));
      } else if (event.error === "no-speech") {
        setVoiceNotice(t("Nta jambo ryumvikanye. Ongera uvuge cyangwa wandike ikibazo."));
      } else if (event.error === "aborted") {
        setVoiceNotice(t("Gufata ijwi byahagaritswe. Ushobora gukomeza kwandika ikibazo."));
      } else {
        setVoiceNotice(t("Ijwi ntiryumvikanye neza. Ongera ugerageze cyangwa wandike ikibazo."));
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    setRecognizedTranscript("");
    setVoiceNotice(t("Vuga ikibazo. Ibyo telefone yumvise bizagaragara mu mwanya wo kwandika; genzura mbere yo kohereza."));
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      recognitionRef.current = null;
      setIsRecording(false);
      setVoiceNotice(t("Microphone ntiyafungutse. Ushobora kwandika ikibazo nk'uko bisanzwe."));
    }
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

  async function readAnswer(message: ChatMessage) {
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
    const spokenText = t(message.text);
    // Ishakiro's stored answer field is Kinyarwanda. Only switch to the UI
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
    recognitionRef.current?.abort();
    setIsRecording(false);
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
      <div className={"photo-surface photo-gorilla iwacu-isha-header relative px-5 pb-5 pt-6 sm:px-8 sm:pb-7 sm:pt-8 " + (isExpanded ? "shrink-0" : "")}>
        <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-white/70">
              <IwacuAISun size={42} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#FAD201]">
                IWACU RWANDA · AI
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  {t("Ishakiro ry'Ubuhanga")}
                </h2>
                <span className="rounded-full border border-[#FAD201]/50 bg-[#FAD201]/15 px-2.5 py-1 text-[10px] font-extrabold text-[#FFF2A8]">AI</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/85">
                {t("Baza, ganira, ushake amakuru y'ubuyobozi.")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (isExpanded) {
                  recognitionRef.current?.stop();
                  setIsRecording(false);
                }
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

        <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-white/90">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#FAD201]" aria-hidden />
            {t("Ntabwo mpimba amakuru")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            {t("Amakuru aturuka mu bubiko bwemewe")}
          </span>
        </div>
      </div>

      <div className={isExpanded
        ? "iwacu-chat-canvas flex min-h-0 flex-1 flex-col bg-[#F7FAF8] p-4 sm:p-6"
        : "iwacu-chat-canvas bg-[#F7FAF8] p-4 sm:p-6"}>
        <div
          className={isExpanded
            ? "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1"
            : "max-h-[58vh] min-h-[190px] space-y-4 overflow-y-auto overscroll-contain pr-1"}
          role="log"
          aria-label={t("Ikiganiro na Iwacu AI")}
          aria-live="polite"
          aria-relevant="additions"
          aria-atomic="false"
        >
          {messages.length === 0 && (
            <div className="iwacu-chat-answer-card rounded-2xl border border-[#D9E6DF] bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#DDE8E1]">
                  <IwacuAISun size={34} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#123D2D]">{t("Muraho, ndi Ishakiro ry'Ubuhanga.")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#455B50]">
                    {t("Nshobora gushaka ahantu n'abayobozi, kuguha amakuru y'ubutabazi no kukubwira aho amakuru abura.")}
                    {t("Igisubizo cyose cy'amakuru kigomba kugira aho cyavuye.")}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#60746A]">
                    {t("Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.")}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#20603D]">
                    {t("Ibibazo by'ibanze")}
                  </p>
                  <span className="rounded-full border border-[#D9E6DF] bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#60746A]">
                    {t("Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.")}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {STARTER_GROUPS.map((group, groupIndex) => (
                    <section key={group.label} className="iwacu-isha-question-group rounded-2xl border border-[#D6E5DB] p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="iwacu-isha-question-index flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black">
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
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.role === "assistant" ? t(message.text) : message.text}</p>
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
          <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-[#c8dbcf] bg-[#f2f8f4] px-3 py-2 text-xs leading-relaxed text-[#294c37]">
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
          : "mt-4"}>
          <label htmlFor="iwacu-assistant-question" className="sr-only">{t("Andika ikibazo cyawe")}</label>
          <div className="flex items-end gap-2 rounded-2xl border-2 border-[#C8DBCF] bg-white p-2 shadow-inner focus-within:border-[#16865B]">
            <textarea
              id="iwacu-assistant-question"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (window.matchMedia("(max-width: 767px)").matches) setIsExpanded(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSearch(query);
                }
              }}
              placeholder={t("Andika ikibazo cyawe hano...")}
              rows={1}
              maxLength={500}
              className="max-h-28 min-h-[44px] flex-1 resize-y border-0 bg-transparent px-2 py-3 text-sm text-[#183D2D] outline-none placeholder:text-[#8B9A91]"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={loading}
              className={"inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0] disabled:opacity-50 " + (
                isRecording
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-[#C8DBCF] bg-[#F4F9F5] text-[#174B37]"
              )}
              aria-label={t(isRecording ? "Hagarika gufata ijwi" : "Vuga ikibazo")}
              title={t(isRecording ? "Hagarika gufata ijwi" : "Vuga ikibazo")}
              aria-pressed={isRecording}
            >
              <Mic className={"h-4 w-4 " + (isRecording ? "animate-pulse" : "")} aria-hidden />
              <span className="whitespace-nowrap">{t(isRecording ? "Hagarika" : "Vuga")}</span>
            </button>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex min-h-[44px] min-w-[48px] items-center justify-center gap-2 rounded-xl bg-[#08734B] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#075437] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("Ohereza ikibazo")}
            >
              {loading
                ? <IwacuAISun size={22} className="sun-pulse" />
                : <Send className="h-4 w-4" aria-hidden />}
              <span className="hidden sm:inline">{t("Ohereza")}</span>
            </button>
          </div>
          {isRecording && (
            <p role="status" aria-live="polite" className="mt-2 text-xs font-semibold text-red-700">
              {t("Urimo kumva ijwi ryawe. Vuga ikibazo, uhagarike, urebe amagambo yanditse mbere yo kohereza.")}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-[#72847A]">
            <span>{t("Ntukandike amakuru y'ibanga.")}</span>
            <span>{query.length}/500</span>
          </div>
        </form>
      </div>
    </section>
  );
}
