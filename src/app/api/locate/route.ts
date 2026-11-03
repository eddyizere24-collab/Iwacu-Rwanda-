/**
 * POST /api/locate
 *
 * Geospatial Confidence Algorithm (PostGIS).
 * Input : { latitude, longitude, accuracy }
 * Output: LocateSuccess | LocateError (all 15 error states handled)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";
import { createLocateError } from "@/lib/utils/errors";
import { rankVillageCandidates } from "@/lib/location-ranking";
import { aggregateLocationHierarchy } from "@/lib/location-hierarchy";
import { createRwandaProvincePrior } from "@/lib/location-prior";
import { nearestVillageEstimateFromIndex } from "@/lib/representative-location";
import { capBorderZoneHierarchyAtSector, classifyThenContinue, isBorderZoneCandidate } from "@/lib/classifier-flow";
import { backoffLocation, CALIBRATION_VERSION, type BackoffVillageInput } from "@/lib/backoff";
import offlineLocationIndex from "../../../../public/offline/location-index.json";
import type { ConfidenceMatch } from "@/types/boundary";
import type { LocateResponse, LocateSuccess } from "@/types/location";
import {
  buildLocateCacheKey, callRpcWithTimeout, createInMemoryCache,
  createIpRateLimiter, getAccuracyBucket, getClientIpFromHeaders, getLocateConfidenceRpcName,
} from "@/lib/locate-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLASSIFIER_RPC = "classify_rwanda_coordinate_v2";
const LOCATE_CONFIDENCE_RPC = getLocateConfidenceRpcName(process.env.LOCATE_CONFIDENCE_RPC);
const DATASET_VERSION = process.env.RWANDA_BOUNDARY_DATASET_VERSION || "nisr-2022-db-v1";
const CENTER_POINT_PRIMARY_BUCKETS = new Set([10]);
const CENTER_POINT_QUERY_BUCKETS = new Set([25, 50, 100]);

const LocateBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  // Zero is valid for an exact/no-noise test point; large radii widen uncertainty.
  // CHANGED 2026-11-01 CLAUDE-PATCH: upper bound stops absurd radii reaching the database; see docs/HANDOFF.md
  accuracy: z.number().finite().nonnegative().max(100_000),
  method: z.enum(["gps", "map", "network", "ip"]).optional().default("gps"),
});

const locateResponseCache = createInMemoryCache<LocateResponse>({ ttlMs: 10 * 60 * 1000, maxEntries: 2_000 });
const ipRateLimiter = createIpRateLimiter({ limit: 30, windowMs: 60_000 });
type CoordinateCacheInfo = { key: string; latitude: number; longitude: number; accuracy: number; method: "gps" | "map" | "network" | "ip" };
function getClientIp(req: NextRequest): string { return getClientIpFromHeaders(req.headers); }
function consumeLocateRateLimit(req: NextRequest): boolean { return ipRateLimiter.consume(getClientIp(req)); }
async function getCoordinateCacheInfo(req: Request): Promise<CoordinateCacheInfo | null> {
  try {
    const body: unknown = await req.json();
    let latitude: number, longitude: number, accuracy: number, method: CoordinateCacheInfo["method"];
    if (body && typeof body === "object" && (body as { mode?: unknown }).mode === "ip") {
      latitude = Number(req.headers.get("x-vercel-ip-latitude")); longitude = Number(req.headers.get("x-vercel-ip-longitude"));
      accuracy = 50_000; method = "ip";
      const inside = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -3.2 && latitude <= -0.7 && longitude >= 28.5 && longitude <= 31.2;
      if (!inside) return null;
    } else {
      const parsed = LocateBodySchema.safeParse(body);
      if (!parsed.success) return null;
      latitude = parsed.data.latitude; longitude = parsed.data.longitude; accuracy = parsed.data.accuracy; method = parsed.data.method;
    }
    return { key: buildLocateCacheKey({ latitude, longitude, accuracy, method }), latitude, longitude, accuracy: getAccuracyBucket(accuracy), method };
  } catch { return null; }
}

interface ClassifierRow {
  is_inside_rwanda: boolean;
  distance_to_border_m: number | null;
}

interface RpcRow {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: string;
  confidence: number;
  intersection_area_m2: number;
  path: string;
  no_village_mass?: number | string | null;
  sample_count?: number | null;
}

async function handleLocatePost(
  req: NextRequest
): Promise<NextResponse<LocateResponse>> {
  let classifierUnavailable = false;
  let classifierErrorCode: string | null = null;
  let coordinateClassification: {
    is_inside_rwanda: boolean;
    distance_to_border_m: number | null;
  } | null = null;
  let borderZone = false;
  let centerPointVillage: RpcRow | null = null;
  let fallbackCoordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    method: "gps" | "map" | "network" | "ip";
  } | null = null;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        createLocateError("NETWORK_ERROR", { reason: "invalid_json" }),
        { status: 400 }
      );
    }

    if (body && typeof body === "object" && (body as { mode?: unknown }).mode === "ip") {
      const country = req.headers.get("x-vercel-ip-country");
      const ipLatitude = Number(req.headers.get("x-vercel-ip-latitude"));
      const ipLongitude = Number(req.headers.get("x-vercel-ip-longitude"));
      // Mobile-carrier IP gateways can geolocate outside Rwanda even when
      // the phone is physically in Rwanda. Prefer valid Rwanda coordinates;
      // never turn an IP-country mismatch into a dead-end error.
      const ipCoordinatesInRwanda =
        Number.isFinite(ipLatitude) && Number.isFinite(ipLongitude) &&
        ipLatitude >= -3.2 && ipLatitude <= -0.7 &&
        ipLongitude >= 28.5 && ipLongitude <= 31.2;
      if (ipCoordinatesInRwanda) {
        // Vercel IP coordinates are a coarse network hint, not device GPS.
        // Use the largest supported uncertainty radius and label the source.
        body = { latitude: ipLatitude, longitude: ipLongitude, accuracy: 50_000, method: "ip" };
      } else {
        return respondWithCountryOnlyPrior(country === "RW");
      }
    }

    if (body && typeof body === "object" && (body as { mode?: unknown }).mode === "manual") {
      const scopeCode = (body as { scope_code?: unknown }).scope_code;
      if (typeof scopeCode !== "string" || !/^RW(?:-[0-9A-Z]+)*$/.test(scopeCode)) {
        return NextResponse.json(createLocateError("NOT_FOUND"), { status: 400 });
      }
      if (!isSupabasePublicConfigured()) {
        return respondWithStaticManualSelection(scopeCode);
      }
      return respondWithManualSelection(createSupabasePublicClient(), scopeCode);
    }

    const parsed = LocateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createLocateError("VALIDATION_ERROR", {
          validation: parsed.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const { latitude, longitude, method } = parsed.data;
    const accuracy = getAccuracyBucket(parsed.data.accuracy);
    fallbackCoordinates = { latitude, longitude, accuracy, method };

    if (!isSupabasePublicConfigured()) {
      classifierUnavailable = true;
      classifierErrorCode = "NOT_CONFIGURED";
      return respondWithOfficialFallback(
        latitude, longitude, accuracy, method,
        classifierFallbackFlags(classifierUnavailable, classifierErrorCode)
      );
    }

    const supabase = createSupabasePublicClient();

    // The country check is advisory: an RPC failure must still continue
    // into the village search. Its SQLSTATE is surfaced in response flags.
    const classifierFlow = await classifyThenContinue<ClassifierRow, {
      data: RpcRow[] | null;
      error: { code?: string | null; message?: string | null } | null;
    } | null>(
      async () => {
        const outcome = await callRpcWithTimeout((signal) => supabase.rpc(CLASSIFIER_RPC, {
          p_lng: longitude, p_lat: latitude, p_buffer_m: 0,
        }).abortSignal(signal));
        if (outcome.kind === "timeout") return { data: null, error: { code: "RPC_TIMEOUT", message: "Classifier exceeded 2500ms." } };
        if (outcome.kind === "error") {
          const caught = outcome.error as { code?: string; message?: string } | null;
          return { data: null, error: { code: caught?.code ?? "RPC_ERROR", message: caught?.message ?? "Classifier RPC failed." } };
        }
        const { data, error } = outcome.value;
        return { data: data as ClassifierRow[] | null, error };
      },
      async (state) => {
        if (
          state.classification &&
          !state.classification.is_inside_rwanda &&
          !isBorderZoneCandidate(state.classification, accuracy)
        ) {
          return null;
        }
        const centerRequestEnabled =
          method !== "ip" &&
          CENTER_POINT_QUERY_BUCKETS.has(accuracy) &&
          LOCATE_CONFIDENCE_RPC === "calculate_location_confidence_v2";
        const [outcome, centerOutcome] = await Promise.all([
          callRpcWithTimeout((signal) => supabase.rpc(LOCATE_CONFIDENCE_RPC, {
            p_lng: longitude, p_lat: latitude, p_accuracy_m: accuracy,
          }).abortSignal(signal)),
          centerRequestEnabled
            ? callRpcWithTimeout((signal) => supabase.rpc(LOCATE_CONFIDENCE_RPC, {
                p_lng: longitude, p_lat: latitude, p_accuracy_m: 0,
              }).abortSignal(signal), 1_500)
            : Promise.resolve(null),
        ]);
        if (centerOutcome?.kind === "success" && !centerOutcome.value.error) {
          const centerRows = (centerOutcome.value.data as RpcRow[] | null) ?? [];
          centerPointVillage = centerRows.find((row) =>
            row.level === "village" &&
            Number(row.intersection_area_m2) > 0 &&
            row.scope_code !== "RW-01-01-01-001" &&
            !row.name_kiny.toLowerCase().includes("umudugudu w'urugero") &&
            !row.name_kiny.toLowerCase().includes("sample village")
          ) ?? null;
        }
        if (outcome.kind === "timeout") return { data: null, error: { code: "RPC_TIMEOUT", message: "Location confidence RPC exceeded 2500ms." } };
        if (outcome.kind === "error") {
          const caught = outcome.error as { code?: string; message?: string } | null;
          return { data: null, error: { code: caught?.code ?? "RPC_ERROR", message: caught?.message ?? "Location confidence RPC failed." } };
        }
        const { data, error } = outcome.value;
        return { data: data as RpcRow[] | null, error };
      },
      (state) => {
        // Retain the classifier error even if the subsequent village RPC throws.
        coordinateClassification = state.classification;
        borderZone = isBorderZoneCandidate(state.classification, accuracy);
        classifierUnavailable = state.unavailable;
        classifierErrorCode = state.errorCode;
      }
    );

    coordinateClassification = classifierFlow.classification;
    borderZone = isBorderZoneCandidate(coordinateClassification, accuracy);
    classifierUnavailable = classifierFlow.unavailable;
    classifierErrorCode = classifierFlow.errorCode;
    const classifierFlags = [
      ...classifierFallbackFlags(classifierUnavailable, classifierErrorCode),
      ...(borderZone ? ["border_zone"] : []),
    ];

    if (
      coordinateClassification &&
      !coordinateClassification.is_inside_rwanda &&
      !borderZone
    ) {
      const distance = coordinateClassification.distance_to_border_m;
      return NextResponse.json({
        status: "outside",
        outside_rwanda: true,
        distance_to_border_m:
          typeof distance === "number" && Number.isFinite(distance) ? distance : null,
      }, { status: 200 });
    }

    const locationQuery = classifierFlow.result;
    if (!locationQuery) {
      return respondWithOfficialFallback(
        latitude, longitude, accuracy, method, classifierFlags
      );
    }
    const { data: rows, error: rpcError } = locationQuery;

    if (rpcError) {
      console.warn(
        "[locate] PostGIS RPC failed; trying the official NISR boundary service:",
        rpcError.message ?? rpcError.code ?? "unknown_error"
      );
      return respondWithOfficialFallback(
        latitude, longitude, accuracy, method, classifierFlags
      );
    }

    // Ignore an old sample polygon if it remains in a database that has
    // not yet been re-imported; never present demo data as a real village.
    const realRows = ((rows as RpcRow[]) ?? []).filter((row) => {
      const lowerName = row.name_kiny.toLowerCase();
      return row.scope_code !== "RW-01-01-01-001" &&
        !lowerName.includes("umudugudu w'urugero") &&
        !lowerName.includes("sample village");
    });

    // v2 includes nearest-village assignments for samples outside all village
    // polygons. Those rows have zero intersection area: they are estimates, not
    // evidence that the device is inside that village. Keep them out of the
    // village/parent scores; use their no_village_mass only as a support penalty.
    const coverageRow = realRows.find((row) =>
      row.no_village_mass !== null &&
      row.no_village_mass !== undefined &&
      Number.isFinite(Number(row.no_village_mass))
    );
    const noVillageMass = coverageRow
      ? Math.min(1, Math.max(0, Number(coverageRow.no_village_mass)))
      : null;
    // Unknown coverage (legacy v1) keeps the previous behavior and is not
    // presented as measured 100% coverage in the API response.
    const villageBoundaryCoverage = noVillageMass === null ? null : 1 - noVillageMass;
    const containedRows = realRows.filter((row) => Number(row.intersection_area_m2) > 0);

    // For very precise fixes the primary RPC already tests the center point
    // (one sample, sigma <= 10 m). For wider GPS/network circles, a separate
    // exact-center RPC was run in parallel with the main query. Do not anchor
    // coarse IP fixes or reported accuracy worse than 100 m.
    if (
      !centerPointVillage &&
      method !== "ip" &&
      CENTER_POINT_PRIMARY_BUCKETS.has(accuracy) &&
      LOCATE_CONFIDENCE_RPC === "calculate_location_confidence_v2"
    ) {
      centerPointVillage = realRows.find((row) =>
        row.level === "village" && Number(row.intersection_area_m2) > 0
      ) ?? null;
    }

    if (containedRows.length === 0 && !centerPointVillage) {
      const fallbackFlags = [
        ...classifierFlags,
        ...(noVillageMass !== null && noVillageMass > 0.001 ? ["unmapped_village_mass"] : []),
      ];
      return respondWithOfficialFallback(
        latitude, longitude, accuracy, method, fallbackFlags
      );
    }

    let matches: ConfidenceMatch[] = containedRows.map((r) => ({
      scope_code: r.scope_code,
      name_kiny: r.name_kiny,
      name_eng: r.name_eng,
      level: r.level as ConfidenceMatch["level"],
      confidence: Number(r.confidence),
      intersection_area_m2: Number(r.intersection_area_m2),
    }));

    // Keep raw overlap scores intact; they are geometric overlap scores, not
    // calibrated probabilities. Use coarse IP geography only as a weak
    // district-level prior for GPS results, never as the sole location source.
    if ((method === "gps" || method === "network") && matches.length > 1) {
      const ipPrior = await getIpDistrictPrior(req, supabase);
      if (ipPrior.size > 0) {
        matches = rankVillageCandidates(matches, ipPrior);
      } else {
        matches.sort((a, b) => b.confidence - a.confidence);
      }
    } else {
      matches.sort((a, b) => b.confidence - a.confidence);
    }
    matches.splice(3);

    // --- Point in overlap flag (informational, still success) ---
    const isOverlap = matches.length > 1 && matches[1].confidence > 5;

    // The reported center-point hit is added as a zero-weight lineage row
    // when the uncertainty samples missed it. It may select the village, but
    // it does not inflate any percentage or geometric overlap score.
    const hierarchyRows = [...containedRows];
    if (
      centerPointVillage &&
      !hierarchyRows.some((row) => row.scope_code === centerPointVillage?.scope_code)
    ) {
      hierarchyRows.push({
        ...centerPointVillage,
        confidence: 0,
        intersection_area_m2: 0,
      });
    }

    // Aggregate genuine village intersections into the NISR hierarchy and
    // preserve the exact center-point polygon hit as separate selection evidence.
    const hierarchySummary = await buildHierarchicalSummary(
      supabase,
      hierarchyRows,
      centerPointVillage?.scope_code ?? null
    );
    const backoff = backoffLocation(
      hierarchySummary.backoffVillages,
      undefined,
      villageBoundaryCoverage ?? 1,
      centerPointVillage?.scope_code ?? null
    );
    const toLocateCandidate = (candidate: typeof backoff.chosen): ConfidenceMatch & {
      raw_score: number;
      calibrated_probability: number;
      supported_probability: number;
      center_point_match?: boolean;
    } => ({
      scope_code: candidate.scope_code,
      name_kiny: candidate.name_kiny,
      name_eng: candidate.name_eng ?? null,
      level: candidate.level,
      confidence: candidate.confidence,
      intersection_area_m2: Number(candidate.intersection_area_m2) || 0,
      raw_score: candidate.raw_score,
      calibrated_probability: candidate.calibrated_probability,
      supported_probability: candidate.supported_probability,
      center_point_match: candidate.center_point_match || undefined,
    });
    const calibratedCandidates = Object.fromEntries(
      Object.entries(backoff.per_level_candidates).map(([level, items]) => [
        level,
        (items ?? []).map(toLocateCandidate),
      ])
    ) as LocateSuccess["hierarchyCandidates"];
    const backoffHierarchy: LocateSuccess["hierarchy"] = {
      province: backoff.hierarchy.province ? toLocateCandidate(backoff.hierarchy.province) : undefined,
      district: backoff.hierarchy.district ? toLocateCandidate(backoff.hierarchy.district) : undefined,
      sector: backoff.hierarchy.sector ? toLocateCandidate(backoff.hierarchy.sector) : undefined,
      cell: backoff.hierarchy.cell ? toLocateCandidate(backoff.hierarchy.cell) : undefined,
      village: backoff.hierarchy.village ? toLocateCandidate(backoff.hierarchy.village) : undefined,
    };
    const bestVillageConfidence = Math.max(
      0,
      ...(backoff.per_level_candidates.village ?? [])
        .map((candidate) => candidate.supported_probability * 100)
    );
    // Keep the existing border-zone safeguard after calibrated back-off.
    const selectedHierarchy = capBorderZoneHierarchyAtSector(
      backoffHierarchy,
      borderZone,
      bestVillageConfidence
    );
    const chosenLevel = selectedHierarchy.village ? "village"
      : selectedHierarchy.cell ? "cell"
      : selectedHierarchy.sector ? "sector"
      : selectedHierarchy.district ? "district"
      : "province";
    const path = {
      intara: selectedHierarchy.province?.name_kiny,
      akarere: selectedHierarchy.district?.name_kiny,
      umurenge: selectedHierarchy.sector?.name_kiny,
      akagari: selectedHierarchy.cell?.name_kiny,
      umudugudu: selectedHierarchy.village?.name_kiny,
    };
    const calibratedTopVillages = (calibratedCandidates?.village ?? []).slice(0, 3);
    const response: LocateSuccess = {
      status: "success",
      matches: calibratedTopVillages,
      hierarchy: selectedHierarchy,
      hierarchyCandidates: calibratedCandidates,
      leaders: [],
      source: method,
      accuracy_m: accuracy,
      latitude,
      longitude,
      level: chosenLevel,
      path,
      per_level_candidates: calibratedCandidates,
      top3_villages: calibratedTopVillages,
      signals_used: [
        method,
        "postgis_accuracy_circle",
        ...(centerPointVillage ? ["center_point_in_village_polygon"] : []),
        CLASSIFIER_RPC,
        LOCATE_CONFIDENCE_RPC,
      ],
      flags: [
        ...(centerPointVillage ? ["center_point_village_match"] : []),
        ...(noVillageMass !== null && noVillageMass > 0.001 ? ["unmapped_village_mass"] : []),
        ...classifierFlags,
      ],
      village_boundary_coverage: villageBoundaryCoverage ?? undefined,
      dataset_version: DATASET_VERSION,
      calibration_version: CALIBRATION_VERSION,
    };
    if (method === "ip") {
      response.warning = "IP_NETWORK_LOCATION_COARSE_NOT_DEVICE_GPS";
    }

    if (isOverlap) {
      (response as LocateSuccess & { warning?: string }).warning =
        "POINT_IN_OVERLAP";
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[locate] Unexpected error; returning a best available location fallback:", err);
    if (coordinateClassification && !coordinateClassification.is_inside_rwanda) {
      const distance = coordinateClassification.distance_to_border_m;
      borderZone = isBorderZoneCandidate(
        coordinateClassification,
        fallbackCoordinates?.accuracy ?? 0
      );
      if (!borderZone) {
        return NextResponse.json({
          status: "outside",
          outside_rwanda: true,
          distance_to_border_m:
            typeof distance === "number" && Number.isFinite(distance) ? distance : null,
        }, { status: 200 });
      }
    }
    if (fallbackCoordinates) {
      try {
        return await respondWithOfficialFallback(
          fallbackCoordinates.latitude,
          fallbackCoordinates.longitude,
          fallbackCoordinates.accuracy,
          fallbackCoordinates.method,
          [
            ...classifierFallbackFlags(classifierUnavailable, classifierErrorCode),
            ...(borderZone ? ["border_zone"] : []),
          ]
        );
      } catch {
        // Keep the public location flow non-empty even if both Supabase and
        // the official boundary fallback are unavailable.
      }
    }
    return NextResponse.json(
      withLocationResponseContract(createRwandaProvincePrior(false), ["service_area_prior"]),
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<LocateResponse>> {
  if (!consumeLocateRateLimit(req)) return NextResponse.json(createLocateError("RATE_LIMIT", { retry_after_seconds: 60 }), { status: 429 });
  const cacheInfo = await getCoordinateCacheInfo(req.clone());
  if (cacheInfo) {
    const cached = locateResponseCache.get(cacheInfo.key);
    if (cached) {
      const body = cached.status === "success" ? { ...cached, latitude: cacheInfo.latitude, longitude: cacheInfo.longitude, accuracy_m: cacheInfo.accuracy } : cached;
      return NextResponse.json(body, { status: 200, headers: { "X-Locate-Cache": "HIT" } });
    }
  }
  const response = await handleLocatePost(req);
  if (cacheInfo && response.status === 200) {
    try {
      const body = await response.clone().json() as LocateResponse & { degraded?: boolean };
      if (body.status === "success") {
        const flags = Array.isArray(body.flags) ? body.flags : [];
        if (body.source !== "prior" && body.degraded !== true &&
            !flags.includes("degraded") && !flags.includes("rwanda_classifier_unavailable")) {
          locateResponseCache.set(cacheInfo.key, body);
        }
      }
    } catch { /* cache is optional */ }
  }
  return response;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function respondWithCountryOnlyPrior(
  hasRwandaIpCountry: boolean
): Promise<NextResponse<LocateResponse>> {
  return NextResponse.json(
    withLocationResponseContract(
      createRwandaProvincePrior(hasRwandaIpCountry),
      ["ip_country"]
    )
  );
}

