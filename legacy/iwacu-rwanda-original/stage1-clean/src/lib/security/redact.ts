/**
 * Strip obvious personal data from free text BEFORE it is sent to any third-party model.
 */
export function redactPii(input: string): string {
  return input
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/\+?\d(?:[\s().-]?\d){6,}/g, "[number]")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escape a user string for use inside an ILIKE pattern so it matches literally (no % or _ wildcards). */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
