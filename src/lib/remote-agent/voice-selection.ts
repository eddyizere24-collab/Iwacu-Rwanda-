// Chooses the phone's speech-synthesis voice for the voice agent.
//
// Phones rarely label a voice as male or female. The agent therefore:
// 1. uses a voice of the right language whose name says it is the requested gender;
// 2. otherwise uses any voice of that language (never the opposite labelled gender) and shifts
//    the pitch so the two choices still sound clearly different;
// 3. only stays silent when the phone has no voice at all for that language.

export type VoiceGender = "male" | "female";

export type VoiceLike = {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
};

export type VoicePick<T extends VoiceLike> = {
  voice: T | null;
  /** Utterance pitch to use: 1 when the voice itself matches the requested gender. */
  pitch: number;
  /** True when the voice's own name says it is the requested gender. */
  genderMatched: boolean;
};

export const MALE_PITCH = 0.78;
export const FEMALE_PITCH = 1.18;

const MALE_NAME = /(^|[^a-z])(male|masculine|masculin|homme|hombre|man)([^a-z]|$)/i;
const FEMALE_NAME = /(^|[^a-z])(female|feminine|feminin|féminin|femme|woman|mujer)([^a-z]|$)/i;

function matchesLanguage(voice: VoiceLike, prefixes: readonly string[]): boolean {
  const lang = voice.lang.toLowerCase().replace(/_/g, "-");
  return prefixes.some((prefix) => lang.startsWith(prefix.toLowerCase().replace(/_/g, "-")));
}

export function pickVoice<T extends VoiceLike>(
  voices: readonly T[],
  prefixes: readonly string[],
  gender: VoiceGender,
): VoicePick<T> {
  const candidates = voices.filter((voice) => matchesLanguage(voice, prefixes));
  const wanted = gender === "male" ? MALE_NAME : FEMALE_NAME;
  const opposite = gender === "male" ? FEMALE_NAME : MALE_NAME;
  const pitch = gender === "male" ? MALE_PITCH : FEMALE_PITCH;

  const exact = candidates.find((voice) => wanted.test(voice.name));
  if (exact) return { voice: exact, pitch: 1, genderMatched: true };

  const neutral = candidates.filter((voice) => !opposite.test(voice.name));
  const pool = neutral.length > 0 ? neutral : [];
  if (pool.length === 0) return { voice: null, pitch, genderMatched: false };

  const best = pool.find((voice) => voice.localService && voice.default)
    ?? pool.find((voice) => voice.default)
    ?? pool.find((voice) => voice.localService)
    ?? pool[0];
  return { voice: best, pitch, genderMatched: false };
}
