export type LeaderRole = string;

export interface Leader {
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
}

export interface PublicContact {
  kind: string;
  kind_label_kiny: string;
  kind_label_eng: string | null;
  value: string;
  display: string;
  label: string | null;
  is_primary: boolean;
  href: string | null;
}

export interface LeaderPublic extends Leader {
  boundary_name_kiny: string;
  boundary_name_eng: string | null;
  level: string;
  role_label_kiny: string;
  role_label_eng: string | null;
  contacts: PublicContact[];
}

export type LeaderStatus = "pending" | "verified" | "rejected" | "archived";

export interface AdminContact {
  kind: string;
  value: string;
  label: string | null;
  is_primary: boolean;
}
export interface AdminLeader {
  id: string;
  scope_code: string;
  first_name: string;
  last_name: string;
  role: LeaderRole;
  email: string | null;
  photo_url: string | null;
  status: LeaderStatus;
  source_note: string | null;
  review_note: string | null;
  version: number;
  created_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  updated_at: string;
  contacts: AdminContact[];
  boundary_name_kiny: string;
  boundary_name_eng: string | null;
  level: string;
}

export interface AdminMeta {
  roles: { code: string; label_kiny: string; label_eng: string | null; level: string | null }[];
  contact_kinds: { code: string; label_kiny: string; label_eng: string | null; placeholder: string | null }[];
}
