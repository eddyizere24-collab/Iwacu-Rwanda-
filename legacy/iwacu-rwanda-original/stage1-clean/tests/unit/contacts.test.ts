import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  formatPhoneDisplay,
  displayContactValue,
  buildContactLink,
  maskPhone,
  sanitizeContactInput,
} from "@/lib/contacts";

describe("contacts", () => {
  it("normalizePhone accepts Rwanda mobile", () => {
    expect(normalizePhone("0788123456")).toBe("+250788123456");
    expect(normalizePhone("+250788123456")).toBe("+250788123456");
    expect(normalizePhone("250788123456")).toBe("+250788123456");
  });

  it("normalizePhone rejects garbage", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("formatPhoneDisplay formats +250", () => {
    const d = formatPhoneDisplay("+250788123456");
    expect(d).toMatch(/0\d{2}/);
  });

  it("displayContactValue formats phones", () => {
    expect(displayContactValue("phone", "+250788123456")).toBeTruthy();
    expect(displayContactValue("email", "a@b.com")).toBe("a@b.com");
  });

  it("buildContactLink builds tel and mailto", () => {
    expect(buildContactLink({ link_template: "tel:{value}" }, "+250788123456")).toContain("tel:");
    expect(buildContactLink({ link_template: null }, "a@b.com")).toContain("mailto:");
  });

  it("maskPhone hides middle digits", () => {
    const m = maskPhone("+250788123456");
    expect(m.length).toBeGreaterThan(4);
    expect(m).toMatch(/•/);
  });

  it("sanitizeContactInput normalizes phone", () => {
    const s = sanitizeContactInput({ kind: "phone", value: "0788123456", is_primary: true });
    expect(s?.value).toBe("+250788123456");
    expect(s?.kind).toBe("phone");
  });
});
