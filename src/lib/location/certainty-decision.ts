/**
 * Pure decision layer for the certainty_lookup_v1 response.
 *
 * It deliberately contains no browser, network, React, or database access.
 * The RPC is the authority for which administrative levels are safe to name.
 */

export const LOCATION_CERTAINTY_LEVELS = [
  "village",
  "cell",
  "sector",
  "district",
  "province",
] as const;

export type LocationCertaintyLevel = typeof LOCATION_CERTAINTY_LEVELS[number];
export type CertaintyRpcStatus = "confirmed" | "near_border" | "not_confirmable";
export type LocationFixSource = "gps" | "network" | "ip" | "last-known";

export interface CertaintyCandidate {
  scope_code: string;
  name_kiny: string;
  name_eng?: string | null;
  distance_m?: number | null;
}

export interface CertaintyLevelResult {
  status: CertaintyRpcStatus;
  scope_code: string | null;
  name_kiny: string | null;
  name_eng: string | null;
  candidates: CertaintyCandidate[];
}

export interface CertaintyLookupResult {
  needed_m: number;
  levels: Record<LocationCertaintyLevel, CertaintyLevelResult>;
}

export interface LocationFixMetadata {
  accuracyMeters: number;
  timestamp: number;
  source: LocationFixSource;
  speedMetersPerSecond?: number | null;
  latitude?: number;
  longitude?: number;
}

export interface LocationCertaintyStateEntry {
  scopeCode: string;
  nameKiny: string;
  nameEng?: string | null;
  accuracyMeters: number;
  timestamp: number;
  confirmationCount: number;
}

export interface LocationCertaintyState {
  byLevel: Partial<Record<LocationCertaintyLevel, LocationCertaintyStateEntry>>;
  lastFix?: {
    timestamp: number;
    accuracyMeters: number;
    latitude?: number;
    longitude?: number;
  };
}

export interface LocationCertaintyLevelDecision {
  status: CertaintyRpcStatus;
  /** The status actually returned by the RPC, retained when the UI must wait for a second fix. */
  rpcStatus?: CertaintyRpcStatus;
  scope_code?: string;
  name_kiny?: string;
  name_eng?: string | null;
  other_candidate?: CertaintyCandidate;
}

export interface LocationCertaintyDecision {
  levels: Record<LocationCertaintyLevel, LocationCertaintyLevelDecision>;
  /** Finest level directly confirmed by the RPC decision engine. */
  displayLevel: LocationCertaintyLevel | "country";
  accuracyMeters: number;
  searchingForBetterSignal: boolean;
  moving: boolean;
  lastKnownOnly: boolean;
  nearBorder?: {
    level: LocationCertaintyLevel;
    name_kiny: string;
    other_name_kiny?: string;
  };
  state: LocationCertaintyState;
}

const FRESH_CONFIRMED_RESULT_MS = 5 * 60 * 1000;
const FINE_LEVELS = new Set<LocationCertaintyLevel>(["village", "cell"]);
const NETWORK_ONLY_LEVELS = new Set<LocationCertaintyLevel>(["sector", "cell", "village"]);

function emptyLevel(status: CertaintyRpcStatus = "not_confirmable"): LocationCertaintyLevelDecision {
  return { status };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCandidate(value: unknown): value is CertaintyCandidate {
  if (!isRecord(value)) return false;
  return typeof value.scope_code === "string" &&
    value.scope_code.length > 0 &&
    typeof value.name_kiny === "string" &&
    value.name_kiny.length > 0;
}

/** Runtime guard for JSON received from the RPC. */
export function isCertaintyLookupResult(value: unknown): value is CertaintyLookupResult {
  if (!isRecord(value) || typeof value.needed_m !== "number" || !Number.isFinite(value.needed_m) || !isRecord(value.levels)) return false;
  return LOCATION_CERTAINTY_LEVELS.every((level) => {
    const record = value.levels[level];
    if (!isRecord(record)) return false;
    if (
      record.status !== "confirmed" &&
      record.status !== "near_border" &&
      record.status !== "not_confirmable"
    ) return false;
    return Array.isArray(record.candidates) && record.candidates.every(isCandidate);
  });
}

export function createEmptyLocationCertaintyState(): LocationCertaintyState {
  return { byLevel: {} };
}

function validCoordinates(metadata: LocationFixMetadata): boolean {
  return Number.isFinite(metadata.latitude) &&
    Number.isFinite(metadata.longitude) &&
    (metadata.latitude as number) >= -90 &&
    (metadata.latitude as number) <= 90 &&
    (metadata.longitude as number) >= -180 &&
    (metadata.longitude as number) <= 180;
}

function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(latitudeB - latitudeA);
  const dLng = radians(longitudeB - longitudeA);
  const latA = radians(latitudeA);
  const latB = radians(latitudeB);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(
    Math.sqrt(haversine),
    Math.sqrt(Math.max(0, 1 - haversine)),
  );
}

