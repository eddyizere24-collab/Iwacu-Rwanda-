import { describe, it, expect } from "vitest";
import { t, messages } from "@/lib/i18n";

describe("i18n", () => {
  it("returns Kinyarwanda for known keys", () => {
    expect(t("app.name")).toBeTruthy();
    expect(typeof t("app.name")).toBe("string");
  });

  it("falls back gracefully for unknown keys", () => {
    const key = "this.key.does.not.exist.ever";
    const out = t(key as never);
    expect(out).toBeTruthy();
  });

  it("exposes messages catalog", () => {
    expect(messages).toBeTruthy();
    expect(typeof messages).toBe("object");
  });
});
