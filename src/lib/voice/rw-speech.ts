// Our own Kinyarwanda voice, shared by Iwacu Agent and the Iwacu AI "read the answer" button.
// Order: stored phrase audio (public/voice/rw) -> our server route -> Pindo directly from the phone.
// It does not depend on any voice installed in the browser.

// Fixed Kinyarwanda phrases are recorded once and stored with the website (public/voice/rw): instant, offline-safe, no daily limit.
let phraseManifestPromise: Promise<Record<string, string>> | null = null;
export function loadPhraseManifest(): Promise<Record<string, string>> {
  if (!phraseManifestPromise) {
    phraseManifestPromise = fetch("/voice/rw/manifest.json", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() as Promise<Record<string, string>> : {}))
      .catch(() => ({}));
  }
  return phraseManifestPromise;
}

export async function fetchKinyarwandaAudioUrl(text: string): Promise<string | null> {
  const stored = (await loadPhraseManifest())[text.replace(/\s+/g, " ").trim()];
  if (stored) return stored;
  text = text.replace(/Iwacu Agent/gi, "Iwacu");
  try {
    const response = await fetch("/api/remote-agent/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ text }),
    });
    if (response.ok) {
      const payload = await response.json() as { audioUrl?: string };
      if (payload.audioUrl) return payload.audioUrl;
    }
  } catch { /* try the direct route below */ }
  // The proxy shares one server address and can hit the provider's daily limit; the phone's own address has its own allowance.
  try {
    const response = await fetch("https://api.pindo.io/ai/tts/rw/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: "rw", speech_rate: 1.05 }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { status?: string; data?: { generated_audio_url?: string } };
    const raw = payload.data?.generated_audio_url;
    if (payload.status !== "success" || !raw) return null;
    const url = new URL(raw, "https://api.pindo.io/");
    if (url.protocol !== "https:" || !(url.hostname.endsWith("pindo.io") || url.hostname === "pindo-ai-api-generated.s3.af-south-1.amazonaws.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

// A one-tap-unlocked audio element: phones only allow sound that starts from a tap, and answers arrive seconds later.
export const SILENT_WAV = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==";

export function makeSpeechChunks(text: string, maxLength: number): string[] {
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


export type RwSpeech = {
  /** Resolves true when everything was played, false when the voice could not be played. */
  done: Promise<boolean>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

let sharedAudio: HTMLAudioElement | null = null;

/** Call from a tap: phones only allow sound that starts from a tap. */
export function unlockRwAudio(): void {
  try {
    if (!sharedAudio) sharedAudio = new Audio();
    sharedAudio.src = SILENT_WAV;
    void sharedAudio.play().catch(() => undefined);
  } catch { /* sound is optional */ }
}

export function speakKinyarwanda(text: string): RwSpeech {
  const chunks = makeSpeechChunks(text, 200);
  const urls = chunks.map((part) => fetchKinyarwandaAudioUrl(part));
  let stopped = false;
  let finishCurrent: (() => void) | null = null;
  if (!sharedAudio) sharedAudio = new Audio();
  const audio = sharedAudio;

  const done = (async () => {
    for (let index = 0; index < chunks.length; index += 1) {
      if (stopped) return false;
      const url = await urls[index];
      if (stopped) return false;
      if (!url) return false;
      const played = await new Promise<boolean>((resolve) => {
        finishCurrent = () => resolve(true);
        audio.onended = () => resolve(true);
        audio.onerror = () => resolve(false);
        audio.src = url;
        audio.play().catch(() => resolve(false));
      });
      finishCurrent = null;
      if (!played) return false;
    }
    return !stopped;
  })();

  return {
    done,
    stop: () => {
      stopped = true;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      finishCurrent?.();
    },
    pause: () => audio.pause(),
    resume: () => { void audio.play().catch(() => undefined); },
  };
}
