import test from "node:test";
import assert from "node:assert/strict";
import { VERIFIED_EMERGENCY_NUMBERS } from "./rwanda-geo";

const expectedCategories: Record<string, string> = {
  "112": "police",
  "111": "fire",
  "912": "medical",
  "113": "traffic",
  "114": "medical",
  "116": "protection",
  "3512": "protection",
  "3511": "police",
  "110": "police",
  "997": "police",
  "118": "traffic",
};

test("national emergency directory contains unique, sourced helplines", () => {
  const numbers = VERIFIED_EMERGENCY_NUMBERS.map((item) => item.number);
  assert.equal(new Set(numbers).size, numbers.length, "emergency numbers must be unique");
  assert.deepEqual(new Set(numbers), new Set(Object.keys(expectedCategories)));
  for (const contact of VERIFIED_EMERGENCY_NUMBERS) {
    assert.equal(contact.category, expectedCategories[contact.number], contact.number + " category");
    assert.equal(contact.is_verified, true, contact.number + " verification");
    assert.match(contact.source_url, /^https:\/\//, contact.number + " source URL");
    assert.equal(contact.last_verified, "2026-11-12", contact.number + " verification date");
    assert.ok(contact.name_kiny.trim().length > 4, contact.number + " Kinyarwanda label");
    assert.ok(contact.name_eng.trim().length > 4, contact.number + " English label");
  }
});

test("critical Rwanda emergency hotlines retain the correct public-service labels", () => {
  const byNumber = new Map(VERIFIED_EMERGENCY_NUMBERS.map((item) => [item.number, item]));
  assert.match(byNumber.get("112")!.name_eng, /general emergency/i);
  assert.match(byNumber.get("111")!.name_eng, /fire and rescue/i);
  assert.match(byNumber.get("113")!.name_eng, /traffic accidents/i);
  assert.match(byNumber.get("114")!.name_eng, /health services/i);
  assert.match(byNumber.get("912")!.name_eng, /ambulance/i);
  assert.match(byNumber.get("3512")!.name_eng, /gender-based violence/i);
  assert.match(byNumber.get("3511")!.name_eng, /abuse by police officer/i);
});
