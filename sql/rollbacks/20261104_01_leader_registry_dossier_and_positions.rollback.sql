-- Roll back L1 migration 01 before relying on the additional confidential records.
-- Preserve canonical authority and position rows; no hard deletes of existing registry records.
begin;
drop trigger if exists leader_employment_history_audit_event on public.leader_employment_history;
drop trigger if exists leader_certifications_audit_event on public.leader_certifications;
drop trigger if exists leader_employment_history_guard on public.leader_employment_history;
drop trigger if exists leader_certifications_guard on public.leader_certifications;
drop policy if exists leader_employment_dossier_read on public.leader_employment_history;
drop policy if exists leader_employment_dossier_write on public.leader_employment_history;
drop policy if exists leader_employment_dossier_update on public.leader_employment_history;
drop policy if exists leader_certifications_dossier_read on public.leader_certifications;
drop policy if exists leader_certifications_dossier_write on public.leader_certifications;
drop policy if exists leader_certifications_dossier_update on public.leader_certifications;
drop table if exists public.leader_employment_history;
drop table if exists public.leader_certifications;
drop policy if exists leader_dossier_documents_scoped_archive on public.leader_dossier_documents;
drop policy if exists admin_role_assignments_l1_hierarchy_insert on public.admin_role_assignments;
drop policy if exists admin_role_assignments_l1_hierarchy_update on public.admin_role_assignments;
revoke update on public.leader_dossier_documents from authenticated;
drop function if exists private.leader_actor_can_manage_assignment(text,uuid);
drop function if exists private.guard_leader_dossier_child();

-- Revoke only the assignment created by this L1 migration; the foundation
-- migration's owner mapping has a different grant_reason and is preserved.
update public.admin_role_assignments
set assignment_status='revoked', revoked_at=now()
where role_code='national_super_admin'
  and assignment_status='active'
  and grant_reason='L1 first Super Admin bootstrap from the sole existing owner admin_profiles row';

-- Retire the draft seed instead of deleting catalogue rows which may now be referenced.
update public.leader_positions
set position_status='retired'
where code in ('village_leader','cell_executive_secretary','sector_executive_secretary','mayor','vice_mayor','district_executive_secretary')
  and confirmation_required is true
  and source_reference like 'Governance Specification%'
  and position_status='draft';

alter table public.leader_positions
  drop column if exists source_reference,
  drop column if exists confirmation_required;
commit;
