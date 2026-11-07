// CHANGED 2026-11-05 CLAUDE: pure, testable rules for the add-leader wizard (place chain, evidence, duplicates); see docs/HANDOFF.md
// No React and no network here, so every rule can be unit-tested without a browser.

export type Level = "country" | "province" | "district" | "sector" | "cell" | "village";

export const LEVEL_ORDER: Level[] = ["country", "province", "district", "sector", "cell", "village"];

export const LEVEL_LABEL: Record<Level, string> = {
  country: "Igihugu",
  province: "Intara",
  district: "Akarere",
  sector: "Umurenge",
  cell: "Akagari",
  village: "Umudugudu",
};

export function isLevel(value: string): value is Level {
  return (LEVEL_ORDER as string[]).includes(value);
}

export type ChainResult =
  | { ok: true; chain: Level[] }
  | { ok: false; reason: "root_too_deep" | "unknown_level" };

/**
 * The cascading selects the admin must walk through, from the level just below
 * the admin's own scope down to the level the position requires.
 * National admin (country) + village position -> province, district, sector, cell, village.
 * District admin + sector position -> sector only. Same level as the admin scope -> no selects.
 */
export function levelChain(rootLevel: string, targetLevel: string): ChainResult {
  if (!isLevel(rootLevel) || !isLevel(targetLevel)) return { ok: false, reason: "unknown_level" };
  const root = LEVEL_ORDER.indexOf(rootLevel);
  const target = LEVEL_ORDER.indexOf(targetLevel);
  if (root > target) return { ok: false, reason: "root_too_deep" };
  return { ok: true, chain: LEVEL_ORDER.slice(root + 1, target + 1) };
}

const ACTIVE_STATUSES = new Set(["pending", "under_review", "approved", "active"]);

export type AppointmentRef = {
  position_id: string;
  administrative_unit_id: string;
  appointment_status: string;
};

/** True when an exclusive position already has a live holder (or a pending submission) at this place. */
export function hasActiveHolder(
  appointments: AppointmentRef[],
  positionId: string,
  unitId: string,
): boolean {
  return appointments.some(
    (item) =>
      item.position_id === positionId &&
      item.administrative_unit_id === unitId &&
      ACTIVE_STATUSES.has(item.appointment_status),
  );
}

export const NOT_SUPPLIED_TEXT = "Ntibirashyirwamo";

export const EVIDENCE_TYPES: Array<{ value: string; label: string }> = [
  { value: "appointment_letter", label: "Ibaruwa y'ishyirwaho mu nshingano" },
  { value: "election_result", label: "Ibyavuye mu matora" },
  { value: "official_gazette", label: "Igazeti ya Leta" },
  { value: "not_supplied", label: "Nta cyemezo ndabona (kizongerwamo nyuma)" },
];

export type EvidenceInput = {
  type: string;
  reference: string;
  issuer: string;
  issuedOn: string;
};

export type EvidencePayload = {
  evidence_type: string;
  reference_number: string;
  issuer: string;
  issued_on: string | null;
};

/**
 * Honest evidence: when nothing was supplied we label it "not supplied" instead of inventing values
 * (Governance Specification 7.4). The server still stores it as a pending verification.
 */
export function buildEvidence(input: EvidenceInput): { ok: true; value: EvidencePayload } | { ok: false; message: string } {
  if (!EVIDENCE_TYPES.some((item) => item.value === input.type)) {
    return { ok: false, message: "Hitamo ubwoko bw'icyemezo." };
  }
  if (input.type === "not_supplied") {
    return {
      ok: true,
      value: {
        evidence_type: "not_supplied",
        reference_number: NOT_SUPPLIED_TEXT,
        issuer: NOT_SUPPLIED_TEXT,
        issued_on: null,
      },
    };
  }
  const reference = input.reference.trim();
  const issuer = input.issuer.trim();
  if (reference.length < 1) return { ok: false, message: "Andika nomero y'icyemezo." };
  if (reference.length > 160) return { ok: false, message: "Nomero y'icyemezo ni ndende cyane." };
  if (issuer.length < 2) return { ok: false, message: "Andika urwego rwatanze icyemezo." };
  if (issuer.length > 200) return { ok: false, message: "Izina ry'urwego ni rirerire cyane." };
  const issuedOn = input.issuedOn.trim();
  if (issuedOn && !/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) {
    return { ok: false, message: "Itariki y'icyemezo ntiyanditswe neza." };
  }
  return {
    ok: true,
    value: {
      evidence_type: input.type,
      reference_number: reference,
      issuer,
      issued_on: issuedOn || null,
    },
  };
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function sameName(a: string, b: string): boolean {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase();
}

export type NameCheck = { ok: true; first: string; last: string } | { ok: false; message: string };

export function checkPersonName(firstName: string, lastName: string): NameCheck {
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);
  if (!first) return { ok: false, message: "Andika izina rya mbere." };
  if (!last) return { ok: false, message: "Andika irya kabiri." };
  if (first.length > 80) return { ok: false, message: "Izina rya mbere ni rirerire cyane." };
  if (last.length > 100) return { ok: false, message: "Irya kabiri ni rirerire cyane." };
  if (/\d/.test(first) || /\d/.test(last)) {
    return { ok: false, message: "Amazina ntagomba kuba arimo imibare." };
  }
  return { ok: true, first, last };
}

export type RecentCandidate = {
  id: string;
  person_id: string;
  position_id: string;
  appointment_status: string;
  person: { first_name: string; last_name: string } | null;
};

/**
 * After an ambiguous failure (network dropped after the request left) the server may already have
 * saved the appointment. Before sending again, look for the same person+position at the same place
 * so a retry can never create a duplicate.
 */
export function findAlreadySaved(
  candidates: RecentCandidate[],
  positionId: string,
  who: { personId: string } | { first: string; last: string },
): RecentCandidate | null {
  for (const item of candidates) {
    if (item.position_id !== positionId) continue;
    if (!ACTIVE_STATUSES.has(item.appointment_status)) continue;
    if ("personId" in who) {
      if (item.person_id === who.personId) return item;
    } else if (item.person && sameName(item.person.first_name, who.first) && sameName(item.person.last_name, who.last)) {
      return item;
    }
  }
  return null;
}
