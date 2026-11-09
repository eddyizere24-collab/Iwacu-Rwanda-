"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight, Bot, ExternalLink, Loader2, MapPin, MessageCircle,
  Phone, RotateCcw, Send, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import type { AssistantLocationContext, AssistantReply } from "@/lib/assistant/contracts";

interface AiSearchAssistantProps {
  location?: AssistantLocationContext | null;
  locationStatus?: "idle" | "requesting_gps" | "locating" | "success" | "error" | "offline";
  onRequestLocation?: () => void;
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  reply?: AssistantReply;
};

const STARTER_QUESTIONS = [
  "Ninde uyobora umurenge wa Kacyiru?",
  "Meya w'Akarere ka Gasabo ni nde?",
  "Mpa nimero z'ubutabazi.",
  "Ninde uyobora aho ndi?",
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
  onRequestLocation,
}: AiSearchAssistantProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationContext, setConversationContext] = useState<AssistantReply["context"]>(null);
  const [loading, setLoading] = useState(false);
  const [waitingForLocation, setWaitingForLocation] = useState(false);
  const [pendingLocationQuery, setPendingLocationQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const requestReplyRef = useRef<((text: string, currentLocation: AssistantLocationContext | null) => Promise<void>) | null>(null);

  async function requestReply(textToSearch: string, currentLocation: AssistantLocationContext | null) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-router", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          query: textToSearch,
          location: currentLocation,
          context: conversationContext,
        }),
      });

      const json = await res.json() as AssistantReply & { message_kiny?: string };
      if (!res.ok || !json.answer_kiny) {
        throw new Error(json.message_kiny || "Ntibyashobotse kubona igisubizo. Ongera ugerageze.");
      }

      if (json.context) setConversationContext(json.context);
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

  useEffect(() => {
    if (!pendingLocationQuery || !location || loading) return;
    const pending = pendingLocationQuery;
    setPendingLocationQuery(null);
    setWaitingForLocation(false);
    void requestReplyRef.current?.(pending, location);
  }, [location, pendingLocationQuery, loading]);

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

    setQuery("");
    setError(null);
    setMessages((current) => current.concat({
      id: makeMessageId(),
      role: "user",
      text: textToSearch,
    }));

    const asksAboutOwnLocation =
      /\b(aho ndi|hafi yanjye|wanjye|iwacu|my location|my village|where i am|near me|chez moi|ma position)\b/i.test(textToSearch);

    if (asksAboutOwnLocation && !location) {
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

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSearch(query);
  }

  function handleReset() {
    setMessages([]);
    setConversationContext(null);
    setPendingLocationQuery(null);
    setWaitingForLocation(false);
    setQuery("");
    setError(null);
  }

  return (
    <section
      className="photo-wash-gorilla relative overflow-hidden rounded-[28px] border border-white/70 shadow-[0_18px_48px_rgba(6,35,26,0.16)]"
      aria-label="Ishakiro ry'Ubuhanga"
    >
      <div className="photo-surface photo-gorilla relative px-5 pb-5 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
        <div className="ribbon-rwanda absolute inset-x-0 top-0 h-1.5" aria-hidden />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FAD201] text-[#06231A] shadow-sm">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Ishakiro ry'Ubuhanga
                </h2>
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white">AI</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/85">
                Baza, ganira, ushake amakuru y'ubuyobozi.
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-white/60 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
              aria-label="Tangira ikiganiro gishya"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Tangira bundi bushya</span>
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-white/90">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#FAD201]" aria-hidden />
            Ntabwo mpimba amakuru
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Amakuru aturuka mu bubiko bwemewe
          </span>
        </div>
      </div>

      <div className="bg-[#F7FAF8] p-4 sm:p-6">
        <div
          className="max-h-[58vh] min-h-[190px] space-y-4 overflow-y-auto overscroll-contain pr-1"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {messages.length === 0 && (
            <div className="rounded-2xl border border-[#D9E6DF] bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B4D36] text-white">
                  <Bot className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#123D2D]">Muraho, ndi Ishakiro ry'Ubuhanga.</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#455B50]">
                    Nshobora gushaka ahantu n'abayobozi, kuguha amakuru y'ubutabazi no kukubwira aho amakuru abura.
                    Igisubizo cyose cy'amakuru kigomba kugira aho cyavuye.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#60746A]">
                    Hitamo ikibazo cyangwa wandike icyo ushaka kumenya.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {STARTER_QUESTIONS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void handleSearch(starter)}
                    disabled={loading}
                    className="flex min-h-[46px] items-center justify-between gap-2 rounded-xl border border-[#D9E6DF] bg-[#F8FBF9] px-3 py-2 text-left text-xs font-medium text-[#174B37] transition-colors hover:border-[#16865B] hover:bg-[#EDF7F1] disabled:opacity-50"
                  >
                    <span>{starter}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={message.role === "user" ? "max-w-[92%] sm:max-w-[82%]" : "w-full max-w-[96%]"}>
                <div className={"flex items-start gap-2.5 " + (message.role === "user" ? "flex-row-reverse" : "")}>
                  <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full " + (
                    message.role === "user" ? "bg-[#DCE9F6] text-[#23517A]" : "bg-[#0B4D36] text-white"
                  )}>
                    {message.role === "user"
                      ? <UserRound className="h-4 w-4" aria-hidden />
                      : <Bot className="h-4 w-4" aria-hidden />}
                  </div>

                  <div className={"min-w-0 rounded-2xl px-4 py-3 shadow-sm " + (
                    message.role === "user"
                      ? "rounded-tr-md bg-[#DCE9F6] text-[#173B5C]"
                      : "rounded-tl-md border border-[#DDE8E1] bg-white text-[#1B352A]"
                  )}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>

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
                                <span className="block text-sm font-semibold text-[#123D2D]">{place.name_kiny}</span>
                                <span className="mt-0.5 block text-[11px] text-[#60746A]">{place.full_path}</span>
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
                                  <h3 className="text-sm font-bold text-[#123D2D]">{leader.display_name}</h3>
                                  <p className="mt-1 text-xs font-semibold text-[#315D47]">{leader.role_kiny}</p>
                                  <p className="mt-0.5 text-[11px] text-[#6B7B72]">
                                    {administrativeLevelName(leader.place_level)}: {leader.place_name}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-[#EAF4EE] px-2 py-1 text-[10px] font-semibold text-[#216243]">
                                  Mu makuru rusange
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
                                        className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#0B6846] px-3 py-2 text-xs font-bold text-white hover:bg-[#075437]"
                                      >
                                        <Phone className="h-3.5 w-3.5" aria-hidden />
                                        {contact.label || contact.value}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}

                              <a
                                href={"/abayobozi/" + encodeURIComponent(leader.appointment_id)}
                                className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-[#08734B] hover:underline"
                              >
                                Reba amakuru y'uyu muyobozi
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
                                  <span className="block text-xs font-semibold text-[#6E2424]">{contact.name_kiny}</span>
                                  <span className="mt-0.5 block text-[10px] text-[#8A5555]">{contact.source}</span>
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
                                <strong>Icyizere:</strong> {message.reply.confidence_label}
                              </p>
                            )}
                            {message.reply.sources?.map((source, index) => (
                              <p key={source.label + index} className="mt-1 text-[10px] leading-relaxed text-[#60746A]">
                                <strong>Inkomoko:</strong>{" "}
                                {source.url ? (
                                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">
                                    {source.label}
                                  </a>
                                ) : source.label}
                                {" "}· {source.data_date || "Itariki y'amakuru ntiyatangajwe."}
                              </p>
                            ))}
                          </div>
                        )}

                        {message.reply.gap_recorded && (
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                            Icyuho cy'amakuru cyanditswe kugira ngo kizakurikiranwe.
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
                                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#BFD6C8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#245B3D] hover:bg-[#EDF7F1] disabled:opacity-50"
                              >
                                {suggestion}
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
            <div className="flex items-start gap-2.5" role="status">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B4D36] text-white">
                <Bot className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex min-h-[44px] items-center gap-2 rounded-2xl rounded-tl-md border border-[#DDE8E1] bg-white px-4 py-3 text-xs text-[#52685C]">
                <Loader2 className="h-4 w-4 animate-spin text-[#16865B]" aria-hidden />
                {waitingForLocation ? "Turimo kumenya aho uri kugira ngo dushake umuyobozi..." : "Turimo kugenzura amakuru..."}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <form onSubmit={handleFormSubmit} className="mt-4">
          <label htmlFor="iwacu-assistant-question" className="sr-only">Andika ikibazo cyawe</label>
          <div className="flex items-end gap-2 rounded-2xl border-2 border-[#C8DBCF] bg-white p-2 shadow-inner focus-within:border-[#16865B]">
            <textarea
              id="iwacu-assistant-question"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSearch(query);
                }
              }}
              placeholder="Andika ikibazo cyawe hano..."
              rows={1}
              maxLength={500}
              className="max-h-28 min-h-[44px] flex-1 resize-y border-0 bg-transparent px-2 py-3 text-sm text-[#183D2D] outline-none placeholder:text-[#8B9A91]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex min-h-[44px] min-w-[48px] items-center justify-center gap-2 rounded-xl bg-[#08734B] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#075437] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Ohereza ikibazo"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                : <Send className="h-4 w-4" aria-hidden />}
              <span className="hidden sm:inline">Ohereza</span>
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-[#72847A]">
            <span>Ntukandike amakuru y'ibanga.</span>
            <span>{query.length}/500</span>
          </div>
        </form>
      </div>
    </section>
  );
}
