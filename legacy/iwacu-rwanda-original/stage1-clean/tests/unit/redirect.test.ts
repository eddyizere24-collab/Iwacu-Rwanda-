import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "@/lib/security/redirect";

describe("safeRedirectPath", () => {
  it("allows relative internal paths", () => {
    expect(safeRedirectPath("/admin/dashboard")).toBe("/admin/dashboard");
    expect(safeRedirectPath("/api/health")).toBe("/api/health");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  });

  it("defaults empty to /", () => {
    expect(safeRedirectPath("")).toBe("/");
    expect(safeRedirectPath(null as never)).toBe("/");
  });
});
