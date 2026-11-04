-- [CLAUDE] Leaders L1 hardening: undo Supabase default table privileges on the V2 registry tables.
-- Supabase grants ALL on every new public table to anon and authenticated by default (ALTER DEFAULT PRIVILEGES).
-- Found 2026-11-04 on Production: public.leader_appointments kept those defaults (anon could INSERT/UPDATE/DELETE
-- by privilege; only RLS stopped it) and authenticated additionally held TRUNCATE, REFERENCES, TRIGGER, which RLS
-- does not control. Additive/tightening only: no data, no policy, no other object is changed.
begin;

-- 1) No anon write-type privileges and no TRUNCATE/REFERENCES/TRIGGER for anon or authenticated on ANY V2 table.
revoke insert, update, delete, truncate, references, trigger on
  public.admin_delegations,
  public.admin_role_assignments,
  public.leader_appointment_events,
  public.leader_appointment_evidence,
  public.leader_appointments,
  public.leader_audit_events,
  public.leader_certifications,
  public.leader_contacts,
  public.leader_dossier_documents,
  public.leader_dossiers,
  public.leader_employment_history,
  public.leader_people,
  public.leader_person_history,
  public.leader_positions,
  public.leader_public_profiles,
  public.leader_verification_cases,
  public.leader_verification_decisions
from anon;

revoke truncate, references, trigger on
  public.admin_delegations,
  public.admin_role_assignments,
  public.leader_appointment_events,
  public.leader_appointment_evidence,
  public.leader_appointments,
  public.leader_audit_events,
  public.leader_certifications,
  public.leader_contacts,
  public.leader_dossier_documents,
  public.leader_dossiers,
  public.leader_employment_history,
  public.leader_people,
  public.leader_person_history,
  public.leader_positions,
  public.leader_public_profiles,
  public.leader_verification_cases,
  public.leader_verification_decisions
from authenticated;

-- 2) leader_appointments: restore exactly the intended grants (same as the isolated CI baseline).
--    authenticated: SELECT, INSERT, UPDATE (no DELETE: appointments are ended/archived, never deleted).
--    anon: column-level SELECT of the public-safe columns only (needed by public.leader_directory_public).
revoke all on public.leader_appointments from anon, authenticated;
grant select, insert, update on public.leader_appointments to authenticated;
grant select (id, person_id, position_id, administrative_unit_id, appointment_status, effective_from, effective_to)
  on public.leader_appointments to anon;

commit;
