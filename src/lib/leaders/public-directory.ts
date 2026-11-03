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
  appointment: { effective_from: string; effective_to: string | null; status: string };
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
