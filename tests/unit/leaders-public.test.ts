import { describe, it, expect } from "vitest";
import { LEADER_PUBLIC_SELECT, hasVerifiedBoundary } from "@/lib/leaders/public";

describe("leaders public helpers", () => {
  it("exports a non-empty select string", () => {
    expect(typeof LEADER_PUBLIC_SELECT).toBe("string");
    expect(LEADER_PUBLIC_SELECT.length).toBeGreaterThan(10);
    expect(LEADER_PUBLIC_SELECT).toMatch(/id/);
  });

  it("hasVerifiedBoundary requires verified status", () => {
    expect(
      hasVerifiedBoundary({
        id: "1",
        scope_code: "x",
        first_name: "A",
        last_name: "B",
        role: "executive_secretary",
        email: null,
        photo_url: null,
        valid_from: "2020-01-01",
        valid_to: null,
        version: 1,
        boundaries: { name_kiny: "Test", name_eng: null, level: "sector", verification_status: "verified" },
      } as never)
    ).toBe(true);

    expect(
      hasVerifiedBoundary({
        id: "1",
        scope_code: "x",
        first_name: "A",
        last_name: "B",
        role: "executive_secretary",
        email: null,
        photo_url: null,
        valid_from: "2020-01-01",
        valid_to: null,
        version: 1,
        boundaries: { name_kiny: "Test", name_eng: null, level: "sector", verification_status: "pending" },
      } as never)
    ).toBe(false);
  });
});
