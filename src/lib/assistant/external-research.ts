/**
 * Server-only Tavily research adapter.
 *
 * External research is disabled by default. When explicitly enabled, only the
 * redacted query is sent to Tavily. Provider answers/raw content are disabled;
 * IWACU uses individually validated source snippets and displays their trust tier.
 */

import { isIP } from "node:net";

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

type TavilyResultItem = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  published_date?: unknown;
};

type FetchLike = typeof fetch;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.",
  "metadata.google.internal",
  "metadata",
]);

const OFFICIAL_DOMAINS = [
  "gov.rw",
  "rra.gov.rw",
  "mineduc.gov.rw",
  "minaloc.gov.rw",
  "minisante.gov.rw",
  "police.gov.rw",
  "parliament.gov.rw",
  "primature.gov.rw",
];

const INTERGOVERNMENTAL_DOMAINS = [
  "who.int",
  "un.org",
  "unicef.org",
  "worldbank.org",
  "imf.org",
  "undp.org",
  "unesco.org",
  "afdb.org",
  "eac.int",
];

const REPUTABLE_PUBLISHERS = [
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "dw.com",
  "africanews.com",
];

const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX_ENTRIES = 100;
const researchCache = new Map<string, { expiresAt: number; result: ResearchResult }>();

function isDomainOrSubdomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain);
}

export function isExternalResearchEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.IWACU_EXTERNAL_RESEARCH_ENABLED === "true";
}

export function classifyTrustTier(hostname: string): ResearchTrustTier {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (OFFICIAL_DOMAINS.some((domain) => isDomainOrSubdomain(host, domain))) {
    return "official_government";
  }
  if (INTERGOVERNMENTAL_DOMAINS.some((domain) => isDomainOrSubdomain(host, domain)) ||
      host.endsWith(".edu") || host.endsWith(".ac.rw")) {
    return "intergovernmental_academic";
  }
  if (REPUTABLE_PUBLISHERS.some((domain) => isDomainOrSubdomain(host, domain))) {
    return "reputable_publisher";
  }
  return "other";
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test")) {
    return true;
  }

  // Do not expose private/special IP literals as clickable research sources.
  // The adapter never fetches result URLs itself, but rejecting them prevents
  // unsafe links from being presented as trusted sources.
  const ipLiteral = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (isIP(ipLiteral) !== 0) return true;

  return false;
}

/** URL validation for provider-returned links; no user-supplied URL is fetched. */
export function validateResearchUrl(
  rawUrl: string,
): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "https_required" };
  if (parsed.username || parsed.password) return { ok: false, reason: "credentials_forbidden" };
  if (parsed.port && parsed.port !== "443") return { ok: false, reason: "non_https_port" };
  if (isBlockedHostname(parsed.hostname)) return { ok: false, reason: "blocked_host" };
  return { ok: true, url: parsed };
}