function withLocationResponseContract(
  result: LocateSuccess,
  signals: string[] = [result.source]
): LocateSuccess {
  const hierarchy = result.hierarchy ?? {};
  const candidates = result.hierarchyCandidates ?? {};
  const villageCandidates = candidates.village ??
    result.matches.filter((match) => match.level === "village");
  const level = hierarchy.village ? "village"
    : hierarchy.cell ? "cell"
    : hierarchy.sector ? "sector"
    : hierarchy.district ? "district"
    : "province";
  return {
    ...result,
    level,
    path: result.path ?? {
      intara: hierarchy.province?.name_kiny,
      akarere: hierarchy.district?.name_kiny,
      umurenge: hierarchy.sector?.name_kiny,
      akagari: hierarchy.cell?.name_kiny,
      umudugudu: hierarchy.village?.name_kiny,
    },
    per_level_candidates: result.per_level_candidates ?? candidates,
    top3_villages: result.top3_villages ?? villageCandidates.slice(0, 3),
    signals_used: result.signals_used ?? signals,
    flags: result.flags ?? (result.source === "nearest" ? ["nearest_estimate"] : []),
    dataset_version: result.dataset_version ?? DATASET_VERSION,
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "unknown",
  };
}


async function buildHierarchicalSummary(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  villageRows: RpcRow[],
  centerPointVillageScopeCode?: string | null
): Promise<{
  hierarchy: LocateSuccess["hierarchy"];
  candidates: LocateSuccess["hierarchyCandidates"];
  backoffVillages: BackoffVillageInput[];
}> {
  const villageRowsWithCenter = [...villageRows];
  if (
    centerPointVillageScopeCode &&
    !villageRowsWithCenter.some((row) => row.scope_code === centerPointVillageScopeCode)
  ) {
    // The center point is a discrete inside-polygon fact, not uncertainty mass.
    // Zero values keep it in the hierarchy without changing scores or areas.
    villageRowsWithCenter.push({
      scope_code: centerPointVillageScopeCode,
      name_kiny: "",
      name_eng: null,
      level: "village",
      confidence: 0,
      intersection_area_m2: 0,
      path: "",
    } as RpcRow);
  }
  const villageMatches: ConfidenceMatch[] = villageRowsWithCenter.map((row) => ({
    scope_code: row.scope_code,
    name_kiny: row.name_kiny,
    name_eng: row.name_eng,
    level: "village",
    confidence: Number(row.confidence),
    intersection_area_m2: Number(row.intersection_area_m2),
  }));
  const aggregates = aggregateLocationHierarchy(villageMatches);
  const aggregateEntries = Object.values(aggregates).flatMap((items) => items ?? []);
  const scopeCodes = Array.from(new Set(aggregateEntries.map((item) => item.scope_code)));

  const { data } = scopeCodes.length > 0
    ? await supabase.from("boundaries")
        .select("scope_code, name_kiny, name_eng, level")
        .in("scope_code", scopeCodes)
        .is("valid_to", null)
    : { data: [] as Array<{ scope_code: string; name_kiny: string; name_eng: string | null; level: string }> };

  const byCode = new Map((data ?? []).map((row) => [row.scope_code, row]));
  for (const item of getStaticLocationChoices()) {
    if (!byCode.has(item.scope_code)) {
      byCode.set(item.scope_code, {
        scope_code: item.scope_code,
        name_kiny: item.name_kiny,
        name_eng: item.name_eng,
        level: item.level,
      });
    }
  }
  const villageByCode = new Map(villageMatches.map((row) => [row.scope_code, row]));
  const candidates: NonNullable<LocateSuccess["hierarchyCandidates"]> = {};
  const hierarchy: LocateSuccess["hierarchy"] = {};

  for (const level of ["province", "district", "sector", "cell", "village"] as const) {
    const items = aggregates[level] ?? [];
    const resolved = items.slice(0, 3).flatMap((item) => {
      const meta = byCode.get(item.scope_code);
      const village = villageByCode.get(item.scope_code);
      const name = meta?.name_kiny ?? village?.name_kiny;
      if (!name) return [];
      return [{
        scope_code: item.scope_code,
        name_kiny: name,
        name_eng: meta?.name_eng ?? village?.name_eng ?? null,
        level,
        confidence: item.confidence,
        intersection_area_m2: item.intersection_area_m2,
      } satisfies ConfidenceMatch];
    });
    if (resolved.length > 0) {
      candidates[level] = resolved;
      hierarchy[level] = resolved[0];
    }
  }

  const backoffVillages: BackoffVillageInput[] = villageRowsWithCenter.flatMap((row) => {
    const parts = String(row.scope_code).split("-");
    if (parts.length !== 6 || parts[0] !== "RW") return [];
    const getNode = (code: string) => {
      const meta = byCode.get(code);
      if (!meta) return null;
      return {
        scope_code: meta.scope_code,
        name_kiny: meta.name_kiny,
        name_eng: meta.name_eng,
      };
    };
    const parent_chain = {
      intara: getNode(parts.slice(0, 2).join("-")),
      akarere: getNode(parts.slice(0, 3).join("-")),
      umurenge: getNode(parts.slice(0, 4).join("-")),
      akagari: getNode(parts.slice(0, 5).join("-")),
    };
    if (!parent_chain.intara) return [];
    return [{
      scope_code: row.scope_code,
      name_kiny: row.name_kiny,
      name_eng: row.name_eng,
      raw_score: Math.max(0, Number(row.confidence) || 0) / 100,
      intersection_area_m2: Math.max(0, Number(row.intersection_area_m2) || 0),
      parent_chain,
    }];
  });

  return { hierarchy, candidates, backoffVillages };
}

