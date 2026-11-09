import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyTrustTier, clearExternalResearchCacheForTests, isExternalResearchEnabled,
  redactPiiFromQuery, runExternalResearch, validateResearchUrl,
} from "./external-research";

const enabledEnv = {
  IWACU_EXTERNAL_RESEARCH_ENABLED: "true",
  IWACU_EXTERNAL_RESEARCH_PROVIDER: "tavily",
  TAVILY_API_KEY: "unit-test-secret-not-real",
};

describe("external-research security and defaults", () => {
  it("is disabled unless the explicit feature switch is true", () => {
    assert.equal(isExternalResearchEnabled({}), false);
    assert.equal(isExternalResearchEnabled({ IWACU_EXTERNAL_RESEARCH_ENABLED: "false" }), false);
    assert.equal(isExternalResearchEnabled({ IWACU_EXTERNAL_RESEARCH_ENABLED: "true" }), true);
  });
  it("requires HTTPS, rejects credentials, unusual ports and local/private hosts", () => {
    for (const url of [
      "http://example.com", "https://localhost/admin", "https://sub.localhost/admin",
      "https://host.local/", "https://host.internal/", "https://127.0.0.1/", "https://127.1/",
      "https://169.254.169.254/latest", "https://192.168.1.1/", "https://10.0.0.2/",
      "https://172.16.0.2/", "https://[::1]/", "https://user:pass@example.com/",
      "https://example.com:8443/",
    ]) assert.equal(validateResearchUrl(url).ok, false, "should reject " + url);
    assert.equal(validateResearchUrl("https://www.gov.rw/emergency").ok, true);
    assert.equal(validateResearchUrl("https://example.org:443/path").ok, true);
  });
  it("uses exact domain boundaries for trust classification", () => {
    assert.equal(classifyTrustTier("gov.rw"), "official_government");
    assert.equal(classifyTrustTier("www.gov.rw"), "official_government");
    assert.equal(classifyTrustTier("rra.gov.rw"), "official_government");
    assert.equal(classifyTrustTier("evilgov.rw"), "other");
    assert.equal(classifyTrustTier("gov.rw.attacker.example"), "other");
    assert.equal(classifyTrustTier("who.int"), "intergovernmental_academic");
    assert.equal(classifyTrustTier("news.reuters.com"), "reputable_publisher");
    assert.equal(classifyTrustTier("random-blog.example"), "other");
  });
  it("redacts email, phone, coordinate pairs and explicit self-identification", () => {
    const redacted = redactPiiFromQuery("Gasabo mayor contact test@example.com +250788123456 at -1.9501, 30.0602; my name is Izere Eddy");
    assert.equal(/@/.test(redacted), false);
    assert.equal(/250788/.test(redacted), false);
    assert.equal(/-1\.9501/.test(redacted), false);
    assert.equal(/Izere Eddy/i.test(redacted), false);
    assert.match(redacted, /Gasabo/i);
  });
  it("does not call any provider when research is disabled", async () => {
    let called = false;
    const fakeFetch: typeof fetch = async () => { called = true; return new Response(JSON.stringify({ results: [] }), { status: 200 }); };
    const result = await runExternalResearch("amakuru kuri Gasabo", {}, fakeFetch);
    assert.equal(called, false);
    assert.equal(result.status, "disabled");
    assert.equal(result.sources.length, 0);
  });
  it("does not call provider when the server key is absent", async () => {
    let called = false;
    const fakeFetch: typeof fetch = async () => { called = true; return new Response(JSON.stringify({ results: [] }), { status: 200 }); };
    const result = await runExternalResearch("Gasabo district sectors", {
      IWACU_EXTERNAL_RESEARCH_ENABLED: "true", IWACU_EXTERNAL_RESEARCH_PROVIDER: "tavily",
    }, fakeFetch);
    assert.equal(called, false);
    assert.equal(result.status, "unavailable");
    assert.equal(result.provider_name, "tavily");
  });
  it("uses the reviewed Tavily HTTP contract and validates returned source metadata", async () => {
    clearExternalResearchCacheForTests();
    let requestedUrl = "";
    let requestInit: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (input, init) => {
      requestedUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ results: [{
        title: "Official Rwanda notice", url: "https://www.gov.rw/news",
        content: "<b>Government notice</b> with public information.", published_date: "2026-11-05",
      }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const result = await runExternalResearch("Gasabo policy contact test@example.com +250788123456", enabledEnv, fakeFetch);
    assert.equal(requestedUrl, "https://api.tavily.com/search");
    assert.equal(requestInit?.method, "POST");
    const headers = new Headers(requestInit?.headers);
    assert.equal(headers.get("authorization"), "Bearer " + enabledEnv.TAVILY_API_KEY);
    const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;
    assert.equal(body.query, "Gasabo policy contact");
    assert.equal(body.include_answer, false);
    assert.equal(body.include_raw_content, false);
    assert.equal(body.include_images, false);
    assert.equal(result.status, "ok");
    assert.equal(result.provider_name, "tavily");
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].trust_tier, "official_government");
    assert.equal(result.sources[0].published_date, "2026-11-05");
    assert.match(result.sources[0].snippet, /Government notice/);
    assert.equal(result.sources[0].snippet.includes("<b>"), false);
  });
  it("never exposes provider error bodies or raw provider answers", async () => {
    clearExternalResearchCacheForTests();
    const fakeFetch: typeof fetch = async () => new Response(
      JSON.stringify({ error: "private provider detail", answer: "unverified answer" }), { status: 429 },
    );
    const result = await runExternalResearch("Rwanda public policy search", enabledEnv, fakeFetch);
    assert.equal(result.status, "unavailable");
    assert.equal(result.sources.length, 0);
    assert.equal(result.message_kiny.includes("private provider detail"), false);
    assert.equal(result.message_kiny.includes("unverified answer"), false);
  });
  it("does not return invalid or non-HTTPS sources", async () => {
    clearExternalResearchCacheForTests();
    const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ results: [
      { title: "Local", url: "https://127.0.0.1/private", content: "private" },
      { title: "Plain HTTP", url: "http://example.com", content: "unsafe" },
      { title: "Good source", url: "https://www.gov.rw/info", content: "public data" },
    ] }), { status: 200 });
    const result = await runExternalResearch("Rwanda public policy sources", enabledEnv, fakeFetch);
    assert.equal(result.status, "ok");
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].url, "https://www.gov.rw/info");
  });
});
