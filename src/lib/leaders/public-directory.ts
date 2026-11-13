import { confidenceLabel } from "./confidence";
import type { LocationConfidence } from "./confidence";

export type PublicContact = {
  type: string;
  label: string | null;
  value: string;
};

export type PublicLeaderRecord = {
  appointment_id: string;
  person_id: string;
  display_name: string;
  position: { code: string; title_kiny: string; title_eng: string; title_fra: string };
  appointment: { effective_from: string; effective_to: string | null; status: string; verified_at: string | null };
  profile: {
    biography: string | null;
    office_hours: string | null;
    service_priorities: string | null;
    photo_key: string | null;
    thumbnail_key: string | null;
  };
  public_contacts: PublicContact[];
};

export type PublicPlace = {
  id: string;
  scope_code: string;
  name_kiny: string;
  name_eng: string | null;
  level: string;
};

export type PublicCandidate = {
  place: PublicPlace;
  confidence: LocationConfidence;
  leaders: PublicLeaderRecord[];
};

export type PublicSharedLeader = PublicLeaderRecord & { place: PublicPlace };

export type PublicDirectoryPayload = {
  status: "success";
  unavailable: false;
  candidates: PublicCandidate[];
  shared_leaders: PublicSharedLeader[];
  message_kiny: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

/** Only a plain ISO date or timestamp is passed on; anything else becomes null (shown as "not yet verified"). */
function safeDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}([T ][0-9:.+\-Z]+)?$/.test(value) ? value : null;
}

function safePlace(value: unknown): PublicPlace | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const scope_code = text(row.scope_code);
  const level = text(row.level);
  if (!id || !scope_code || !level) return null;
  return { id, scope_code, name_kiny: text(row.name_kiny), name_eng: nullableText(row.name_eng), level };
}

/** Allowlist RPC output. Any database column added later remains private by default. */
export function safePublicLeader(value: unknown): PublicLeaderRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const position = (row.position && typeof row.position === "object" ? row.position : {}) as Record<string, unknown>;
  const appointment = (row.appointment && typeof row.appointment === "object" ? row.appointment : {}) as Record<string, unknown>;
  const profile = (row.profile && typeof row.profile === "object" ? row.profile : {}) as Record<string, unknown>;
  const appointment_id = text(row.appointment_id);
  const person_id = text(row.person_id);
  const display_name = text(row.display_name);
  if (!appointment_id || !person_id || !display_name) return null;

  const public_contacts = Array.isArray(row.public_contacts)
    ? row.public_contacts.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const contact = item as Record<string, unknown>;
        const type = text(contact.type);
        const contactValue = text(contact.value);
        if (!type || !contactValue) return [];
        return [{ type, label: nullableText(contact.label), value: contactValue }];
      })
    : [];

  return {
    appointment_id,
    person_id,
    display_name,
    position: {
      code: text(position.code),
      title_kiny: text(position.title_kiny),
      title_eng: text(position.title_eng),
      title_fra: text(position.title_fra),
    },
    appointment: {
      effective_from: text(appointment.effective_from),
      effective_to: nullableText(appointment.effective_to),
      status: text(appointment.status),
      verified_at: safeDate(appointment.verified_at),
    },
    profile: {
      biography: nullableText(profile.biography),
      office_hours: nullableText(profile.office_hours),
      service_priorities: nullableText(profile.service_priorities),
      photo_key: nullableText(profile.photo_key),
      thumbnail_key: nullableText(profile.thumbnail_key),
    },
    public_contacts,
  };
}

export function sanitizePublicDirectory(
  raw: unknown,
  confidenceByScope: ReadonlyMap<string, number | undefined>,
): PublicDirectoryPayload {
  const root = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const rawCandidates = Array.isArray(root.candidates) ? root.candidates.slice(0, 3) : [];
  const candidates: PublicCandidate[] = [];

  for (const item of rawCandidates) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const place = safePlace(row.place);
    if (!place) continue;
    const leaders = Array.isArray(row.leaders)
      ? row.leaders.map(safePublicLeader).filter((v): v is PublicLeaderRecord => v !== null)
      : [];
    candidates.push({
      place,
      confidence: confidenceLabel(confidenceByScope.get(place.scope_code)),
      leaders,
    });
  }

  const candidateAppointmentIds = new Set(
    candidates.flatMap((candidate) => candidate.leaders.map((leader) => leader.appointment_id)),
  );
  const seen = new Set<string>();
  const shared_leaders: PublicSharedLeader[] = [];
  const rawShared = Array.isArray(root.shared_leaders) ? root.shared_leaders : [];

  for (const item of rawShared) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const place = safePlace(row.place);
    const leader = safePublicLeader(row);
    if (!place || !leader || seen.has(leader.appointment_id) || candidateAppointmentIds.has(leader.appointment_id)) continue;
    seen.add(leader.appointment_id);
    shared_leaders.push({ ...leader, place });
  }

  return {
    status: "success",
    unavailable: false,
    candidates,
    shared_leaders,
    message_kiny: candidates.length === 0
      ? "Amakuru y'umuyobozi ntaruzuzwa"
      : null,
  };
}

