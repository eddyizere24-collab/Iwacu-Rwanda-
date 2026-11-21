// Pure helpers for continuous speech-to-text ("Vuga").
//
// Browsers report speech in very different shapes: desktop Chrome returns one
// result per phrase, Android Chrome often repeats the whole sentence as a
// longer and longer result, and a recognition session can end on its own after
// a pause. These helpers turn any of those shapes into one clean string so that
// nothing is lost, nothing is written twice, and a restart is invisible.

export type DictationLanguage = "rw" | "en" | "fr";

export const DICTATION_LANGUAGES: readonly DictationLanguage[] = ["rw", "en", "fr"];

export const DICTATION_LANG_TAGS: Record<DictationLanguage, string> = {
  rw: "rw-RW",
  en: "en-US",
  fr: "fr-FR",
};

export const DICTATION_LANGUAGE_NAMES: Record<DictationLanguage, string> = {
  rw: "Ikinyarwanda",
  en: "English",
  fr: "Français",
};

export function isDictationLanguage(value: unknown): value is DictationLanguage {
  return value === "rw" || value === "en" || value === "fr";
}

export type SpeechAlternativeLike = { transcript: string };
export type SpeechResultLike = ArrayLike<SpeechAlternativeLike> & { isFinal?: boolean };

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function comparable(text: string): string {
  return normalize(text).toLowerCase();
}

/**
 * Add one reported phrase to a list of phrases without duplicating it.
 * - A phrase that extends the previous one (cumulative reporting) replaces it.
 * - A phrase already contained in the previous one is dropped.
 * - Anything else is a new phrase.
 */
export function addPhrase(phrases: string[], incoming: string): string[] {
  const text = normalize(incoming);
  if (!text) return phrases;
  if (phrases.length === 0) return [text];
  const last = phrases[phrases.length - 1];
  const lastKey = comparable(last);
  const textKey = comparable(text);
  if (textKey === lastKey) return phrases.slice(0, -1).concat(text);
  if (textKey.startsWith(lastKey)) return phrases.slice(0, -1).concat(text);
  if (lastKey.startsWith(textKey)) return phrases;
  return phrases.concat(text);
}

/** Everything one recognition session has heard so far, as one string. */
export function sessionTranscript(results: ArrayLike<SpeechResultLike>): string {
  let phrases: string[] = [];
  for (let index = 0; index < results.length; index += 1) {
    phrases = addPhrase(phrases, results[index]?.[0]?.transcript ?? "");
  }
  return phrases.join(" ");
}

/** Join text pieces with exactly one space and no leading/trailing space. */
export function joinText(...pieces: string[]): string {
  return pieces.map(normalize).filter(Boolean).join(" ");
}

/**
 * Append a finished session to what earlier sessions already produced. A new
 * session normally starts from silence, but a restart right after a cut-off
 * can repeat the tail of the previous session; that tail is not written twice.
 */
export function appendSession(previous: string, session: string): string {
  const before = normalize(previous);
  const next = normalize(session);
  if (!next) return before;
  if (!before) return next;
  const beforeKey = comparable(before);
  const nextKey = comparable(next);
  if (beforeKey.endsWith(nextKey)) return before;
  if (nextKey.startsWith(beforeKey)) return next;
  return before + " " + next;
}

/** The text box content: what was typed before + earlier sessions + this session. */
export function composeDictation(base: string, previousSessions: string, currentSession: string, maxLength: number): string {
  const baseText = base.replace(/\s+$/g, "");
  const spoken = joinText(previousSessions, currentSession);
  if (!spoken) return baseText.slice(0, maxLength);
  return (baseText ? baseText + " " + spoken : spoken).slice(0, maxLength);
}

export type DictationEndDecision =
  | { action: "restart"; delayMs: number }
  | { action: "stop"; reason: "silence" | "unstable" };

export const DICTATION_SILENCE_LIMIT_MS = 60_000;
export const DICTATION_MAX_QUICK_FAILURES = 4;

/**
 * A session ended while the person still wants to dictate. Restart quietly,
 * unless nothing has been heard for a long time or the browser keeps failing
 * immediately (then stop instead of looping forever).
 */
export function decideAfterSessionEnd(input: {
  now: number;
  lastActivityAt: number;
  sessionStartedAt: number;
  quickFailures: number;
}): DictationEndDecision {
  if (input.now - input.lastActivityAt > DICTATION_SILENCE_LIMIT_MS) {
    return { action: "stop", reason: "silence" };
  }
  const sessionLength = input.now - input.sessionStartedAt;
  const failures = sessionLength < 1_000 ? input.quickFailures + 1 : 0;
  if (failures >= DICTATION_MAX_QUICK_FAILURES) {
    return { action: "stop", reason: "unstable" };
  }
  // Back off a little after instant failures so the phone is not hammered.
  return { action: "restart", delayMs: sessionLength < 1_000 ? 300 * (failures + 1) : 120 };
}

export function nextQuickFailureCount(input: { now: number; sessionStartedAt: number; quickFailures: number }): number {
  return input.now - input.sessionStartedAt < 1_000 ? input.quickFailures + 1 : 0;
}
