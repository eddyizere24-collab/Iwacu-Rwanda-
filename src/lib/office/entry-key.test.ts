import test from "node:test"; import assert from "node:assert/strict";
import { hashEntryKey, entryKeyMatches, ENTRY_KEY_PATTERN } from "./entry-key";
test("hash and match", () => {
  const s = hashEntryKey("1234567890123456");
  assert.ok(entryKeyMatches("1234567890123456", s));
  assert.ok(!entryKeyMatches("1234567890123457", s));
  assert.ok(!entryKeyMatches("1234567890123456", null));
  assert.notEqual(hashEntryKey("1234567890123456").hash, s.hash);
});
test("pattern", () => {
  assert.ok(ENTRY_KEY_PATTERN.test("123456")); assert.ok(ENTRY_KEY_PATTERN.test("1234567890123456"));
  assert.ok(!ENTRY_KEY_PATTERN.test("12345")); assert.ok(!ENTRY_KEY_PATTERN.test("12345678901234567")); assert.ok(!ENTRY_KEY_PATTERN.test("12a456"));
});