function isTrustedEntry(
  entry: LocationCertaintyStateEntry | undefined,
  level: LocationCertaintyLevel,
  now: number,
): entry is LocationCertaintyStateEntry {
  if (!entry || !entry.scopeCode || !entry.nameKiny) return false;
  if (now < entry.timestamp || now - entry.timestamp > FRESH_CONFIRMED_RESULT_MS) return false;
  return !FINE_LEVELS.has(level) || entry.confirmationCount >= 2;
}

function confirmedFromEntry(entry: LocationCertaintyStateEntry): LocationCertaintyLevelDecision {
  return {
    status: "confirmed",
    rpcStatus: "confirmed",
    scope_code: entry.scopeCode,
    name_kiny: entry.nameKiny,
    name_eng: entry.nameEng,
  };
}

/**
 * Decide which RPC names may be displayed for one fix.
 *
 * A prior confirmed name is retained only when the incoming fix is weaker and
 * the visitor is not moving. The five-minute freshness window intentionally
 * matches the maximum naming age for a stored last-known location.
 */
export function decideLocationCertainty(
  lookup: CertaintyLookupResult | null | undefined,
  metadata: LocationFixMetadata,
  previousState: LocationCertaintyState | null | undefined = undefined,
  now = Date.now(),
): LocationCertaintyDecision {
  const prior = previousState ?? createEmptyLocationCertaintyState();
  const state: LocationCertaintyState = {
    byLevel: { ...prior.byLevel },
    lastFix: prior.lastFix ? { ...prior.lastFix } : undefined,
  };
  const accuracyIsValid = Number.isFinite(metadata.accuracyMeters) &&
    metadata.accuracyMeters > 0 &&
    metadata.accuracyMeters <= 100_000;
  const timestampIsValid = Number.isFinite(metadata.timestamp) &&
    metadata.timestamp >= 0 &&
    metadata.timestamp <= now;
  const validFix = accuracyIsValid && timestampIsValid;
  const lastKnownOnly = metadata.source === "last-known" &&
    (!validFix || now - metadata.timestamp > FRESH_CONFIRMED_RESULT_MS);

  let moving = Number.isFinite(metadata.speedMetersPerSecond) &&
    (metadata.speedMetersPerSecond as number) > 1;
  if (
    !moving &&
    state.lastFix &&
    validCoordinates(metadata) &&
    Number.isFinite(metadata.accuracyMeters)
  ) {
    const previousCoordinates = Number.isFinite(state.lastFix.latitude) &&
      Number.isFinite(state.lastFix.longitude);
    if (previousCoordinates) {
      moving = distanceMeters(
        state.lastFix.latitude as number,
        state.lastFix.longitude as number,
        metadata.latitude as number,
        metadata.longitude as number,
      ) > metadata.accuracyMeters;
    }
  }

  const levels = {} as Record<LocationCertaintyLevel, LocationCertaintyLevelDecision>;
  let nearBorder: LocationCertaintyDecision["nearBorder"];

  for (const level of LOCATION_CERTAINTY_LEVELS) {
    const previousEntry = state.byLevel[level];
    const previousIsTrusted = isTrustedEntry(previousEntry, level, now);
    const levelIsRestricted =
      (metadata.source === "network" || metadata.source === "ip") &&
      NETWORK_ONLY_LEVELS.has(level);
    const staleLastKnownRestriction = lastKnownOnly && level !== "district" && level !== "province";

    if (!validFix || levelIsRestricted || staleLastKnownRestriction) {
      levels[level] = emptyLevel();
      continue;
    }

    // A weaker fix cannot replace a still-fresh confirmed name unless movement
    // has been detected. This also protects the result if the RPC is unavailable.
    const olderOrWeaker = previousIsTrusted && previousEntry &&
      (
        metadata.timestamp < previousEntry.timestamp ||
        metadata.accuracyMeters > previousEntry.accuracyMeters
      );
    if (olderOrWeaker && previousEntry && !moving) {
      levels[level] = confirmedFromEntry(previousEntry);
      continue;
    }

    const rpcLevel = lookup?.levels[level];
    if (!rpcLevel || rpcLevel.status === "not_confirmable") {
      delete state.byLevel[level];
      levels[level] = emptyLevel();
      continue;
    }

    if (rpcLevel.status === "confirmed") {
      if (!rpcLevel.scope_code || !rpcLevel.name_kiny) {
        delete state.byLevel[level];
        levels[level] = emptyLevel();
        continue;
      }
      const sameUnit = Boolean(
        previousEntry &&
        previousEntry.scopeCode === rpcLevel.scope_code &&
        metadata.timestamp > previousEntry.timestamp &&
        metadata.timestamp - previousEntry.timestamp <= FRESH_CONFIRMED_RESULT_MS
      );
      const confirmationCount = sameUnit
        ? (previousEntry?.confirmationCount ?? 0) + 1
        : 1;
      const nextEntry: LocationCertaintyStateEntry = {
        scopeCode: rpcLevel.scope_code,
        nameKiny: rpcLevel.name_kiny,
        nameEng: rpcLevel.name_eng,
        // The second confirmation may be weaker than the first fix.
        // Keep the strongest measurement for this same unit while advancing
        // its confirmation timestamp and count.
        accuracyMeters: sameUnit
          ? Math.min(previousEntry?.accuracyMeters ?? metadata.accuracyMeters, metadata.accuracyMeters)
          : metadata.accuracyMeters,
        timestamp: metadata.timestamp,
        confirmationCount,
      };
      state.byLevel[level] = nextEntry;

      if (FINE_LEVELS.has(level) && confirmationCount < 2) {
        levels[level] = {
          status: "not_confirmable",
          rpcStatus: "confirmed",
        };
      } else {
        levels[level] = {
          status: "confirmed",
          rpcStatus: "confirmed",
          scope_code: rpcLevel.scope_code,
          name_kiny: rpcLevel.name_kiny,
          name_eng: rpcLevel.name_eng,
        };
      }
      continue;
    }

    const candidates = rpcLevel.candidates.filter(isCandidate);
    if (candidates.length === 0) {
      if (FINE_LEVELS.has(level) && (previousEntry?.confirmationCount ?? 0) < 2) {
        delete state.byLevel[level];
      }
      levels[level] = {
        status: "not_confirmable",
        rpcStatus: "near_border",
      };
      continue;
    }

    let primary = candidates[0];
    if (FINE_LEVELS.has(level)) {
      // A fine-level near-border name is shown only after that same unit was
      // confirmed by two distinct fixes. Candidate proximity alone is not proof.
      if (!previousEntry || previousEntry.confirmationCount < 2) {
        delete state.byLevel[level];
        levels[level] = {
          status: "not_confirmable",
          rpcStatus: "near_border",
        };
        continue;
      }
      const previouslyConfirmedCandidate = candidates[0]?.scope_code === previousEntry.scopeCode
        ? candidates[0]
        : undefined;
      if (!previouslyConfirmedCandidate) {
        delete state.byLevel[level];
        levels[level] = {
          status: "not_confirmable",
          rpcStatus: "near_border",
        };
        continue;
      }
      primary = previouslyConfirmedCandidate;
    }

    const other = candidates.find((candidate) => candidate.scope_code !== primary.scope_code);
    levels[level] = {
      status: "near_border",
      rpcStatus: "near_border",
      scope_code: primary.scope_code,
      name_kiny: primary.name_kiny,
      name_eng: primary.name_eng,
      other_candidate: other,
    };
    if (!nearBorder) {
      nearBorder = {
        level,
        name_kiny: primary.name_kiny,
        other_name_kiny: other?.name_kiny,
      };
    }
  }

  const displayLevel = LOCATION_CERTAINTY_LEVELS.find(
    (level) => levels[level].status === "confirmed",
  ) ?? "country";
  const searchingForBetterSignal = displayLevel === "country";

  if (
    validFix &&
    metadata.source !== "last-known" &&
    validCoordinates(metadata) &&
    (!state.lastFix || metadata.timestamp >= state.lastFix.timestamp)
  ) {
    state.lastFix = {
      timestamp: metadata.timestamp,
      accuracyMeters: metadata.accuracyMeters,
      latitude: metadata.latitude,
      longitude: metadata.longitude,
    };
  }

  return {
    levels,
    displayLevel,
    accuracyMeters: Number.isFinite(metadata.accuracyMeters)
      ? metadata.accuracyMeters
      : 0,
    searchingForBetterSignal,
    moving,
    lastKnownOnly,
    nearBorder,
    state,
  };
}
