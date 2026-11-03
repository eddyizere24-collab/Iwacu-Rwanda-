/**
 * Public leader types for legacy locate response compatibility.
 * Confidential dossier fields, raw phone/email and private file keys are
 * intentionally absent. The V2 registry uses its own allowlisted contract.
 */
export type LeaderRole =
  | "Village Leader"
  | "Cell Executive Secretary"
  | "Sector Executive Secretary"
  | "Mayor"
  | "Vice Mayor"
  | "District Executive Secretary"
  | "Other";

export type LeaderVerificationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended";

export interface LeaderPublic {
  id: string;
  scope_code: string;
  first_name: string;
  last_name: string;
  role: LeaderRole;
  boundary_name_kiny: string;
  boundary_name_eng: string | null;
  level: string;
  valid_from: string;
  valid_to: string | null;
  version: number;
  verification_status?: LeaderVerificationStatus;
  is_verified?: boolean;
}

/** Minimal compatibility payload; contains no private/public contact fields. */
export interface LeaderUpdatePayload {
  version: number;
  first_name?: string;
  last_name?: string;
}