async function buildHierarchy(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  topVillage: ConfidenceMatch
): Promise<LocateSuccess["hierarchy"]> {
  const hierarchy: LocateSuccess["hierarchy"] = {
    village: topVillage,
  };

  const parts = topVillage.scope_code.split("-");

  const prefixes: {
    level: "province" | "district" | "sector" | "cell";
    code: string;
  }[] = [];

  // Canonical NISR-derived codes preserve source IDs, e.g. RW-P1-D11-S1101-C110101-V11010101.
  if (parts[1]?.startsWith("P") && parts[2]?.startsWith("D")) {
    if (parts.length >= 2) prefixes.push({ level: "province", code: parts.slice(0, 2).join("-") });
    if (parts.length >= 3) prefixes.push({ level: "district", code: parts.slice(0, 3).join("-") });
    if (parts.length >= 4) prefixes.push({ level: "sector", code: parts.slice(0, 4).join("-") });
    if (parts.length >= 5) prefixes.push({ level: "cell", code: parts.slice(0, 5).join("-") });
  } else {
    // Compatibility for older local test data.
    if (parts.length >= 4) prefixes.push({ level: "cell", code: parts.slice(0, 4).join("-") });
    if (parts.length >= 3) prefixes.push({ level: "sector", code: parts.slice(0, 3).join("-") });
    if (parts.length >= 2) prefixes.push({ level: "district", code: parts.slice(0, 2).join("-") });
  }

  for (const { level, code } of prefixes) {
    const { data } = await supabase
      .from("boundaries")
      .select("scope_code, name_kiny, name_eng, level")
      .eq("scope_code", code)
      .eq("level", level)
      .is("valid_to", null)
      .maybeSingle();

    if (data) {
      hierarchy[level] = {
        scope_code: data.scope_code,
        name_kiny: data.name_kiny,
        name_eng: data.name_eng,
        level: data.level as ConfidenceMatch["level"],
        // Hierarchy Rule: inherit the village confidence — never force 100 %
        confidence: topVillage.confidence,
        intersection_area_m2: topVillage.intersection_area_m2,
      };
    }
  }

  return hierarchy;
}