/** A leader card typed in by an office (or loaded in bulk), as returned by get_public_unit_leaders_v1. */
export type OfficeCard = {
  scope_code: string;
  level: string;
  unit_name: string;
  display_name: string;
  job_title: string | null;
  phone: string | null;
  public_email: string | null;
  bio: string | null;
  office_hours: string | null;
};

export const OFFICE_ID_PREFIX = "office-";

const OFFICE_TITLE: Record<string, string> = {
  district: "Umuyobozi w'Akarere",
  sector: "Umunyamabanga Nshingwabikorwa w'Umurenge",
  cell: "Umunyamabanga Nshingwabikorwa w'Akagari",
  village: "Umukuru w'Umudugudu",
};

/** The place and its parents, as scope codes (RW-P5-D57-S5701-C570105 -> ...-D57, ...-S5701, ...-C570105). Province and country carry no cards. */
export function scopeChain(scopeCode: string): string[] {
  const parts = scopeCode.split("-");
  const out: string[] = [];
  for (let i = 3; i <= parts.length && out.length < 5; i++) out.push(parts.slice(0, i).join("-"));
  return out;
}

export function safeOfficeCard(value: unknown): OfficeCard | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const scope_code = text(row.scope_code);
  const display_name = text(row.display_name);
  if (!/^RW(?:-[A-Z0-9]{1,12}){0,5}$/.test(scope_code) || !display_name) return null;
  return {
    scope_code,
    level: text(row.level),
    unit_name: text(row.unit_name),
    display_name,
    job_title: nullableText(row.job_title),
    phone: nullableText(row.phone),
    public_email: nullableText(row.public_email),
    bio: nullableText(row.bio),
    office_hours: nullableText(row.office_hours),
  };
}

/** Same shape as a registry leader, so the existing lists show it. Never marked verified here: a card is shown as "not yet verified" until an office confirms it. */
export function officeCardToLeader(card: OfficeCard, verifiedAt: string | null = null): PublicLeaderRecord {
  const title = card.job_title || OFFICE_TITLE[card.level] || "Umuyobozi";
  const contacts: PublicContact[] = [];
  if (card.phone) contacts.push({ type: "phone", label: null, value: card.phone });
  if (card.public_email) contacts.push({ type: "email", label: null, value: card.public_email });
  return {
    appointment_id: OFFICE_ID_PREFIX + card.scope_code,
    person_id: OFFICE_ID_PREFIX + card.scope_code,
    display_name: card.display_name,
    position: { code: "office_leader", title_kiny: title, title_eng: title, title_fra: title },
    appointment: { effective_from: "", effective_to: null, status: "approved", verified_at: verifiedAt },
    profile: { biography: card.bio, office_hours: card.office_hours, service_priorities: null, photo_key: null, thumbnail_key: null },
    public_contacts: contacts,
  };
}

/** Add office cards where the registry has nobody for that exact place. Registry leaders always win. */
export function mergeOfficeCards(payload: PublicDirectoryPayload, rawCards: unknown): PublicDirectoryPayload {
  const cards = (Array.isArray(rawCards) ? rawCards : []).map(safeOfficeCard).filter((c): c is OfficeCard => c !== null);
  if (!cards.length) return payload;
  const byScope = new Map(cards.map((c) => [c.scope_code, c]));
  const registryScopes = new Set(payload.shared_leaders.map((l) => l.place.scope_code));
  const candidates = payload.candidates.map((candidate) => {
    const card = byScope.get(candidate.place.scope_code);
    if (!card || candidate.leaders.length) return candidate;
    return { ...candidate, leaders: [officeCardToLeader(card)] };
  });
  const candidateScopes = new Set(payload.candidates.map((c) => c.place.scope_code));
  const shared = [...payload.shared_leaders];
  const chainScopes = new Set(payload.candidates.flatMap((c) => scopeChain(c.place.scope_code)));
  for (const scope of chainScopes) {
    const card = byScope.get(scope);
    if (!card || candidateScopes.has(scope) || registryScopes.has(scope)) continue;
    shared.push({
      ...officeCardToLeader(card),
      place: { id: scope, scope_code: scope, name_kiny: card.unit_name, name_eng: null, level: card.level },
    });
  }
  return { ...payload, candidates, shared_leaders: shared };
}
