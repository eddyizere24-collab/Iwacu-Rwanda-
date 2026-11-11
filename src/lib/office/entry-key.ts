import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** The entry key is digits only, 6 to 16 of them (the owner's rule: numbers, up to 16). */
export const ENTRY_KEY_PATTERN = /^[0-9]{6,16}$/;
export const ENTRY_LEVELS = ["district", "sector", "cell"] as const;
export type EntryLevel = (typeof ENTRY_LEVELS)[number];

export function hashEntryKey(key: string, salt = randomBytes(16).toString("hex")): { salt: string; hash: string } {
  return { salt, hash: scryptSync(key, salt, 32).toString("hex") };
}

/** Constant-time check of a typed key against a stored salted hash. */
export function entryKeyMatches(key: string, stored: { salt: string; hash: string } | null): boolean {
  // Always do the same work, so a place with no key set is not distinguishable by timing.
  const probe = hashEntryKey(key, stored?.salt ?? "0".repeat(32)).hash;
  if (!stored) return false;
  const a = Buffer.from(probe, "hex");
  const b = Buffer.from(stored.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