function collectScopeCodes(
  hierarchy: LocateSuccess["hierarchy"],
  matches: ConfidenceMatch[]
): string[] {
  const codes = new Set<string>();
  for (const m of matches) codes.add(m.scope_code);
  if (hierarchy.province) codes.add(hierarchy.province.scope_code);
  if (hierarchy.village) codes.add(hierarchy.village.scope_code);
  if (hierarchy.cell) codes.add(hierarchy.cell.scope_code);
  if (hierarchy.sector) codes.add(hierarchy.sector.scope_code);
  if (hierarchy.district) codes.add(hierarchy.district.scope_code);
  return Array.from(codes);
}



/**
 * Resolve a missing database match against NISR's official 2022 village
 * polygons. The result contains no sample names or unverified leader contacts.
 */
function classifierFallbackFlags(
  unavailable: boolean,
  errorCode: string | null
): string[] {
  if (!unavailable) return [];
  return [
    "classifier_unavailable",
    "rwanda_classifier_unavailable",
    "classifier_error_code=" + (errorCode || "UNKNOWN"),
  ];
}

// CHANGED 2026-11-01 CLAUDE-PATCH: no runtime call to any outside boundary server (independence rule).
// The backup path uses only the offline representative-point index shipped in the repo; see docs/HANDOFF.md.
async function respondWithOfficialFallback(
  latitude: number,
  longitude: number,
  accuracy: number,
  method: "gps" | "map" | "network" | "ip" = "gps",
  extraFlags: string[] = []
): Promise<NextResponse<LocateResponse>> {
  const staticEstimate = nearestVillageEstimateFromIndex(
    offlineLocationIndex,
    latitude,
    longitude,
    accuracy,
    "STATIC_REPRESENTATIVE_POINT_ESTIMATE"
  );
  if (!staticEstimate || staticEstimate.status !== "success") {
    // Never turn a gap into a village claim: return the labelled service-area prior.
    return NextResponse.json(
      withLocationResponseContract(createRwandaProvincePrior(method === "ip"), [method, ...extraFlags]),
      { status: 200 }
    );
  }

  const response = withLocationResponseContract({
    ...staticEstimate,
    source: staticEstimate.source === "nearest" ? "nearest" : method,
    accuracy_m: accuracy,
    latitude,
    longitude,
  }, [method, "offline_index_fallback"]);
  response.flags = Array.from(new Set([...(response.flags ?? []), ...extraFlags]));
  return NextResponse.json(response, { status: 200 });
}


