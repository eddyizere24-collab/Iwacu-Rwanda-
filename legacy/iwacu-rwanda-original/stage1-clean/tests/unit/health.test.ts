import { describe, it, expect } from "vitest";
import { checkEnv, summarize } from "@/lib/health";

describe("health helpers", () => {
  it("marks missing env as missing", () => {
    const checks = checkEnv({});
    expect(checks["env:NEXT_PUBLIC_SUPABASE_URL"]).toBe("missing");
  });

  it("marks present env as ok", () => {
    const checks = checkEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
    });
    expect(checks["env:NEXT_PUBLIC_SUPABASE_URL"]).toBe("ok");
    expect(checks["env:SUPABASE_SERVICE_ROLE_KEY"]).toBe("ok");
  });

  it("summarize returns degraded when any missing", () => {
    const report = summarize({
      "env:NEXT_PUBLIC_SUPABASE_URL": "missing",
      database: "missing",
    });
    expect(report.status).toBe("degraded");
    expect(report.checks).toBeTruthy();
  });

  it("summarize returns ok when all ok", () => {
    const report = summarize({
      "env:NEXT_PUBLIC_SUPABASE_URL": "ok",
      database: "ok",
    });
    expect(report.status).toBe("ok");
  });
});
