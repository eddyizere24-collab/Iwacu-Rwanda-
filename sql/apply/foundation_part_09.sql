-- Anonymous callers can read only the minimal public projection columns;
-- the row policies below further require a published, approved appointment.
grant select (id, first_name, last_name) on public.leader_people to anon, authenticated;
grant select (id, code, title_kiny, title_eng, title_fra, required_boundary_level, position_status)
  on public.leader_positions to anon, authenticated;
grant select (id, person_id, position_id, administrative_unit_id, effective_from, effective_to, appointment_status)
  on public.leader_appointments to anon, authenticated;
grant select (appointment_id, display_name, biography, office_hours, service_priorities, public_photo_object_key, publication_status)
  on public.leader_public_profiles to anon, authenticated;
grant select (appointment_id, verification_status)
  on public.leader_verification_cases to anon;
grant select (appointment_id, contact_type, contact_value, label, sort_order, visibility, public_approved_at)
  on public.leader_contacts to anon, authenticated;

-- Authority assignments and delegations.
create policy admin_role_assignments_self_or_scoped_manager
on public.admin_role_assignments for select to authenticated
using (user_id = (select auth.uid())
  or (select private.leader_actor_can('manage_admins', administrative_unit_id)));
create policy admin_role_assignments_scoped_insert
on public.admin_role_assignments for insert to authenticated
with check ((select private.leader_actor_can('manage_admins', administrative_unit_id)));
create policy admin_role_assignments_scoped_update
on public.admin_role_assignments for update to authenticated
using ((select private.leader_actor_can('manage_admins', administrative_unit_id)))
with check ((select private.leader_actor_can('manage_admins', administrative_unit_id)));

create policy admin_delegations_related_read
on public.admin_delegations for select to authenticated
using (grantor_user_id = (select auth.uid()) or grantee_user_id = (select auth.uid())
  or (select private.leader_actor_can('manage_admins', null)));
create policy admin_delegations_scoped_insert
on public.admin_delegations for insert to authenticated
with check (
  grantor_user_id = (select auth.uid())
  and case capability
    when 'leader_read' then (select private.leader_actor_can('read', administrative_unit_id))
    when 'leader_edit' then (select private.leader_actor_can('edit', administrative_unit_id))
    when 'leader_review' then (select private.leader_actor_can('approve', administrative_unit_id))
    when 'leader_dossier_read' then (select private.leader_actor_can('view_dossier', administrative_unit_id))
    when 'leader_dossier_write' then (select private.leader_actor_can('edit_dossier', administrative_unit_id))
    when 'leader_audit_read' then (select private.leader_actor_can('audit', administrative_unit_id))
    else false
  end
);
create policy admin_delegations_grantor_update
on public.admin_delegations for update to authenticated
using (grantor_user_id = (select auth.uid()))
with check (grantor_user_id = (select auth.uid()));

-- Person identity: visible to an in-scope administrator or through a public appointment.
create policy leader_people_public_approved
on public.leader_people for select to anon
using ((select private.leader_person_is_public(id)));
create policy leader_people_authorised_read
on public.leader_people for select to authenticated
using (
  (select private.leader_person_is_public(id))
  or created_by = (select auth.uid())
  or exists (
    select 1 from public.leader_appointments a
    where a.person_id = leader_people.id and (select private.leader_actor_can('read', a.administrative_unit_id))
  )
);
create policy leader_people_authorised_insert
on public.leader_people for insert to authenticated
with check (created_by = (select auth.uid())
  and (select private.leader_actor_can('create_person', null)));
create policy leader_people_authorised_update
on public.leader_people for update to authenticated
using (exists (select 1 from public.leader_appointments a
  where a.person_id = leader_people.id and (select private.leader_actor_can('edit', a.administrative_unit_id))))
with check (exists (select 1 from public.leader_appointments a
  where a.person_id = leader_people.id and (select private.leader_actor_can('edit', a.administrative_unit_id))));

create policy leader_person_history_confidential_read
on public.leader_person_history for select to authenticated
using (exists (select 1 from public.leader_appointments a where a.person_id = leader_person_history.person_id
  and ((select private.leader_actor_can('view_dossier', a.administrative_unit_id))
    or (select private.leader_actor_can('read', a.administrative_unit_id)))));

create policy leader_positions_public_approved
on public.leader_positions for select to anon, authenticated
using (position_status = 'approved');
create policy leader_positions_national_read_drafts
on public.leader_positions for select to authenticated
using ((select private.leader_actor_can('manage_positions', null)));
create policy leader_positions_national_insert
on public.leader_positions for insert to authenticated
with check (created_by = (select auth.uid()) and (select private.leader_actor_can('manage_positions', null)));
create policy leader_positions_national_update
on public.leader_positions for update to authenticated
using ((select private.leader_actor_can('manage_positions', null)))
with check ((select private.leader_actor_can('manage_positions', null)));

create policy leader_appointments_public_current
on public.leader_appointments for select to anon
using ((select private.leader_appointment_is_public(id)));
create policy leader_appointments_authorised_read
on public.leader_appointments for select to authenticated
using ((select private.leader_appointment_is_public(id))
  or (select private.leader_actor_can('read', administrative_unit_id)));
create policy leader_appointments_authorised_insert
on public.leader_appointments for insert to authenticated
with check (recorded_by = (select auth.uid())
  and (select private.leader_actor_can('edit', administrative_unit_id)));
