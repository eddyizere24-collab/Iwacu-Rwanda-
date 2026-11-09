import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyTrustTier,
  isExternalResearchEnabled,
  redactPiiFromQuery,
  runExternalResearch,
  validateResearchUrl,
} from "./external-research";

describe("external-research security and defaults", () => {
  it("is disabled by default", () => {
    assert.equal(isExternalResearchEnabled({}), false);
    assert.equal(isExternalResearchEnabled({ IWACU_EXTERNAL_RESEARCH_ENABLED: "true" }), true);
  });

  it("rejects non-HTTPS and blocked hosts", () => {
    assert.equal(validateResearchUrl("http://example.com").ok, false);
    assert.equal(validateResearchUrl("https://localhost/admin").ok, false);
    assert.equal(validateResearchUrl("https://127.0.0.1/").ok, false);
    assert.equal(validateResearchUrl("https://169.254.169.254/latest").ok, false);
    assert.equal(validateResearchUrl("https://user:pass@example.com/").ok, false);
    assert.equal(validateResearchUrl("https://192.168.1.1/").ok, false);
    const ok = validateResearchUrl("https://www.gov.rw/emergency");
    assert.equal(ok.ok, true);
  });

  it("classifies trust tiers without over-claiming", () => {
    assert.equal(classifyTrustTier("www.gov.rw"), "official_government");
    assert.equal(classifyTrustTier("who.int"), "intergovernmental_academic");
    assert.equal(classifyTrustTier("random-blog.example"), "other");
  });

  it("redacts email, phone and coordinate-like pairs from queries", () => {
    const redacted = redactPiiFromQuery("Gasabo mayor contact me at test@example.com or +250788123456 near -1.95, 30.06");
    assert.equal(/@/.test(redacted), false);
    assert.equal(/250788/.test(redacted), false);
    assert.match(redacted, /Gasabo/i);
  });

  it("returns disabled status without inventing sources", async () => {
    const result = await runExternalResearch("amakuru ya Gasabo", {});
    assert.equal(result.status, "disabled");
    assert.equal(result.sources.length, 0);
    assert.match(result.message_kiny, /Ntabwo nzahimba/i);
  });

  it("does not invent sources when enabled but provider not wired", async () => {
    const result = await runExternalResearch("Gasabo district sectors", {
      IWACU_EXTERNAL_RESEARCH_ENABLED: "true",
      IWACU_EXTERNAL_RESEARCH_PROVIDER: "tavily",
    });
    assert.equal(result.status, "unavailable");
    assert.equal(result.sources.length, 0);
    assert.equal(result.provider_name, "tavily");
  });
});
