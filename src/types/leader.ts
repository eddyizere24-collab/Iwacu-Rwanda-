export type LeaderRole =
  | "Village Leader"
  | "Cell Executive Secretary"
  | "Sector Executive Secretary"
  | "Mayor"
  | "Vice Mayor"
  | "District Executive Secretary"
  | "Other";

export type LeaderVerificationStatus = "pending" | "approved" | "rejected";

export interface LeaderSocialMedia {
  twitter_x?: string;
  linkedin?: string;
  facebook?: string;
}
export interface WorkHistoryItem {
  title: string;
  organization: string;
  period: string;
}
export interface AdminDossier {
  education_level: string;
  field_of_study: string;
  institution: string;
  work_history: WorkHistoryItem[];
  appointment_letter_ref: string;
  start_date: string;
  special_certifications: string[];
  notes?: string;
}
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
  whatsapp_number?: string | null;
  social_media?: LeaderSocialMedia | null;
  vision_priorities?: string | null;
  office_hours?: string | null;
  availability_status?: "available" | "busy" | "out_of_office";
  is_verified?: boolean;
  verification_status?: LeaderVerificationStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  admin_dossier?: AdminDossier | null;
}
export interface LeaderPublic extends Leader {
  boundary_name_kiny: string;
  boundary_name_eng: string | null;
  level: string;
  phone_masked: string | null;
  phone_raw?: string | null;
}
export interface InactiveNumberReport {
  id: string;
  leader_id: string;
  leader_name: string;
  reported_phone: string;
  boundary_name: string;
  citizen_comment?: string;
  created_at: string;
  status: "pending" | "resolved" | "dismissed";
}
export interface LeaderUpdatePayload {
  first_name?: string;
  last_name?: string;
  role?: LeaderRole;
  phone_number?: string;
  email?: string | null;
  photo_url?: string | null;
  version: number;
}