create policy leader_appointments_authorised_update
on public.leader_appointments for update to authenticated
using ((select private.leader_actor_can('edit', administrative_unit_id)))
with check ((select private.leader_actor_can('edit', administrative_unit_id)));

create policy leader_verification_cases_authorised_read
on public.leader_verification_cases for select to authenticated
using (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('read', a.administrative_unit_id))));
create policy leader_verification_cases_public_approved_read
on public.leader_verification_cases for select to anon
using (verification_status = 'approved'
  and (select private.leader_appointment_is_public(appointment_id)));
create policy leader_verification_cases_authorised_insert
on public.leader_verification_cases for insert to authenticated
with check (submitted_by = (select auth.uid())
  and exists (select 1 from public.leader_appointments a where a.id = appointment_id
    and (select private.leader_actor_can('edit', a.administrative_unit_id))));
create policy leader_verification_cases_authorised_update
on public.leader_verification_cases for update to authenticated
using (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('approve', a.administrative_unit_id))))
with check (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('approve', a.administrative_unit_id))));

create policy leader_evidence_reviewer_read
on public.leader_appointment_evidence for select to authenticated
using (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (
    (select private.leader_actor_can('approve', a.administrative_unit_id))
    or (select private.leader_actor_can('view_dossier', a.administrative_unit_id))
    or (uploaded_by = (select auth.uid()) and (select private.leader_actor_can('edit', a.administrative_unit_id)))
  )));
create policy leader_evidence_scoped_insert
on public.leader_appointment_evidence for insert to authenticated
with check (uploaded_by = (select auth.uid())
  and exists (select 1 from public.leader_appointments a where a.id = appointment_id
    and (select private.leader_actor_can('edit', a.administrative_unit_id))));

create policy leader_decisions_authorised_read
on public.leader_verification_decisions for select to authenticated
using (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('read', a.administrative_unit_id))));

create policy leader_public_profiles_public_read
on public.leader_public_profiles for select to anon
using (publication_status = 'published' and (select private.leader_appointment_is_public(appointment_id)));
create policy leader_public_profiles_authorised_read
on public.leader_public_profiles for select to authenticated
using ((publication_status = 'published' and (select private.leader_appointment_is_public(appointment_id)))
  or exists (select 1 from public.leader_appointments a where a.id = appointment_id
    and (select private.leader_actor_can('read', a.administrative_unit_id))));
create policy leader_public_profiles_scoped_insert
on public.leader_public_profiles for insert to authenticated
with check (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('edit', a.administrative_unit_id))));
create policy leader_public_profiles_scoped_update
on public.leader_public_profiles for update to authenticated
using (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('edit', a.administrative_unit_id))))
with check (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('edit', a.administrative_unit_id))));

create policy leader_contacts_public_read
on public.leader_contacts for select to anon
using (visibility = 'public' and public_approved_at is not null
  and (select private.leader_appointment_is_public(appointment_id)));
create policy leader_contacts_authorised_read
on public.leader_contacts for select to authenticated
using ((visibility = 'public' and public_approved_at is not null
    and (select private.leader_appointment_is_public(appointment_id)))
  or exists (select 1 from public.leader_appointments a where a.id = appointment_id
    and (
      (select private.leader_actor_can('view_dossier', a.administrative_unit_id))
      or (select private.leader_actor_can('edit', a.administrative_unit_id))
    )));
create policy leader_contacts_scoped_insert
on public.leader_contacts for insert to authenticated
with check (created_by = (select auth.uid())
  and exists (select 1 from public.leader_appointments a where a.id = appointment_id
    and (select private.leader_actor_can('edit', a.administrative_unit_id))));
create policy leader_contacts_scoped_update
on public.leader_contacts for update to authenticated
using (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('edit', a.administrative_unit_id))))
with check (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('edit', a.administrative_unit_id))));

create policy leader_dossiers_confidential_read
on public.leader_dossiers for select to authenticated
using (exists (select 1 from public.leader_appointments a where a.person_id = leader_dossiers.person_id
  and (select private.leader_actor_can('view_dossier', a.administrative_unit_id))));
create policy leader_dossiers_confidential_insert
on public.leader_dossiers for insert to authenticated
with check (created_by = (select auth.uid())
  and exists (select 1 from public.leader_appointments a where a.person_id = leader_dossiers.person_id
    and (select private.leader_actor_can('edit_dossier', a.administrative_unit_id))));
create policy leader_dossiers_confidential_update
on public.leader_dossiers for update to authenticated
using (exists (select 1 from public.leader_appointments a where a.person_id = leader_dossiers.person_id
  and (select private.leader_actor_can('edit_dossier', a.administrative_unit_id))))
with check (exists (select 1 from public.leader_appointments a where a.person_id = leader_dossiers.person_id
  and (select private.leader_actor_can('edit_dossier', a.administrative_unit_id))));

create policy leader_dossier_documents_confidential_read
on public.leader_dossier_documents for select to authenticated
using (exists (select 1 from public.leader_appointments a where a.person_id = leader_dossier_documents.person_id
  and (select private.leader_actor_can('view_dossier', a.administrative_unit_id))));
create policy leader_dossier_documents_confidential_insert
on public.leader_dossier_documents for insert to authenticated
with check (uploaded_by = (select auth.uid())
  and exists (select 1 from public.leader_appointments a where a.person_id = leader_dossier_documents.person_id
    and (select private.leader_actor_can('edit_dossier', a.administrative_unit_id))));
