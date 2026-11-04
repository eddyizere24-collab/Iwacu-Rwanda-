create policy leader_appointment_events_scoped_read
on public.leader_appointment_events for select to authenticated
using (exists (select 1 from public.leader_appointments a where a.id = appointment_id
  and (select private.leader_actor_can('read', a.administrative_unit_id))));

create policy leader_audit_events_scoped_read
on public.leader_audit_events for select to authenticated
using (administrative_unit_id is not null
  and (select private.leader_actor_can('audit', administrative_unit_id))
  or (administrative_unit_id is null and (select private.leader_actor_can('manage_admins', null))));

-- MFA is also enforced at the Data API boundary, not only in Next.js routes.
-- National Super Admin may read their own role assignment at AAL1 so the app
-- can route them to the MFA screen; all other registry data and all writes
-- remain denied until the session has been elevated to AAL2.
create policy admin_role_assignments_national_mfa_required
on public.admin_role_assignments as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  or user_id = (select auth.uid())
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy admin_delegations_national_mfa_required
on public.admin_delegations as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_people_national_mfa_required
on public.leader_people as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_person_history_national_mfa_required
on public.leader_person_history as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_positions_national_mfa_required
on public.leader_positions as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_appointments_national_mfa_required
on public.leader_appointments as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_verification_cases_national_mfa_required
on public.leader_verification_cases as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_appointment_evidence_national_mfa_required
on public.leader_appointment_evidence as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_verification_decisions_national_mfa_required
on public.leader_verification_decisions as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_public_profiles_national_mfa_required
on public.leader_public_profiles as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_contacts_national_mfa_required
on public.leader_contacts as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_dossiers_national_mfa_required
on public.leader_dossiers as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_dossier_documents_national_mfa_required
on public.leader_dossier_documents as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_appointment_events_national_mfa_required
on public.leader_appointment_events as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy leader_audit_events_national_mfa_required
on public.leader_audit_events as restrictive for all to authenticated
using (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  not (select private.leader_actor_requires_mfa())
  or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);