/** Removes obvious direct identifiers and coordinate pairs before outbound search. */
export function redactPiiFromQuery(query: string): string {
  return query
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/(?<!\w)\+?\d[\d\s().-]{6,}\d(?!\w)/g, " ")
    .replace(/(?<!\d)-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}(?!\d)/g, " ")
    .replace(/\b(?:my name is|je m'appelle|nitwa|nitwa neza|ndashaka amakuru kuri njye)\s+[\p{L}'-]+(?:\s+[\p{L}'-]+){0,2}/giu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function parsePublishedDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function cacheKey(query: string): string {
  return query.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function readCache(key: string): ResearchResult | null {
  const value = researchCache.get(key);
  if (!value) return null;
  if (value.expiresAt <= Date.now()) {
    researchCache.delete(key);
    return null;
  }
  return value.result;
}

function writeCache(key: string, result: ResearchResult): void {
  for (const [existingKey, entry] of researchCache) {
    if (entry.expiresAt <= Date.now()) researchCache.delete(existingKey);
  }
  while (researchCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = researchCache.keys().next().value as string | undefined;
    if (!oldest) break;
    researchCache.delete(oldest);
  }
  researchCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
}

function unavailable(message: string, provider: string | null = null): ResearchResult {
  return { status: "unavailable", sources: [], provider_name: provider, message_kiny: message };
}

/**
 * Perform a real Tavily search only when the owner enabled it and supplied a
 * server-side key. Fetch is injectable for deterministic tests.
 */
export async function runExternalResearch(
  rawQuery: string,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<ResearchResult> {
  if (!isExternalResearchEnabled(env)) {
    return {
      status: "disabled",
      sources: [],
      provider_name: null,
      message_kiny: "Ubushakashatsi bwo hanze ntabwo bwemewe ubu. Nta makuru yo kuri internet nzahimba.",
    };
  }

  const query = redactPiiFromQuery(rawQuery);
  if (query.length < 3) {
    return {
      status: "no_results",
      sources: [],
      provider_name: null,
      message_kiny: "Ikibazo ni kigufi cyane cyangwa amakuru yihariye yakuweho. Andika icyo ushaka gushakisha muri rusange.",
    };
  }

  const provider = env.IWACU_EXTERNAL_RESEARCH_PROVIDER?.trim().toLowerCase();
  if (provider !== "tavily") {
    return unavailable("Nta provider y'ubushakashatsi yatoranyijwe cyangwa yemewe. Nta masoko nshobora kwemeza.", provider || null);
  }

  const apiKey = env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return unavailable("Provider yatoranyijwe ariko API key yo kuri server ntiyashyizweho. Nta bushakashatsi bwakozwe.", "tavily");
  }

  const key = cacheKey(query);
  const cached = readCache(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetchImpl("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        topic: "general",
        search_depth: "basic",
        max_results: 5,
        country: "rwanda",
        include_answer: false,
        include_raw_content: false,
        include_images: false,
        include_usage: false,
      }),
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });

    if (!response.ok) {
      return unavailable(
        response.status === 401
          ? "Urufunguzo rwa search provider ntirwemewe."
          : response.status === 429
            ? "Search provider yasabye kugabanya umuvuduko w'ibibazo. Ongera ugerageze nyuma."
            : "Search provider ntiyashoboye kugarura amakuru ubu.",
        "tavily",
      );
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return unavailable("Igisubizo cya search provider nticyumvikanye.", "tavily");
    const rows = (payload as { results?: unknown }).results;
    if (!Array.isArray(rows)) return unavailable("Search provider ntiyagaruye urutonde rw'amasoko rwemewe.", "tavily");

    const accessedAt = new Date().toISOString();
    const sources: ResearchSource[] = [];
    for (const item of rows.slice(0, 5)) {
      if (!item || typeof item !== "object") continue;
      const row = item as TavilyResultItem;
      const title = cleanText(row.title, 180);
      const snippet = cleanText(row.content, 600);
      if (!title || !snippet || typeof row.url !== "string") continue;
      const validation = validateResearchUrl(row.url);
      if (!validation.ok) continue;
      const host = validation.url.hostname.toLowerCase().replace(/\.$/, "");
      sources.push({
        title,
        publisher_or_domain: host,
        url: validation.url.toString(),
        published_date: parsePublishedDate(row.published_date),
        accessed_at: accessedAt,
        trust_tier: classifyTrustTier(host),
        snippet,
      });
    }

    const result: ResearchResult = sources.length
      ? {
          status: "ok",
          sources,
          provider_name: "tavily",
          message_kiny: "Nabonye amasoko yo hanze. Reba incamake n'aho yaturutse; ibisubizo bya search ntabwo bihita byemerwa nk'ukuri kwemejwe.",
        }
      : {
          status: "no_results",
          sources: [],
          provider_name: "tavily",
          message_kiny: "Nta masoko yizewe kandi afite HTTPS yabonetse kuri iki kibazo. Ntabwo nzahimba ibisubizo.",
        };

    if (result.status === "ok") writeCache(key, result);
    return result;
  } catch {
    return unavailable(
      "Ntibyashobotse kuvugana na search provider ubu. Nta makuru cyangwa isoko byahimbwe.",
      "tavily",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Used by unit tests only; production code has no cache-clear route. */
export function clearExternalResearchCacheForTests(): void {
  researchCache.clear();
}
