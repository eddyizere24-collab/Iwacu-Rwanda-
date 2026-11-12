export type CoverageLevel = { total: number; with_leader: number; with_account: number; signed_in: number };
export type DossierChild = {
  unit_id: string; scope_code: string; level: string; name: string; sub: Record<string, number>;
  cards_inside: number; open_cases: number; leader_name: string | null; leader_title: string | null;
  leader_phone: string | null; leader_photo: string | null; status: string; card_expected: boolean;
};
export type DossierCase = { id: string; category: string; message: string; status: string; created_at: string; scope_code: string; unit_name: string; level: string };
export type DossierRecent = { at: string; action: string; scope_code: string; unit_name: string; level: string; who: string; leader_name: string | null };
export type Dossier = {
  unit: { unit_id: string; scope_code: string; level: string; name_kiny: string | null; name_eng: string | null; child_level: string | null; is_my_top: boolean; card_expected: boolean };
  ancestors: { scope_code: string; level: string; name: string }[];
  leader: {
    display_name: string; job_title: string | null; phone: string | null; public_email: string | null; office_hours: string | null; bio: string | null;
    photo_path: string | null; is_public: boolean; has_account: boolean; status: string; login_name: string | null; user_id: string | null; updated_at: string;
  } | null;
  levels: Record<string, CoverageLevel>;
  children: DossierChild[];
  case_counts: Record<string, number>;
  cases: DossierCase[];
  recent: DossierRecent[];
  attention: { vacant_units: number | null; vacant_level: string | null; waiting_login_over_7d: number; cards_without_phone: number; open_cases: number };
  tasks: { open_targets?: number; overdue_targets?: number; waiting_review?: number };
  messages: { sent_30d: number; delivered_30d: number; read_30d: number } | null;
  as_of: string;
};

export const LEVEL_BELOW: Record<string, string | null> = { country: "district", province: "district", district: "sector", sector: "cell", cell: "village", village: null };
export const unitHref = (scope: string) => "/admin/ibiro/ahantu/" + scope;
export const placesHref = (p: { level?: string; under?: string; vacant?: boolean; q?: string }) => {
  const qs = new URLSearchParams();
  if (p.level) qs.set("level", p.level);
  if (p.under) qs.set("under", p.under);
  if (p.vacant !== undefined) qs.set("vacant", p.vacant ? "1" : "0");
  if (p.q) qs.set("q", p.q);
  const s = qs.toString();
  return "/admin/ibiro/inzego" + (s ? "?" + s : "");
};
