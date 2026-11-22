"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";
import { speakKinyarwanda, unlockRwAudio, type RwSpeech } from "@/lib/voice/rw-speech";

interface ReadAloudButtonProps {
  text: string;
  label?: string;
}

async function findInstalledVoice(languagePrefix: string): Promise<SpeechSynthesisVoice | null> {
  const synthesis = window.speechSynthesis;
  const find = () => synthesis.getVoices().find((voice) =>
    voice.lang.toLowerCase().startsWith(languagePrefix.toLowerCase())
  ) ?? null;

  const initial = find();
  if (initial) return initial;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      synthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(find());
    };
    const onVoicesChanged = () => {
      if (find()) finish();
    };
    const timeout = window.setTimeout(finish, 1500);
    synthesis.addEventListener("voiceschanged", onVoicesChanged);
  });
}

export function ReadAloudButton({ text, label }: ReadAloudButtonProps) {
  const { locale, t } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const rwSpeechRef = useRef<RwSpeech | null>(null);

  function stop() {
    requestIdRef.current += 1;
    rwSpeechRef.current?.stop();
    rwSpeechRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }

  async function startOrToggle() {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      setNotice(t("Iyi telefone ntishyigikira gusoma amabwiriza mu ijwi. Ushobora gukomeza gukoresha inyandiko."));
      return;
    }

    const synthesis = window.speechSynthesis;
    if (speaking) {
      if (rwSpeechRef.current) {
        if (paused) rwSpeechRef.current.resume();
        else rwSpeechRef.current.pause();
        setPaused(!paused);
        return;
      }
      if (paused) {
        synthesis.resume();
        setPaused(false);
      } else {
        synthesis.pause();
        setPaused(true);
      }
      return;
    }

    const requestId = ++requestIdRef.current;
    unlockRwAudio();
    synthesis.cancel();
    setNotice(null);
    const voice = await findInstalledVoice(locale === "rw" ? "rw" : locale);
    if (requestId !== requestIdRef.current) return;

    if (!voice && locale === "rw") {
      // Our own Kinyarwanda voice: it needs nothing installed on the phone.
      const speech = speakKinyarwanda(text);
      rwSpeechRef.current = speech;
      setSpeaking(true);
      setPaused(false);
      const played = await speech.done;
      if (requestId !== requestIdRef.current) return;
      setSpeaking(false);
      setPaused(false);
      if (!played) setNotice(t("Ijwi ry'Ikinyarwanda ntiriboneka ubu. Inyandiko iracyahari."));
      return;
    }

    if (!voice) {
      setNotice(t("Nta jwi rihuye n'ururimi wahisemo kuri iyi telefone. Ushobora gusoma inyandiko."));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onend = () => {
      if (requestId !== requestIdRef.current) return;
      setSpeaking(false);
      setPaused(false);
    };
    utterance.onerror = () => {
      if (requestId !== requestIdRef.current) return;
      setSpeaking(false);
      setPaused(false);
      setNotice(t("Ntibyashobotse gusoma amabwiriza mu ijwi. Inyandiko iracyahari."));
    };
    setSpeaking(true);
    setPaused(false);
    synthesis.speak(utterance);
  }

  useEffect(() => () => {
    requestIdRef.current += 1;
    rwSpeechRef.current?.stop();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const currentLabel = speaking
    ? t(paused ? "Komeza" : "Hagarika akanya")
    : t(label ?? "Soma amabwiriza");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void startOrToggle()}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#BFD6C8] bg-[#F4F9F5] px-3 py-2 text-xs font-bold text-[#174B37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
        aria-label={currentLabel}
        aria-pressed={speaking && !paused}
      >
        {speaking ? (
          paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden />
        )}
        <span>{currentLabel}</span>
      </button>
      {speaking && (
        <button
          type="button"
          onClick={stop}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#BFD6C8] bg-white px-3 py-2 text-xs font-bold text-[#174B37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3E0]"
        >
          <Square className="h-3.5 w-3.5" aria-hidden />
          {t("Hagarika gusoma")}
        </button>
      )}
      {notice && (
        <p role="status" aria-live="polite" className="w-full rounded-xl border border-[#c8dbcf] bg-[#f2f8f4] px-3 py-2 text-xs leading-relaxed text-[#294c37]">
          {notice}
        </p>
      )}
    </div>
  );
}