// Picker index built from the bundled offline index (fields: scope_code, name_kiny, name_eng, level,
// parent_scope_code, latitude, longitude). Replaces the former live NISR index fallback.
function listOfflineLocationIndex() {
  const index = offlineLocationIndex as unknown as { choices: unknown[][] };
  return index.choices
    .filter((row) => row[3] !== "country")
    .map((row) => ({
      scope_code: String(row[0]),
      name_kiny: String(row[1]),
      name_eng: row[2] == null ? null : String(row[2]),
      level: row[3] as "province" | "district" | "sector" | "cell" | "village",
      parent_scope_code: row[4] == null ? null : String(row[4]),
    }));
}

/**
 * Convert Vercel's IP geolocation into a weak district-only prior. IP data is
 * not precise enough to select a village and is never returned to the browser.
 * No IP address or IP-derived coordinates are stored.
 */
async function getIpDistrictPrior(
  req: NextRequest,
  supabase: ReturnType<typeof createSupabasePublicClient>
): Promise<Map<string, number>> {
  const headers = req.headers;
  if (headers.get("x-vercel-ip-country") !== "RW") return new Map();

  const latitude = Number(headers.get("x-vercel-ip-latitude"));
  const longitude = Number(headers.get("x-vercel-ip-longitude"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return new Map();

  // Only consider IP hints in Rwanda. Use a wide radius so it remains a district
  // prior rather than pretending IP geolocation identifies the person's village.
  if (longitude < 28.85 || longitude > 30.9 || latitude < -2.85 || latitude > -1.05) {
    return new Map();
  }

  try {
    const outcome = await callRpcWithTimeout((signal) => supabase.rpc(LOCATE_CONFIDENCE_RPC, {
      p_lng: longitude, p_lat: latitude, p_accuracy_m: 15_000,
    }).abortSignal(signal));
    if (outcome.kind !== "success") {
      if (outcome.kind === "error") console.warn("[locate] IP district prior RPC failed:", outcome.error);
      return new Map();
    }
    const { data, error } = outcome.value;
    if (error || !Array.isArray(data)) {
      if (error) console.warn("[locate] IP district prior unavailable:", error.message);
      return new Map();
    }

    const totals = new Map<string, number>();
    for (const row of data as RpcRow[]) {
      const lowerName = (row.name_kiny ?? "").toLowerCase();
      if (
        row.scope_code === "RW-01-01-01-001" ||
        lowerName.includes("umudugudu w'urugero") ||
        lowerName.includes("sample village")
      ) continue;

      const parts = String(row.scope_code).split("-");
      if (parts.length < 3 || !parts[1]?.startsWith("P") || !parts[2]?.startsWith("D")) continue;
      const districtCode = parts.slice(0, 3).join("-");
      totals.set(districtCode, (totals.get(districtCode) ?? 0) + Math.max(Number(row.confidence) || 0, 0));
    }

    const sum = Array.from(totals.values()).reduce((total, value) => total + value, 0);
    if (sum <= 0) return new Map();
    return new Map(Array.from(totals, ([code, value]) => [code, value / sum]));
  } catch (error) {
    console.warn("[locate] IP district prior failed:", error);
    return new Map();
  }
}


async function respondWithManualSelection(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  scopeCode: string
): Promise<NextResponse<LocateResponse>> {
  const { data, error } = await supabase
    .from("boundaries")
    .select("scope_code, name_kiny, name_eng, level")
    .eq("scope_code", scopeCode)
    .eq("level", "village")
    .is("valid_to", null)
    .maybeSingle();
  if (error || !data) {
    // This bundled index is also the source for the offline picker. If the
    // database is absent or points to an empty project, let the citizen confirm
    // a real name from this verified index instead of hitting a dead end.
    return respondWithStaticManualSelection(scopeCode);
  }
  const selected: ConfidenceMatch = {
    scope_code: data.scope_code,
    name_kiny: data.name_kiny,
    name_eng: data.name_eng,
    level: "village",
    confidence: 100,
    intersection_area_m2: 0,
  };
  const hierarchy = await buildHierarchy(supabase, selected);
  const response = withLocationResponseContract({
    status: "success",
    matches: [selected],
    hierarchy,
    leaders: [],
    source: "manual",
    warning: "USER_CONFIRMED",
  }, ["manual"]);
  return NextResponse.json(response);
}


type StaticLocationChoice = {
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: "province" | "district" | "sector" | "cell" | "village";
  parent_scope_code: string | null;
};

function getStaticLocationChoices(): StaticLocationChoice[] {
  const rawChoices = (offlineLocationIndex as { choices?: unknown[] }).choices;
  if (!Array.isArray(rawChoices)) return [];
  const levels = new Set(["province", "district", "sector", "cell", "village"]);
  return rawChoices.flatMap((raw): StaticLocationChoice[] => {
    if (!Array.isArray(raw) || raw.length < 5) return [];
    const level = String(raw[3]);
    const scopeCode = String(raw[0] ?? "");
    const nameKiny = String(raw[1] ?? "");
    if (!levels.has(level) || !scopeCode || !nameKiny) return [];
    return [{
      scope_code: scopeCode,
      name_kiny: nameKiny,
      name_eng: raw[2] == null ? null : String(raw[2]),
      level: level as StaticLocationChoice["level"],
      parent_scope_code: raw[4] == null ? null : String(raw[4]),
    }];
  });
}

function respondWithStaticManualSelection(scopeCode: string): NextResponse<LocateResponse> {
  const choices = getStaticLocationChoices();
  const selected = choices.find((item) => item.scope_code === scopeCode && item.level === "village");
  if (!selected) {
    return NextResponse.json(createLocateError("NOT_FOUND"), { status: 404 });
  }

  const byCode = new Map(choices.map((item) => [item.scope_code, item]));
  const hierarchy: LocateSuccess["hierarchy"] = {};
  let current: StaticLocationChoice | undefined = selected;
  let village: ConfidenceMatch | null = null;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const match: ConfidenceMatch = {
      scope_code: current.scope_code,
      name_kiny: current.name_kiny,
      name_eng: current.name_eng,
      level: current.level,
      confidence: 100,
      intersection_area_m2: 0,
    };
    if (current.level === "province") hierarchy.province = match;
    if (current.level === "district") hierarchy.district = match;
    if (current.level === "sector") hierarchy.sector = match;
    if (current.level === "cell") hierarchy.cell = match;
    if (current.level === "village") {
      hierarchy.village = match;
      village = match;
    }
    current = current.parent_scope_code ? byCode.get(current.parent_scope_code) : undefined;
  }

  if (!village) {
    return NextResponse.json(createLocateError("NOT_FOUND"), { status: 404 });
  }
  const response = withLocationResponseContract({
    status: "success",
    matches: [village],
    hierarchy,
    leaders: [],
    source: "manual",
    warning: "USER_CONFIRMED_STATIC_INDEX",
  }, ["manual", "offline_index"]);
  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}


/** Search official village names, or browse the hierarchy from province to village. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!consumeLocateRateLimit(req)) return NextResponse.json(createLocateError("RATE_LIMIT", { retry_after_seconds: 60 }), { status: 429 });
  try {
    const params = new URL(req.url).searchParams;

    if (params.get("index") === "1") {
      const cacheHeaders = {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      };

      if (isSupabasePublicConfigured()) {
        const supabase = createSupabasePublicClient();
        const pageSize = 1000;
        const starts = Array.from({ length: 18 }, (_, index) => index * pageSize);
        const pageResults = await Promise.all(starts.map(async (start) => {
          const result = await supabase.from("boundaries")
            .select("scope_code, name_kiny, name_eng, level")
            .is("valid_to", null)
            .order("scope_code", { ascending: true })
            .range(start, start + pageSize - 1);
          return { start, ...result };
        }));
        const failedPage = pageResults.find((page) => page.error);
        const rows = failedPage ? [] : pageResults.flatMap((page) => page.data ?? []);
        if (!failedPage && rows.length > 0) {
          const choices = rows
            .filter((row) => row.level !== "country")
            .map((row) => ({
              scope_code: row.scope_code,
              name_kiny: row.name_kiny,
              name_eng: row.name_eng,
              level: row.level,
              // Official scope codes are hierarchical; no private UUID fields needed.
              parent_scope_code: row.level === "province" ? null : row.scope_code.split("-").slice(0, -1).join("-"),
            }));
          return NextResponse.json({ status: "index", choices, source: "supabase" }, {
            headers: cacheHeaders,
          });
        }
        console.error("[locate] Supabase national index unavailable; using the bundled offline index:",
          failedPage?.error?.message ?? "no active boundary rows");
      }

      return NextResponse.json({ status: "index", choices: listOfflineLocationIndex(), source: "offline-index" }, {
        headers: cacheHeaders,
      });
    }

    if (!isSupabasePublicConfigured()) {
      return NextResponse.json({ status: "error", message: "Location data unavailable." }, { status: 503 });
    }
    const supabase = createSupabasePublicClient();
    const q = (params.get("q") ?? "").trim().replace(/[%,_()]/g, " ").slice(0, 80);
    const parentScopeCode = (params.get("parent_scope_code") ?? "").trim();
    const requestedLevel = (params.get("level") ?? "province").trim();
    const allowed = ["province", "district", "sector", "cell", "village"] as const;
    const level = allowed.includes(requestedLevel as (typeof allowed)[number]) ? requestedLevel : "province";

    let query = supabase.from("boundaries")
      .select("scope_code, name_kiny, name_eng, level")
      .is("valid_to", null);

    if (q) {
      query = query.eq("level", "village")
        .ilike("name_kiny", `%${q}%`)
        .order("name_kiny", { ascending: true })
        .limit(30);
    } else {
      query = query.eq("level", level).order("name_kiny", { ascending: true })
        .limit(level === "province" ? 10 : 120);
      if (parentScopeCode) {
        if (!/^RW(?:-[0-9A-Z]+)*$/.test(parentScopeCode)) {
          return NextResponse.json({ status: "choices", choices: [] });
        }
        query = query.like("scope_code", `${parentScopeCode}-%`);
      } else if (level !== "province") {
        return NextResponse.json({ status: "choices", choices: [] });
      }
    }
    const { data, error } = await query;
    if (error) {
      console.error("[locate] picker query failed:", error.message);
      return NextResponse.json({ status: "error", message: "Location choices unavailable." }, { status: 503 });
    }
    return NextResponse.json({ status: "choices", choices: data ?? [] }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("[locate] picker error:", error);
    return NextResponse.json({ status: "error", message: "Location choices unavailable." }, { status: 503 });
  }
}
