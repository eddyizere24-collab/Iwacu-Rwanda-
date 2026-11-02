/**
 * Shared shaping of a `leaders` row (joined with its boundary, role and contacts) into the PUBLIC response shape.
 * Used by /api/locate, /api/leaders and /api/ai-router so all three behave identically.
 * Contact details are public by decision of the owner; only verified, current leaders are ever selected.
 */
import { buildContactLink, displayContactValue } from "@/lib/contacts";
import type { LeaderPublic, LeaderRole, PublicContact } from "@/types/leader";

interface BoundaryBrief { name_kiny: string | null; name_eng: string | null; level: string | null; verification_status?: string | null }
interface RoleBrief { label_kiny: string | null; label_eng: string | null }
interface KindBrief { label_kiny: string | null; label_eng: string | null; link_template: string | null }
interface ContactRow {
  kind: string; value: string; label: string | null; is_primary: boolean | null; sort_order: number | null;
  contact_kinds: KindBrief | KindBrief[] | null;
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** Row as returned by `select(LEADER_PUBLIC_SELECT)`. */
export interface LeaderRowWithBoundary {
  id: string;
  scope_code: string;
  first_name: string;
  last_name: string;
  role: LeaderRole;
  email: string | null;
  photo_url: string | null;
  valid_from: string;
  valid_to: string | null;
  version: number;
  boundaries: BoundaryBrief | BoundaryBrief[] | null;
  leader_roles?: RoleBrief | RoleBrief[] | null;
  leader_contacts?: ContactRow[] | null;
}

/** Column list that matches LeaderRowWithBoundary (kept next to the type so they cannot drift apart). */
export const LEADER_PUBLIC_SELECT =
  "id, scope_code, first_name, last_name, role, email, photo_url, valid_from, valid_to, version, boundaries!inner ( name_kiny, name_eng, level, verification_status ), leader_roles ( label_kiny, label_eng ), leader_contacts ( kind, value, label, is_primary, sort_order, contact_kinds ( label_kiny, label_eng, link_template ) )";

/** True when the unit the leader belongs to has verified boundaries (an unverified unit must not show leaders). */
export function hasVerifiedBoundary(row: LeaderRowWithBoundary): boolean {
  return one(row.boundaries)?.verification_status === "verified";
}

export function toPublicLeader(row: LeaderRowWithBoundary): LeaderPublic {
  const b = one(row.boundaries);
  const r = one(row.leader_roles);

  const rows = [...(row.leader_contacts ?? [])].sort(
    (a, c) => (a.sort_order ?? 100) - (c.sort_order ?? 100) || a.kind.localeCompare(c.kind) || a.value.localeCompare(c.value),
  );
  const contacts: PublicContact[] = rows.map((c) => {
    const k = one(c.contact_kinds);
    return {
      kind: c.kind,
      kind_label_kiny: k?.label_kiny ?? c.kind,
      kind_label_eng: k?.label_eng ?? null,
      value: c.value,
      display: displayContactValue(c.kind, c.value),
      label: c.label ?? null,
      is_primary: c.is_primary === true,
      href: buildContactLink({ link_template: k?.link_template ?? null }, c.value),
    };
  });
  // The older single e-mail column is shown too, unless the same address is already in the contact list.
  if (row.email && !contacts.some((c) => c.kind === "email" && c.value.toLowerCase() === row.email!.toLowerCase())) {
    contacts.push({
      kind: "email", kind_label_kiny: "Email", kind_label_eng: "E-mail", value: row.email, display: row.email,
      label: null, is_primary: false, href: buildContactLink({ link_template: "mailto:{value}" }, row.email),
    });
  }

  return {
    id: row.id,
    scope_code: row.scope_code,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role,
    email: row.email ?? null,
    photo_url: row.photo_url ?? null,
    valid_from: row.valid_from,
    valid_to: row.valid_to ?? null,
    version: row.version,
    boundary_name_kiny: b?.name_kiny ?? "",
    boundary_name_eng: b?.name_eng ?? null,
    level: b?.level ?? "",
    role_label_kiny: r?.label_kiny ?? row.role,
    role_label_eng: r?.label_eng ?? null,
    contacts,
  };
}
