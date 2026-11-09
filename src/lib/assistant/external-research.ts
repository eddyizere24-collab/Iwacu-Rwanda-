/**
 * External research adapter for Ishakiro (Part 2).
 *
 * DISABLED BY DEFAULT. Does not call any network provider until the owner
 * sets IWACU_EXTERNAL_RESEARCH_ENABLED=true after reviewing the provider
 * contract and storing the API key in a server-side secret store.
 *
 * Rules (handoff §4.4):
 * - HTTPS only; validate domains; block SSRF vectors
 * - Never send user coordinates, phone, email, or name to the provider
 * - Provider summaries are untrusted data, not verified facts
 * - Always attach source metadata (title, domain, URL, dates)
 * - Trust tiers: official > intergovernmental/academic > reputable > other
 */

export type ResearchTrustTier =
  | "official_government"
  | "intergovernmental_academic"
  | "reputable_publisher"
  | "other";

export interface ResearchSource {
  title: string;
  publisher_or_domain: string;
  url: string;
  published_date: string | null;
  accessed_at: string;
  trust_tier: ResearchTrustTier;
  snippet: string;
}

export type ResearchStatus = "ok" | "disabled" | "unavailable" | "no_results" | "error";

export interface ResearchResult {
  status: ResearchStatus;
  sources: ResearchSource[];
  message_kiny: string;
  provider_name: string | null;
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
]);

const OFFICIAL_DOMAIN_SUFFIXES = [
  ".gov.rw",
  "gov.rw",
  "rra.gov.rw",
  "mineduc.gov.rw",
  "minaloc.gov.rw",
  "minisante.gov.rw",
  "police.gov.rw",
  "parliament.gov.rw",
  "primature.gov.rw",
];

const INTERGOVERNMENTAL_SUFFIXES = [
  "who.int",
  "un.org",
  "unicef.org",
  "worldbank.org",
  "imf.org",
  "africa.undp.org",
  "unesco.org",
];

export function isExternalResearchEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.IWACU_EXTERNAL_RESEARCH_ENABLED === "true";
}

export function classifyTrustTier(hostname: string): ResearchTrustTier {
  const host = hostname.toLowerCase();
  if (OFFICIAL_DOMAIN_SUFFIXES.some((d) => host === d || host.endsWith("." + d) || host.endsWith(d))) {
    return "official_government";
  }
  if (INTERGOVERNMENTAL_SUFFIXES.some((d) => host === d || host.endsWith("." + d))) {
    return "intergovernmental_academic";
  }
  if (host.endsWith(".edu") || host.endsWith(".ac.rw")) {
    return "intergovernmental_academic";
  }
  return "other";
}

/**
 * Validates a candidate URL for outbound research.
 * Rejects non-HTTPS, credentials-in-URL, blocked hosts, and non-default ports.
 */
export function validateResearchUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "https_required" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "credentials_forbidden" };
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "blocked_host" };
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) {
    return { ok: false, reason: "private_ip" };
  }
  if (parsed.port && parsed.port !== "443") {
    return { ok: false, reason: "non_https_port" };
  }
  return { ok: true, url: parsed };
}

/** Strip obvious PII patterns before any outbound search query. */
export function redactPiiFromQuery(query: string): string {
  return query
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/(?<!\w)\+?\d[\d\s().-]{6,}\d(?!\w)/g, " ")
    .replace(/\b\d{1,3}(\.\d+)?,\s*\d{1,3}(\.\d+)?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/**
 * Perform external research. Returns disabled status unless owner enabled the feature.
 * Provider integration (e.g. Tavily) is intentionally not hard-wired until the
 * live API contract is reviewed and secrets are configured server-side.
 */
export async function runExternalResearch(
  rawQuery: string,
  env: Record<string, string | undefined> = process.env,
): Promise<ResearchResult> {
  if (!isExternalResearchEnabled(env)) {
    return {
      status: "disabled",
      sources: [],
      provider_name: null,
      message_kiny:
        "Ubushakashatsi bwo hanze ntabwo buzakoreshwa ubu. Busaba icyemezo cy'umuyobozi n'ibisobanuro by'API byagenzuwe. Ntabwo nzahimba amakuru.",
    };
  }

  const q = redactPiiFromQuery(rawQuery);
  if (q.length < 3) {
    return {
      status: "no_results",
      sources: [],
      provider_name: null,
      message_kiny: "Ikibazo cyari gito cyane cyangwa cyari gifite amakuru yihariye yakuweho. Ongera wandike ikibazo rusange.",
    };
  }

  const provider = env.IWACU_EXTERNAL_RESEARCH_PROVIDER?.trim().toLowerCase();
  if (!provider) {
    return {
      status: "unavailable",
      sources: [],
      provider_name: null,
      message_kiny:
        "Ubushakashatsi bwo hanze bwemewe ariko nta provider yatoranyijwe. Nta makuru yavuye hanze nshobora kugaragaza.",
    };
  }

  // Explicitly do not invent results. Real HTTP integration lands after contract check.
  return {
    status: "unavailable",
    sources: [],
    provider_name: provider,
    message_kiny:
      "Provider y'ubushakashatsi yatoranyijwe ariko ntabwo ihujwe n'API contract yagenzuwe muri iki gice. Ntabwo nzahimba amasoko.",
  };
}
