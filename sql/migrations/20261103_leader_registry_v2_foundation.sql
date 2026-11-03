-- IWACU RWANDA — Leader Registry V2 foundation
-- Additive only. Does not alter public.boundaries, public.leaders, the location engine,
-- or existing audit data. Review and test in an isolated Supabase project before release.
begin;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Authority assignments: Province deliberately has no administrator role.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  role_code text not null check (role_code in ('national_super_admin','district_admin','sector_admin','cell_admin')),
  administrative_unit_id uuid not null references public.boundaries(id) on delete restrict,
  assignment_status text not null default 'active'
    check (assignment_status in ('active','suspended','revoked')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  granted_by uuid references auth.users(id) on delete restrict,
  grant_reason text not null,
  revoked_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_role_assignment_dates check (valid_until is null or valid_until > valid_from),
  constraint admin_role_assignment_revocation check (
    (assignment_status <> 'revoked') or (revoked_at is not null)
  )
);

create unique index if not exists admin_role_assignments_one_active_scope
  on public.admin_role_assignments(user_id, role_code, administrative_unit_id)
  where assignment_status = 'active';

create index if not exists admin_role_assignments_user_active
  on public.admin_role_assignments(user_id, valid_from, valid_until)
  where assignment_status = 'active';

create table if not exists public.admin_delegations (
  id uuid primary key default gen_random_uuid(),
  grantor_user_id uuid not null references auth.users(id) on delete restrict,
  grantee_user_id uuid not null references auth.users(id) on delete restrict,
  administrative_unit_id uuid not null references public.boundaries(id) on delete restrict,
  capability text not null check (capability in (
    'leader_read','leader_edit','leader_review','leader_dossier_read',
    'leader_dossier_write','leader_audit_read'
  )),
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  reason text not null,
  delegation_status text not null default 'active'
    check (delegation_status in ('active','revoked','expired')),
  revoked_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint delegation_not_self check (grantor_user_id <> grantee_user_id),
  constraint delegation_dates check (valid_until > valid_from)
);
create index if not exists admin_delegations_grantee_active
  on public.admin_delegations(grantee_user_id, capability, valid_from, valid_until)
  where delegation_status = 'active';

-- ---------------------------------------------------------------------------
-- Person identity and position catalogue are separate from appointments.
-- The catalogue is intentionally empty until official positions are approved.
-- ---------------------------------------------------------------------------
create table if not exists public.leader_people (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(btrim(first_name)) between 1 and 80),
  last_name text not null check (length(btrim(last_name)) between 1 and 100),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  archived_at timestamptz
);

create table if not exists public.leader_person_history (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.leader_people(id) on delete restrict,
  version integer not null,
  first_name text not null,
  last_name text not null,
  changed_by uuid references auth.users(id) on delete restrict,
  change_reason text,
  archived_at timestamptz not null default now(),
  unique (person_id, version)
);
create index if not exists leader_person_history_person
  on public.leader_person_history(person_id, version desc);

create table if not exists public.leader_positions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,79}$'),
  title_kiny text not null check (length(btrim(title_kiny)) between 2 and 160),
  title_eng text not null check (length(btrim(title_eng)) between 2 and 160),
  title_fra text not null check (length(btrim(title_fra)) between 2 and 160),
  required_boundary_level text not null
    check (required_boundary_level in ('country','district','sector','cell','village')),
  is_exclusive boolean not null default true,
  position_status text not null default 'draft'
    check (position_status in ('draft','approved','retired')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leader_position_approval
    check (position_status <> 'approved' or (approved_by is not null and approved_at is not null))
);
create index if not exists leader_positions_status_level
  on public.leader_positions(position_status, required_boundary_level);

-- ---------------------------------------------------------------------------
-- An appointment is one dated office held by a person in one canonical unit.
-- A transfer/new office is a new appointment; the former row remains history.
-- ---------------------------------------------------------------------------
create table if not exists public.leader_appointments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.leader_people(id) on delete restrict,
  position_id uuid not null references public.leader_positions(id) on delete restrict,
  administrative_unit_id uuid not null references public.boundaries(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  appointment_status text not null default 'draft'
    check (appointment_status in ('draft','pending','approved','active','rejected','suspended','ended','archived')),
  exclusive_office boolean not null default true,
  recorded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint leader_appointment_dates check (effective_to is null or effective_to > effective_from)
);
create index if not exists leader_appointments_person_history
  on public.leader_appointments(person_id, effective_from desc);
create index if not exists leader_appointments_unit_status
  on public.leader_appointments(administrative_unit_id, appointment_status, effective_from desc);
create index if not exists leader_appointments_exclusive_scope_status
  on public.leader_appointments(position_id, administrative_unit_id, appointment_status, effective_from, effective_to)
  where exclusive_office is true;

create table if not exists public.leader_verification_cases (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.leader_appointments(id) on delete restrict,
  verification_status text not null default 'pending'
    check (verification_status in ('draft','pending','under_review','approved','rejected','suspended','disputed')),
  submitted_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  assigned_reviewer uuid references auth.users(id) on delete restrict,
  decision_by uuid references auth.users(id) on delete restrict,
  decision_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint leader_verification_decision_fields check (
    verification_status not in ('approved','rejected','suspended','disputed')
    or (decision_by is not null and decision_at is not null and nullif(btrim(decision_reason), '') is not null)
  ),
  constraint leader_verification_not_self_approved check (
    verification_status <> 'approved' or decision_by is distinct from submitted_by
  )
);

create table if not exists public.leader_appointment_evidence (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.leader_appointments(id) on delete restrict,
  verification_case_id uuid not null references public.leader_verification_cases(id) on delete restrict,
  evidence_type text not null check (length(btrim(evidence_type)) between 2 and 80),
  reference_number text not null check (length(btrim(reference_number)) between 1 and 160),
  issuer text not null check (length(btrim(issuer)) between 2 and 200),
  issued_on date,
  valid_until date,
  private_storage_key text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint leader_evidence_dates check (valid_until is null or issued_on is null or valid_until >= issued_on)
);
create index if not exists leader_evidence_case on public.leader_appointment_evidence(verification_case_id);

create table if not exists public.leader_verification_decisions (
  id uuid primary key default gen_random_uuid(),
  verification_case_id uuid not null references public.leader_verification_cases(id) on delete restrict,
  appointment_id uuid not null references public.leader_appointments(id) on delete restrict,
  decision text not null check (decision in ('submitted','under_review','approved','rejected','suspended','disputed','returned')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  reason text,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  created_at timestamptz not null default now()
);
create index if not exists leader_verification_decisions_case
  on public.leader_verification_decisions(verification_case_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Public projection, public/private contacts, and confidential dossier.
-- ---------------------------------------------------------------------------
create table if not exists public.leader_public_profiles (
  appointment_id uuid primary key references public.leader_appointments(id) on delete restrict,
  display_name text,
  biography text,
  office_hours text,
  service_priorities text,
  public_photo_object_key text,
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','unpublished')),
  published_by uuid references auth.users(id) on delete restrict,
  published_at timestamptz,
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leader_public_profile_published
    check (publication_status <> 'published' or (published_by is not null and published_at is not null))
);

create table if not exists public.leader_contacts (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.leader_appointments(id) on delete restrict,
  contact_type text not null check (contact_type in ('office_phone','mobile_phone','email','whatsapp','website','other')),
  contact_value text not null check (length(btrim(contact_value)) between 2 and 240),
  label text,
  visibility text not null default 'private' check (visibility in ('private','public')),
  public_approved_by uuid references auth.users(id) on delete restrict,
  public_approved_at timestamptz,
  sort_order integer not null default 100,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leader_contact_public_approval check (
    visibility <> 'public' or (public_approved_by is not null and public_approved_at is not null)
  )
);
create index if not exists leader_contacts_appointment_visibility
  on public.leader_contacts(appointment_id, visibility, sort_order);

create table if not exists public.leader_dossiers (
  person_id uuid primary key references public.leader_people(id) on delete restrict,
  education_level text,
  field_of_study text,
  institution text,
  internal_notes text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table if not exists public.leader_dossier_documents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.leader_dossiers(person_id) on delete restrict,
  document_type text not null,
  reference_number text,
  private_storage_key text not null unique,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists leader_dossier_documents_person
  on public.leader_dossier_documents(person_id, uploaded_at desc);

-- ---------------------------------------------------------------------------
-- History and append-only audit. Audit stores field names, not contact values.
-- ---------------------------------------------------------------------------
create table if not exists public.leader_appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.leader_appointments(id) on delete restrict,
  event_type text not null check (event_type in ('created','submitted','approved','rejected','suspended','disputed','transferred','ended','archived','corrected')),
  from_status text,
  to_status text,
  before_effective_from date,
  after_effective_from date,
  before_effective_to date,
  after_effective_to date,
  reason text,
  actor_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists leader_appointment_events_history
  on public.leader_appointment_events(appointment_id, created_at desc);

create table if not exists public.leader_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete restrict,
  actor_role text,
  action text not null check (action in ('INSERT','UPDATE','STATE_CHANGE')),
  target_table text not null,
  target_id uuid,
  administrative_unit_id uuid references public.boundaries(id) on delete restrict,
  changed_fields text[] not null default '{}',
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists leader_audit_events_scope_time
  on public.leader_audit_events(administrative_unit_id, created_at desc);
create index if not exists leader_audit_events_target
  on public.leader_audit_events(target_table, target_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Private helpers: SECURITY DEFINER only in the unexposed private schema,
-- with an empty search_path and all relations explicitly schema-qualified.
-- ---------------------------------------------------------------------------
create or replace function private.leader_actor_can(p_action text, p_unit_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target_code text;
  v_target_level text;
  v_target_depth integer;
  v_capability text;
begin
  if v_user is null then return false; end if;

  -- National Super Admin authority is never available from an AAL1 session.
  -- Missing aal claims are treated as AAL1, not as an implicit MFA success.
  if exists (
    select 1 from public.admin_role_assignments a
    where a.user_id = v_user
      and a.role_code = 'national_super_admin'
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
  ) and coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2' then
    return false;
  end if;

  if p_action = 'manage_positions' or (p_action = 'manage_admins' and p_unit_id is null) then
    return exists (
      select 1
      from public.admin_role_assignments a
      join public.boundaries u on u.id = a.administrative_unit_id
      where a.user_id = v_user
        and a.role_code = 'national_super_admin'
        and a.assignment_status = 'active'
        and a.valid_from <= now()
        and (a.valid_until is null or a.valid_until > now())
        and u.level::text = 'country'
        and u.scope_code = 'RW'
        and u.valid_to is null
    );
  end if;

  if p_action = 'create_person' then
    return exists (
      select 1 from public.admin_role_assignments a
      where a.user_id = v_user
        and a.assignment_status = 'active'
        and a.valid_from <= now()
        and (a.valid_until is null or a.valid_until > now())
    );
  end if;

  if p_unit_id is null then return false; end if;

  select b.scope_code, b.level::text,
    case b.level::text
      when 'country' then 0 when 'province' then 1 when 'district' then 2
      when 'sector' then 3 when 'cell' then 4 when 'village' then 5 else 99 end
  into v_target_code, v_target_level, v_target_depth
  from public.boundaries b
  where b.id = p_unit_id and b.valid_to is null;

  if v_target_code is null then return false; end if;

  if p_action = 'manage_admins' then
    return exists (
      select 1
      from public.admin_role_assignments a
      join public.boundaries au on au.id = a.administrative_unit_id
      where a.user_id = v_user
        and a.assignment_status = 'active'
        and a.valid_from <= now()
        and (a.valid_until is null or a.valid_until > now())
        and (v_target_code = au.scope_code or v_target_code like au.scope_code || '-%')
        and (
          a.role_code = 'national_super_admin'
          or (a.role_code = 'district_admin' and v_target_level = 'sector')
          or (a.role_code = 'sector_admin' and v_target_level = 'cell')
        )
    );
  end if;

  if p_action = 'approve' then v_capability := 'leader_review';
  elsif p_action = 'edit' then v_capability := 'leader_edit';
  elsif p_action = 'read' then v_capability := 'leader_read';
  elsif p_action = 'view_dossier' then v_capability := 'leader_dossier_read';
  elsif p_action = 'edit_dossier' then v_capability := 'leader_dossier_write';
  elsif p_action = 'audit' then v_capability := 'leader_audit_read';
  else return false;
  end if;

  if exists (
    select 1
    from public.admin_role_assignments a
    join public.boundaries au on au.id = a.administrative_unit_id
    where a.user_id = v_user
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
      and (
        a.role_code = 'national_super_admin'
        or (
          v_target_code = au.scope_code or v_target_code like au.scope_code || '-%'
        )
      )
      and (
        a.role_code = 'national_super_admin'
        or (
          case au.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
          <= v_target_depth
          and (
            p_action <> 'approve'
            or case au.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
               < v_target_depth
          )
        )
      )
      and (
        p_action <> 'view_dossier' and p_action <> 'edit_dossier'
        or a.role_code in ('national_super_admin','district_admin')
      )
      and (
        p_action <> 'audit'
        or a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin')
      )
  ) then
    return true;
  end if;

  -- Delegation is explicit, scoped, time-bounded and only applies to a user
  -- who still has an active base assignment.
  return exists (
    select 1
    from public.admin_delegations d
    join public.boundaries du on du.id = d.administrative_unit_id
    join public.admin_role_assignments base_role on base_role.user_id = d.grantee_user_id
    join public.admin_role_assignments grantor_role on grantor_role.user_id = d.grantor_user_id
    join public.boundaries grantor_unit on grantor_unit.id = grantor_role.administrative_unit_id
    where d.grantee_user_id = v_user
      and d.capability = v_capability
      and d.delegation_status = 'active'
      and d.valid_from <= now() and d.valid_until > now()
      and base_role.assignment_status = 'active'
      and base_role.valid_from <= now()
      and (base_role.valid_until is null or base_role.valid_until > now())
      and grantor_role.assignment_status = 'active'
      and grantor_role.valid_from <= now()
      and (grantor_role.valid_until is null or grantor_role.valid_until > now())
      and (v_target_code = du.scope_code or v_target_code like du.scope_code || '-%')
      and (du.scope_code = grantor_unit.scope_code or du.scope_code like grantor_unit.scope_code || '-%')
      and (
        grantor_role.role_code = 'national_super_admin'
        or (
          case grantor_unit.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
          <= case du.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 when 'village' then 5 else 99 end
          and (
            d.capability <> 'leader_review'
            or case grantor_unit.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
               < case du.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 when 'village' then 5 else 99 end
          )
          and (
            d.capability not in ('leader_dossier_read','leader_dossier_write')
            or grantor_role.role_code = 'district_admin'
          )
        )
      )
  );
end;
$$;

create or replace function private.leader_actor_can_direct(
  p_actor uuid, p_action text, p_unit_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $direct$
declare
  v_target_code text;
  v_target_level text;
  v_target_depth integer;
begin
  if p_actor is null or p_unit_id is null or p_actor is distinct from auth.uid() then
    return false;
  end if;

  -- Delegation grants must also be made by the currently authenticated
  -- National Super Admin at AAL2, never by a supplied actor id alone.
  if exists (
    select 1 from public.admin_role_assignments a
    where a.user_id = p_actor
      and a.role_code = 'national_super_admin'
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
  ) and coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2' then
    return false;
  end if;

  select b.scope_code, b.level::text,
    case b.level::text
      when 'country' then 0 when 'province' then 1 when 'district' then 2
      when 'sector' then 3 when 'cell' then 4 when 'village' then 5 else 99 end
  into v_target_code, v_target_level, v_target_depth
  from public.boundaries b
  where b.id = p_unit_id and b.valid_to is null;
  if v_target_code is null then return false; end if;

  return exists (
    select 1
    from public.admin_role_assignments a
    join public.boundaries au on au.id = a.administrative_unit_id
    where a.user_id = p_actor
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
      and (
        a.role_code = 'national_super_admin'
        or (v_target_code = au.scope_code or v_target_code like au.scope_code || '-%')
      )
      and (
        a.role_code = 'national_super_admin'
        or case au.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
           <= v_target_depth
      )
      and (
        p_action <> 'approve'
        or a.role_code = 'national_super_admin'
        or case au.level::text when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 99 end
           < v_target_depth
      )
      and (
        p_action not in ('view_dossier','edit_dossier')
        or a.role_code in ('national_super_admin','district_admin')
      )
      and (
        p_action <> 'audit'
        or a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin')
      )
      and (
        (p_action = 'read' and a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin'))
        or (p_action = 'edit' and a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin'))
        or (p_action = 'approve' and a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin'))
        or (p_action in ('view_dossier','edit_dossier') and a.role_code in ('national_super_admin','district_admin'))
        or (p_action = 'audit' and a.role_code in ('national_super_admin','district_admin','sector_admin','cell_admin'))
      )
  );
end;
$direct$;

revoke all on function private.leader_actor_can_direct(uuid,text,uuid) from public, anon, authenticated;

create or replace function private.leader_appointment_is_public(p_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.leader_appointments a
    join public.leader_verification_cases v on v.appointment_id = a.id
    join public.leader_public_profiles p on p.appointment_id = a.id
    join public.leader_positions pos on pos.id = a.position_id
    join public.boundaries b on b.id = a.administrative_unit_id
    where a.id = p_appointment_id
      and a.appointment_status in ('approved','active')
      and a.effective_from <= current_date
      and (a.effective_to is null or a.effective_to > current_date)
      and v.verification_status = 'approved'
      and p.publication_status = 'published'
      and pos.position_status = 'approved'
      and b.valid_to is null
  );
$$;

create or replace function private.leader_person_is_public(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.leader_appointments a
    where a.person_id = p_person_id
      and private.leader_appointment_is_public(a.id)
  );
$$;

revoke all on function private.leader_actor_can(text,uuid) from public;
revoke all on function private.leader_appointment_is_public(uuid) from public;
revoke all on function private.leader_person_is_public(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.leader_actor_can(text,uuid) to authenticated;
grant execute on function private.leader_appointment_is_public(uuid) to anon, authenticated;
grant execute on function private.leader_person_is_public(uuid) to anon, authenticated;

-- National Super Admin requires an AAL2 session. This check runs as the
-- function owner so the role lookup remains reliable under RLS on assignments.
create or replace function private.leader_actor_requires_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.admin_role_assignments a
    where a.user_id = auth.uid()
      and a.role_code = 'national_super_admin'
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
  );
$;
revoke all on function private.leader_actor_requires_mfa() from public, anon, authenticated;
grant execute on function private.leader_actor_requires_mfa() to authenticated;

-- ---------------------------------------------------------------------------
-- Data integrity and state guards.
-- ---------------------------------------------------------------------------
-- Delegation metadata is immutable after issue; a grantor may only revoke it.
create or replace function private.guard_admin_delegation()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if tg_op = 'DELETE' then raise exception 'Delegations are revoked, not deleted'; end if;
  if tg_op = 'INSERT' then
    if new.grantor_user_id is distinct from auth.uid() then
      raise exception 'Delegation grantor must be the authenticated actor';
    end if;
    if new.delegation_status <> 'active' then
      raise exception 'A new delegation must begin active';
    end if;
    if not private.leader_actor_can_direct(
      new.grantor_user_id,
      case new.capability
        when 'leader_read' then 'read'
        when 'leader_edit' then 'edit'
        when 'leader_review' then 'approve'
        when 'leader_dossier_read' then 'view_dossier'
        when 'leader_dossier_write' then 'edit_dossier'
        when 'leader_audit_read' then 'audit'
        else 'invalid'
      end,
      new.administrative_unit_id
    ) then
      raise exception 'Grantor cannot delegate a capability they do not hold';
    end if;
  else
    if new.id is distinct from old.id
       or new.grantor_user_id is distinct from old.grantor_user_id
       or new.grantee_user_id is distinct from old.grantee_user_id
       or new.administrative_unit_id is distinct from old.administrative_unit_id
       or new.capability is distinct from old.capability
       or new.valid_from is distinct from old.valid_from
       or new.valid_until is distinct from old.valid_until
       or new.reason is distinct from old.reason
       or new.created_at is distinct from old.created_at then
      raise exception 'Delegation scope and capability are immutable; revoke and issue a new delegation';
    end if;
    if old.delegation_status = 'revoked' and new.delegation_status <> 'revoked' then
      raise exception 'Revoked delegations cannot be reactivated; issue a new delegation';
    elsif new.delegation_status = 'revoked' and old.delegation_status <> 'revoked' then
      new.revoked_by := auth.uid();
      new.revoked_at := now();
    elsif new.revoked_by is distinct from old.revoked_by or new.revoked_at is distinct from old.revoked_at then
      raise exception 'Delegation revocation metadata is system-attributed';
    end if;
  end if;
  return new;
end $fn$;
drop trigger if exists admin_delegation_guard on public.admin_delegations;
create trigger admin_delegation_guard before insert or update or delete on public.admin_delegations
for each row execute function private.guard_admin_delegation();

create or replace function private.guard_leader_position()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_old_status text;
begin
  if tg_op = 'UPDATE' then v_old_status := old.position_status; end if;
  if tg_op = 'DELETE' then raise exception 'Position catalogue entries are retired, not deleted'; end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    if new.created_by is null then raise exception 'Position creator is required'; end if;
    new.approved_by := null;
    new.approved_at := null;
  else
    if new.id is distinct from old.id or new.code is distinct from old.code
       or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
      raise exception 'Position identity is immutable';
    end if;
    if new.position_status is not distinct from old.position_status
       and (new.approved_by is distinct from old.approved_by
         or new.approved_at is distinct from old.approved_at) then
      raise exception 'Position approval metadata is system-attributed';
    end if;
    if old.position_status = 'approved' and (
      new.code is distinct from old.code
      or new.title_kiny is distinct from old.title_kiny
      or new.title_eng is distinct from old.title_eng
      or new.title_fra is distinct from old.title_fra
      or new.required_boundary_level is distinct from old.required_boundary_level
      or new.is_exclusive is distinct from old.is_exclusive
    ) then
      raise exception 'Approved position identity/title/scope is immutable; retire and create a new position version';
    end if;
  end if;
  if new.position_status = 'approved' and v_old_status is distinct from 'approved' then
    if v_old_status = 'retired' then
      raise exception 'Retired position codes cannot be re-approved; create a new version';
    end if;
    if not private.leader_actor_can('manage_positions', null) then
      raise exception 'Only National Super Admin may approve a position catalogue entry';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  new.updated_at := now();
  return new;
end $fn$;
drop trigger if exists leader_position_guard on public.leader_positions;
create trigger leader_position_guard before insert or update or delete on public.leader_positions
for each row execute function private.guard_leader_position();

create or replace function private.guard_leader_evidence()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_case_appointment uuid;
begin
  if tg_op <> 'INSERT' then raise exception 'Appointment evidence is immutable; add a corrected evidence version'; end if;
  select c.appointment_id into v_case_appointment
  from public.leader_verification_cases c where c.id = new.verification_case_id;
  if v_case_appointment is null or v_case_appointment <> new.appointment_id then
    raise exception 'Evidence must reference the same appointment as its verification case';
  end if;
  new.uploaded_by := coalesce(auth.uid(), new.uploaded_by);
  return new;
end $fn$;
drop trigger if exists leader_evidence_guard on public.leader_appointment_evidence;
create trigger leader_evidence_guard before insert or update or delete on public.leader_appointment_evidence
for each row execute function private.guard_leader_evidence();

create or replace function private.guard_leader_person()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if tg_op = 'DELETE' then raise exception 'Leader identity records are archived, not deleted'; end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.version := 1;
  else
    if new.id is distinct from old.id or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Leader identity origin is immutable';
    end if;
    new.version := old.version + 1;
    new.updated_at := now();
  end if;
  return new;
end $fn$;
drop trigger if exists leader_person_guard on public.leader_people;
create trigger leader_person_guard before insert or update or delete on public.leader_people
for each row execute function private.guard_leader_person();

-- Preserve the previous identity version before every identity/archive change.
create or replace function private.capture_leader_person_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $history$
begin
  if new.first_name is distinct from old.first_name
     or new.last_name is distinct from old.last_name
     or new.archived_at is distinct from old.archived_at then
    insert into public.leader_person_history(
      person_id, version, first_name, last_name, changed_by, change_reason
    ) values (
      old.id, old.version, old.first_name, old.last_name, auth.uid(),
      nullif(current_setting('app.leader_change_reason', true), '')
    );
  end if;
  return new;
end
$history$;
drop trigger if exists leader_person_history_capture on public.leader_people;
create trigger leader_person_history_capture
after update on public.leader_people
for each row execute function private.capture_leader_person_history();

create or replace function private.validate_admin_role_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_level text;
begin
  select b.level::text into v_level
  from public.boundaries b
  where b.id = new.administrative_unit_id and b.valid_to is null;
  if v_level is null then raise exception 'Administrative unit is not current'; end if;
  if (new.role_code = 'national_super_admin' and (v_level <> 'country' or
      (select b.scope_code from public.boundaries b where b.id = new.administrative_unit_id) <> 'RW')
      or new.role_code = 'district_admin' and v_level <> 'district'
      or new.role_code = 'sector_admin' and v_level <> 'sector'
      or new.role_code = 'cell_admin' and v_level <> 'cell') then
    raise exception 'Role code does not match the canonical administrative unit level';
  end if;
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.granted_by := auth.uid(); end if;
    if auth.uid() is not null and not private.leader_actor_can('manage_admins', new.administrative_unit_id) then
      raise exception 'Administrator does not have authority to assign this role at this scope';
    end if;
  else
    if new.user_id is distinct from old.user_id
       or new.role_code is distinct from old.role_code
       or new.administrative_unit_id is distinct from old.administrative_unit_id
       or new.granted_by is distinct from old.granted_by
       or new.grant_reason is distinct from old.grant_reason
       or new.valid_from is distinct from old.valid_from then
      raise exception 'Role assignment identity is immutable; revoke and issue a new assignment';
    end if;
    if old.assignment_status = 'revoked' and new.assignment_status <> 'revoked' then
      raise exception 'Revoked administrator assignments cannot be reactivated; issue a new assignment';
    elsif new.assignment_status = 'revoked' and old.assignment_status <> 'revoked' then
      new.revoked_by := auth.uid();
      new.revoked_at := now();
    elsif new.revoked_by is distinct from old.revoked_by or new.revoked_at is distinct from old.revoked_at then
      raise exception 'Revocation metadata is system-attributed';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists admin_role_assignment_validate on public.admin_role_assignments;
create trigger admin_role_assignment_validate before insert or update on public.admin_role_assignments
for each row execute function private.validate_admin_role_assignment();

create or replace function private.guard_leader_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_required_level text; v_exclusive boolean; v_verification text;
begin
  if tg_op = 'DELETE' then
    raise exception 'Leader appointments are archival records and cannot be deleted';
  end if;

  select pos.required_boundary_level, pos.is_exclusive
  into v_required_level, v_exclusive
  from public.leader_positions pos
  where pos.id = new.position_id
    and (pos.position_status = 'approved' or tg_op = 'UPDATE');
  if v_required_level is null then
    raise exception 'Only an approved position can be assigned';
  end if;
  if not exists (
    select 1 from public.boundaries b
    where b.id = new.administrative_unit_id
      and b.level::text = v_required_level
      and b.valid_to is null
  ) then
    raise exception 'Position does not match the selected canonical administrative unit';
  end if;
  new.exclusive_office := v_exclusive;

  if tg_op = 'INSERT' then
    if new.appointment_status not in ('draft','pending') or new.effective_to is not null then
      raise exception 'New appointments must begin as draft or pending with no end date';
    end if;
    new.recorded_by := coalesce(auth.uid(), new.recorded_by);
    if new.recorded_by is null then raise exception 'Appointment creator is required'; end if;
    new.version := 1;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.person_id is distinct from old.person_id
     or new.position_id is distinct from old.position_id
     or new.administrative_unit_id is distinct from old.administrative_unit_id
     or new.effective_from is distinct from old.effective_from
     or (new.effective_to is distinct from old.effective_to
         and not (old.effective_to is null and new.effective_to is not null
                  and new.appointment_status = 'ended'))
     or new.recorded_by is distinct from old.recorded_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Appointment identity/dates are immutable; create a new versioned appointment for a correction or transfer';
  end if;
  if old.appointment_status = 'archived' and new.appointment_status <> 'archived' then
    raise exception 'Archived appointments cannot be reopened';
  end if;
  if old.appointment_status in ('ended','archived')
     and (new.person_id is distinct from old.person_id
       or new.position_id is distinct from old.position_id
       or new.administrative_unit_id is distinct from old.administrative_unit_id
       or new.effective_from is distinct from old.effective_from
       or new.effective_to is distinct from old.effective_to) then
    raise exception 'Ended or archived appointment facts are immutable';
  end if;
  if new.appointment_status is distinct from old.appointment_status and not (
       (old.appointment_status = 'draft' and new.appointment_status = 'pending')
       or (old.appointment_status in ('pending','approved','active','suspended') and new.appointment_status = 'ended')
       or (old.appointment_status in ('ended','rejected') and new.appointment_status = 'archived')
       or (old.appointment_status in ('pending','rejected','suspended') and new.appointment_status in ('pending','approved','active','rejected','suspended'))
       or (old.appointment_status in ('approved','active') and new.appointment_status in ('approved','active','suspended'))
     ) then
    raise exception 'Invalid appointment state transition';
  end if;

  select v.verification_status into v_verification
  from public.leader_verification_cases v
  where v.appointment_id = new.id;

  if new.appointment_status in ('approved','active')
     and v_verification is distinct from 'approved' then
    raise exception 'An appointment cannot become public/active before verification approval';
  end if;
  if new.appointment_status = 'suspended'
     and v_verification not in ('suspended','disputed') then
    raise exception 'Suspended appointments require a suspended or disputed verification case';
  end if;
  if new.appointment_status = 'rejected' and v_verification is distinct from 'rejected' then
    raise exception 'Rejected appointments require a rejected verification case';
  end if;
  if new.appointment_status = 'ended' and (
       new.effective_to is null or new.effective_to > current_date
       or nullif(btrim(current_setting('app.leader_change_reason', true)), '') is null
     ) then
    raise exception 'Ending an appointment requires a past/current effective end date and a recorded reason';
  end if;
  if new.appointment_status = 'archived'
     and nullif(btrim(current_setting('app.leader_change_reason', true)), '') is null then
    raise exception 'Archiving an appointment requires a recorded reason';
  end if;
  if new.exclusive_office is true and new.appointment_status in ('approved','active','suspended') then
    perform pg_advisory_xact_lock(hashtextextended(new.position_id::text || ':' || new.administrative_unit_id::text, 0));
    if exists (
      select 1 from public.leader_appointments other
      where other.position_id = new.position_id
        and other.administrative_unit_id = new.administrative_unit_id
        and other.exclusive_office is true
        and other.appointment_status in ('approved','active','suspended')
        and other.id <> new.id
        and daterange(other.effective_from, other.effective_to, '[)')
            && daterange(new.effective_from, new.effective_to, '[)')
    ) then
      raise exception 'An overlapping approved appointment already holds this exclusive office in this area';
    end if;
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists leader_appointment_guard on public.leader_appointments;
create trigger leader_appointment_guard before insert or update or delete on public.leader_appointments
for each row execute function private.guard_leader_appointment();

create or replace function private.guard_verification_case()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_unit uuid; v_evidence_count integer;
begin
  select a.administrative_unit_id into v_unit
  from public.leader_appointments a where a.id = new.appointment_id;
  if v_unit is null then raise exception 'Appointment not found'; end if;

  if tg_op = 'INSERT' then
    if new.verification_status not in ('draft','pending') then
      raise exception 'Verification starts as draft or pending';
    end if;
    new.submitted_by := coalesce(auth.uid(), new.submitted_by);
    if new.submitted_by is null then raise exception 'Submitter is required'; end if;
    new.version := 1;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.appointment_id is distinct from old.appointment_id
     or new.submitted_by is distinct from old.submitted_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Verification case identity is immutable';
  end if;

  if new.verification_status is not distinct from old.verification_status
     and (new.decision_by is distinct from old.decision_by
       or new.decision_at is distinct from old.decision_at
       or new.decision_reason is distinct from old.decision_reason) then
    raise exception 'Decision metadata is immutable unless a new workflow decision is recorded';
  end if;

  if new.verification_status is distinct from old.verification_status then
    if not (
      (old.verification_status = 'draft' and new.verification_status = 'pending')
      or (old.verification_status = 'pending' and new.verification_status = 'under_review')
      or (old.verification_status = 'under_review' and new.verification_status in ('approved','rejected','suspended','disputed'))
      or (old.verification_status = 'rejected' and new.verification_status = 'pending')
      or (old.verification_status in ('suspended','disputed') and new.verification_status = 'under_review')
      or (old.verification_status = 'approved' and new.verification_status in ('suspended','disputed'))
    ) then
      raise exception 'Invalid verification state transition';
    end if;

    if new.verification_status in ('pending','under_review') then
      new.decision_by := null;
      new.decision_at := null;
      new.decision_reason := null;
      new.assigned_reviewer := null;
    end if;

    if new.verification_status = 'under_review' then
      if not private.leader_actor_can('approve', v_unit)
         or auth.uid() is not distinct from old.submitted_by then
        raise exception 'Only a higher-scope reviewer other than the submitter may begin review';
      end if;
      new.assigned_reviewer := auth.uid();
    elsif new.verification_status in ('approved','rejected','suspended','disputed') then
      if not private.leader_actor_can('approve', v_unit)
         or auth.uid() is not distinct from old.submitted_by then
        raise exception 'Only a higher-scope reviewer other than the submitter may decide this case';
      end if;
      if nullif(btrim(new.decision_reason), '') is null then
        raise exception 'A decision reason is required';
      end if;
      if new.verification_status = 'approved' then
        select count(*) into v_evidence_count
        from public.leader_appointment_evidence e
        where e.verification_case_id = new.id and e.appointment_id = new.appointment_id;
        if v_evidence_count = 0 then raise exception 'Approval requires at least one evidence record'; end if;
      end if;
      new.decision_by := auth.uid();
      new.decision_at := now();
    end if;
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $fn$;
drop trigger if exists leader_verification_case_guard on public.leader_verification_cases;
create trigger leader_verification_case_guard before insert or update on public.leader_verification_cases
for each row execute function private.guard_verification_case();

create or replace function private.sync_appointment_from_verification()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_status text;
begin
  if tg_op = 'INSERT' then
    v_status := case when new.verification_status = 'pending' then 'pending' else 'draft' end;
    update public.leader_appointments
    set appointment_status = v_status, updated_at = now(), updated_by = auth.uid()
    where id = new.appointment_id
      and appointment_status not in ('ended','archived');

    insert into public.leader_verification_decisions(
      verification_case_id, appointment_id, decision, actor_id, reason, evidence_count
    ) values (
      new.id, new.appointment_id, 'submitted',
      coalesce(auth.uid(), new.submitted_by), null,
      (select count(*) from public.leader_appointment_evidence e where e.verification_case_id = new.id)
    );
  elsif new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'approved' then
      select case
        when a.effective_from <= current_date and (a.effective_to is null or a.effective_to > current_date) then 'active'
        else 'approved'
      end into v_status
      from public.leader_appointments a where a.id = new.appointment_id;
    elsif new.verification_status in ('suspended','disputed') then v_status := 'suspended';
    elsif new.verification_status = 'rejected' then v_status := 'rejected';
    else v_status := 'pending';
    end if;

    update public.leader_appointments
    set appointment_status = v_status, updated_at = now(), updated_by = auth.uid()
    where id = new.appointment_id
      and appointment_status not in ('ended','archived');
    
    insert into public.leader_verification_decisions(
      verification_case_id, appointment_id, decision, actor_id, reason, evidence_count
    )
    select new.id, new.appointment_id,
      case new.verification_status
        when 'approved' then 'approved'
        when 'rejected' then 'rejected'
        when 'suspended' then 'suspended'
        when 'disputed' then 'disputed'
        when 'under_review' then 'under_review'
        else 'returned'
      end,
      coalesce(auth.uid(), new.decision_by, new.submitted_by),
      new.decision_reason,
      (select count(*) from public.leader_appointment_evidence e where e.verification_case_id = new.id);
  end if;
  return new;
end $fn$;
drop trigger if exists leader_verification_sync_appointment on public.leader_verification_cases;
create trigger leader_verification_sync_appointment after insert or update on public.leader_verification_cases
for each row execute function private.sync_appointment_from_verification();

create or replace function private.guard_public_profile()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_unit uuid; v_old_status text;
begin
  if tg_op = 'UPDATE' then v_old_status := old.publication_status; end if;
  if tg_op = 'DELETE' then raise exception 'Public profiles are archived/unpublished, not deleted'; end if;
  if tg_op = 'UPDATE' and new.appointment_id is distinct from old.appointment_id then
    raise exception 'Public profile appointment is immutable';
  end if;
  select a.administrative_unit_id into v_unit
  from public.leader_appointments a where a.id = new.appointment_id;
  if tg_op = 'UPDATE' and (
       (new.published_by is distinct from old.published_by and new.publication_status is not distinct from old.publication_status)
       or (new.published_at is distinct from old.published_at and new.publication_status is not distinct from old.publication_status)
     ) then
    raise exception 'Publication metadata is system-attributed';
  end if;
  if tg_op = 'UPDATE' and old.publication_status = 'published'
     and (new.display_name is distinct from old.display_name
       or new.biography is distinct from old.biography
       or new.office_hours is distinct from old.office_hours
       or new.service_priorities is distinct from old.service_priorities
       or new.public_photo_object_key is distinct from old.public_photo_object_key) then
    new.publication_status := 'draft';
    new.published_by := null;
    new.published_at := null;
  end if;
  if new.publication_status = 'published'
     and v_old_status is distinct from 'published' then
    if not private.leader_actor_can('approve', v_unit)
       or not exists (
         select 1 from public.leader_appointments a
         join public.leader_verification_cases v on v.appointment_id = a.id
         join public.leader_positions pos on pos.id = a.position_id
         join public.boundaries b on b.id = a.administrative_unit_id
         where a.id = new.appointment_id
           and a.appointment_status in ('approved','active')
           and a.effective_from <= current_date
           and (a.effective_to is null or a.effective_to > current_date)
           and v.verification_status = 'approved'
           and pos.position_status = 'approved'
           and b.valid_to is null
       ) then
      raise exception 'Publishing requires an approved current appointment and authorised publisher';
    end if;
    new.published_by := auth.uid();
    new.published_at := now();
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $fn$;
drop trigger if exists leader_public_profile_guard on public.leader_public_profiles;
create trigger leader_public_profile_guard before insert or update or delete on public.leader_public_profiles
for each row execute function private.guard_public_profile();

create or replace function private.guard_leader_contact()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare
  v_unit uuid;
  v_old_visibility text;
  v_old_value text;
  v_old_type text;
  v_old_label text;
begin
  if tg_op = 'UPDATE' then
    v_old_visibility := old.visibility;
    v_old_value := old.contact_value;
    v_old_type := old.contact_type;
    v_old_label := old.label;
  end if;
  if tg_op = 'DELETE' then raise exception 'Contacts are archived/retired, not deleted'; end if;
  select a.administrative_unit_id into v_unit from public.leader_appointments a where a.id = new.appointment_id;
  if tg_op = 'UPDATE' and new.appointment_id is distinct from old.appointment_id then
    raise exception 'Contact appointment is immutable';
  end if;
  if tg_op = 'UPDATE' and (
      new.public_approved_by is distinct from old.public_approved_by
      or new.public_approved_at is distinct from old.public_approved_at
    ) then
    raise exception 'Public contact approval metadata is system-attributed';
  end if;
  -- Every public-facing field is part of the approval decision. A same-scope
  -- editor may correct a private contact, but cannot silently rewrite the
  -- label/type/value of an already-published contact and retain old approval.
  if new.visibility = 'public' and (v_old_visibility is distinct from 'public'
      or new.contact_value is distinct from v_old_value
      or new.contact_type is distinct from v_old_type
      or new.label is distinct from v_old_label) then
    if not private.leader_actor_can('approve', v_unit)
       or not private.leader_appointment_is_public(new.appointment_id) then
      raise exception 'Public contact requires an authorised approver and a published appointment';
    end if;
    new.public_approved_by := auth.uid();
    new.public_approved_at := now();
  elsif new.visibility = 'private' then
    new.public_approved_by := null;
    new.public_approved_at := null;
  end if;
  new.updated_at := now();
  return new;
end $fn$;
drop trigger if exists leader_contact_guard on public.leader_contacts;
create trigger leader_contact_guard before insert or update or delete on public.leader_contacts
for each row execute function private.guard_leader_contact();

-- Confidential dossier edits are versioned, scoped and archived rather than deleted.
create or replace function private.guard_leader_dossier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $dossier$
begin
  if tg_op = 'DELETE' then
    raise exception 'Confidential dossiers are retained and archived, not deleted';
  elsif tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'Authenticated administrator is required' using errcode = '42501';
    end if;
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.version := 1;
    new.created_at := now();
    new.updated_at := now();
  else
    if new.person_id is distinct from old.person_id
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Dossier identity and origin are immutable';
    end if;
    if auth.uid() is null then
      raise exception 'Authenticated administrator is required' using errcode = '42501';
    end if;
    new.version := old.version + 1;
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end
$dossier$;
drop trigger if exists leader_dossier_guard on public.leader_dossiers;
create trigger leader_dossier_guard
before insert or update or delete on public.leader_dossiers
for each row execute function private.guard_leader_dossier();

-- Append-only, value-minimised audit. No phone, email, dossier text, file path or secrets.
create or replace function private.capture_leader_audit_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_actor uuid;
  v_target uuid;
  v_unit uuid;
  v_person uuid;
  v_role text;
  v_fields text[] := '{}';
  v_key text;
  v_action text;
begin
  if tg_op = 'DELETE' then raise exception 'Leader registry records cannot be hard deleted'; end if;
  v_new := to_jsonb(new);
  if tg_op = 'UPDATE' then v_old := to_jsonb(old); end if;
  v_actor := coalesce(auth.uid(), nullif(v_new->>'created_by','')::uuid,
    nullif(v_new->>'recorded_by','')::uuid, nullif(v_new->>'submitted_by','')::uuid);
  v_target := coalesce(nullif(v_new->>'id','')::uuid,
    nullif(v_new->>'appointment_id','')::uuid, nullif(v_new->>'person_id','')::uuid);
  v_unit := nullif(v_new->>'administrative_unit_id','')::uuid;
  if v_unit is null and v_new ? 'appointment_id' then
    select a.administrative_unit_id into v_unit from public.leader_appointments a
    where a.id = nullif(v_new->>'appointment_id','')::uuid;
  end if;
  if v_unit is null then
    v_person := case
      when tg_table_name = 'leader_people' then nullif(v_new->>'id','')::uuid
      else nullif(v_new->>'person_id','')::uuid
    end;
    if v_person is not null then
      select a.administrative_unit_id into v_unit
      from public.leader_appointments a
      where a.person_id = v_person
        and a.appointment_status not in ('ended','archived')
      order by a.effective_from desc, a.created_at desc
      limit 1;
    end if;
  end if;
  if tg_op = 'INSERT' then
    select array_agg(keys.field order by keys.field) into v_fields from jsonb_object_keys(v_new) as keys(field);
    v_action := 'INSERT';
  else
    for v_key in select keys.field from jsonb_object_keys(v_new) as keys(field) loop
      if v_new->v_key is distinct from v_old->v_key
        and v_key not in ('updated_at','version','contact_value','private_storage_key','internal_notes','education_level','institution','field_of_study') then
        v_fields := array_append(v_fields, v_key);
      end if;
    end loop;
    v_action := case when 'appointment_status' = any(v_fields) or 'verification_status' = any(v_fields)
      or 'publication_status' = any(v_fields) then 'STATE_CHANGE' else 'UPDATE' end;
  end if;
  select a.role_code into v_role from public.admin_role_assignments a
    where a.user_id = v_actor and a.assignment_status = 'active'
      and a.valid_from <= now() and (a.valid_until is null or a.valid_until > now())
    order by case a.role_code when 'national_super_admin' then 0 when 'district_admin' then 1 when 'sector_admin' then 2 else 3 end
    limit 1;
  insert into public.leader_audit_events(
    actor_id, actor_role, action, target_table, target_id,
    administrative_unit_id, changed_fields, reason
  ) values (
    v_actor, v_role, v_action, tg_table_name, v_target, v_unit, coalesce(v_fields,'{}'),
    nullif(current_setting('app.leader_change_reason', true), '')
  );
  return new;
end $$;

create or replace function private.capture_appointment_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_event text;
begin
  if tg_op = 'INSERT' then
    v_event := case when new.appointment_status = 'pending' then 'submitted' else 'created' end;
    insert into public.leader_appointment_events(appointment_id,event_type,to_status,actor_id)
    values(new.id,v_event,new.appointment_status,coalesce(auth.uid(),new.recorded_by));
  elsif new.appointment_status is distinct from old.appointment_status then
    v_event := case new.appointment_status
      when 'approved' then 'approved' when 'active' then 'approved'
      when 'rejected' then 'rejected' when 'suspended' then 'suspended'
      when 'ended' then 'ended' when 'archived' then 'archived'
      else 'corrected' end;
    insert into public.leader_appointment_events(
      appointment_id,event_type,from_status,to_status,
      before_effective_from,after_effective_from,before_effective_to,after_effective_to,
      reason,actor_id
    ) values(
      new.id,v_event,old.appointment_status,new.appointment_status,
      old.effective_from,new.effective_from,old.effective_to,new.effective_to,
      nullif(current_setting('app.leader_change_reason', true), ''),
      coalesce(auth.uid(),new.updated_by)
    );
  end if;
  return new;
end $$;
drop trigger if exists leader_appointment_history_event on public.leader_appointments;
create trigger leader_appointment_history_event after insert or update on public.leader_appointments
for each row execute function private.capture_appointment_event();

-- Capture all registry actions using only changed field names, never field values.
do $$
declare t text;
begin
  foreach t in array array[
    'admin_role_assignments','admin_delegations','leader_people','leader_positions',
    'leader_appointments','leader_verification_cases','leader_appointment_evidence',
    'leader_verification_decisions','leader_public_profiles','leader_contacts',
    'leader_dossiers','leader_dossier_documents'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit_event', t);
    execute format('create trigger %I after insert or update on public.%I for each row execute function private.capture_leader_audit_event()', t || '_audit_event', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Backfill only the existing country Super Admin. Province-scoped legacy
-- profiles intentionally do not become a new account tier.
-- ---------------------------------------------------------------------------
insert into public.admin_role_assignments(
  user_id, role_code, administrative_unit_id, assignment_status,
  valid_from, grant_reason
)
select ap.user_id, 'national_super_admin', b.id, 'active', now(),
       'Migration bootstrap from existing country-scoped Super Admin profile'
from public.admin_profiles ap
join public.boundaries b on b.scope_code = ap.scope_code
where ap.is_super_admin is true
  and ap.scope_code = 'RW'
  and b.level::text = 'country'
  and b.valid_to is null
  and not exists (
    select 1 from public.admin_role_assignments a
    where a.user_id = ap.user_id
      and a.role_code = 'national_super_admin'
      and a.administrative_unit_id = b.id
      and a.assignment_status = 'active'
  );

-- ---------------------------------------------------------------------------
-- RLS and least-privilege grants.
-- ---------------------------------------------------------------------------
alter table public.admin_role_assignments enable row level security;
alter table public.admin_delegations enable row level security;
alter table public.leader_people enable row level security;
alter table public.leader_person_history enable row level security;
alter table public.leader_positions enable row level security;
alter table public.leader_appointments enable row level security;
alter table public.leader_verification_cases enable row level security;
alter table public.leader_appointment_evidence enable row level security;
alter table public.leader_verification_decisions enable row level security;
alter table public.leader_public_profiles enable row level security;
alter table public.leader_contacts enable row level security;
alter table public.leader_dossiers enable row level security;
alter table public.leader_dossier_documents enable row level security;
alter table public.leader_appointment_events enable row level security;
alter table public.leader_audit_events enable row level security;

-- Start from zero client grants on every new table.
revoke all on table
  public.admin_role_assignments, public.admin_delegations,
  public.leader_people, public.leader_person_history, public.leader_positions,
  public.leader_verification_cases, public.leader_appointment_evidence,
  public.leader_verification_decisions, public.leader_public_profiles,
  public.leader_contacts, public.leader_dossiers, public.leader_dossier_documents,
  public.leader_appointment_events, public.leader_audit_events
from public, anon, authenticated;

-- Authenticated backend administration; RLS determines permitted rows/actions.
grant select, insert, update on table
  public.admin_role_assignments, public.admin_delegations,
  public.leader_people, public.leader_positions, public.leader_appointments,
  public.leader_verification_cases, public.leader_public_profiles,
  public.leader_contacts, public.leader_dossiers
to authenticated;
grant select on public.leader_person_history to authenticated;
grant insert on public.leader_appointment_evidence, public.leader_dossier_documents to authenticated;
grant select on public.leader_appointment_evidence, public.leader_dossier_documents,
  public.leader_verification_decisions, public.leader_appointment_events, public.leader_audit_events
to authenticated;

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

-- ---------------------------------------------------------------------------
-- Transaction-safe application operations. SECURITY INVOKER keeps table RLS
-- and row triggers in force; the server routes call these through Supabase RPC.
-- ---------------------------------------------------------------------------
create or replace function public.create_leader_appointment_v2(
  p_first_name text,
  p_last_name text,
  p_position_id uuid,
  p_administrative_unit_id uuid,
  p_effective_from date,
  p_evidence_type text,
  p_reference_number text,
  p_issuer text,
  p_issued_on date default null,
  p_valid_until date default null,
  p_private_storage_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $create$
declare
  v_person_id uuid;
  v_appointment_id uuid;
  v_case_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if nullif(btrim(p_first_name), '') is null
     or nullif(btrim(p_last_name), '') is null
     or nullif(btrim(p_evidence_type), '') is null
     or nullif(btrim(p_reference_number), '') is null
     or nullif(btrim(p_issuer), '') is null then
    raise exception 'Identity and appointment evidence fields are required';
  end if;
  if p_valid_until is not null and p_issued_on is not null and p_valid_until < p_issued_on then
    raise exception 'Evidence validity date cannot precede issue date';
  end if;

  insert into public.leader_people(first_name, last_name, created_by)
  values (btrim(p_first_name), btrim(p_last_name), auth.uid())
  returning id into v_person_id;

  insert into public.leader_appointments(
    person_id, position_id, administrative_unit_id, effective_from,
    appointment_status, recorded_by
  ) values (
    v_person_id, p_position_id, p_administrative_unit_id, p_effective_from,
    'pending', auth.uid()
  )
  returning id into v_appointment_id;

  insert into public.leader_verification_cases(
    appointment_id, verification_status, submitted_by
  ) values (
    v_appointment_id, 'pending', auth.uid()
  )
  returning id into v_case_id;

  insert into public.leader_appointment_evidence(
    appointment_id, verification_case_id, evidence_type, reference_number,
    issuer, issued_on, valid_until, private_storage_key, uploaded_by
  ) values (
    v_appointment_id, v_case_id, btrim(p_evidence_type), btrim(p_reference_number),
    btrim(p_issuer), p_issued_on, p_valid_until, p_private_storage_key, auth.uid()
  );

  return v_appointment_id;
end
$create$;

create or replace function public.decide_leader_verification_v2(
  p_verification_case_id uuid,
  p_decision text,
  p_reason text default null,
  p_expected_version integer default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $decide$
declare
  v_status text;
  v_version integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_decision not in ('under_review','approved','rejected','suspended','disputed') then
    raise exception 'Unsupported verification decision';
  end if;
  if p_decision <> 'under_review' and nullif(btrim(p_reason), '') is null then
    raise exception 'A decision reason is required';
  end if;

  select verification_status, version into v_status, v_version
  from public.leader_verification_cases
  where id = p_verification_case_id
  for update;
  if not found then
    raise exception 'Verification case not found' using errcode = 'P0002';
  end if;
  if p_expected_version is not null and p_expected_version <> v_version then
    raise exception 'Verification case version conflict' using errcode = '40001';
  end if;

  if p_decision = 'under_review' then
    update public.leader_verification_cases
    set verification_status = 'under_review'
    where id = p_verification_case_id;
  else
    if v_status = 'pending' then
      update public.leader_verification_cases
      set verification_status = 'under_review'
      where id = p_verification_case_id;
    elsif v_status <> 'under_review' then
      raise exception 'Verification case must be pending or under review';
    end if;

    update public.leader_verification_cases
    set verification_status = p_decision,
        decision_reason = btrim(p_reason)
    where id = p_verification_case_id;
  end if;

  return p_decision;
end
$decide$;

revoke all on function public.create_leader_appointment_v2(
  text,text,uuid,uuid,date,text,text,text,date,date,text
) from public, anon;
grant execute on function public.create_leader_appointment_v2(
  text,text,uuid,uuid,date,text,text,text,date,date,text
) to authenticated;
revoke all on function public.decide_leader_verification_v2(uuid,text,text,integer) from public, anon;
grant execute on function public.decide_leader_verification_v2(uuid,text,text,integer) to authenticated;

-- Public directory is a security-invoker view, so underlying-table RLS still applies.
create or replace view public.leader_directory_public
with (security_invoker = true)
as
select
  a.id as appointment_id,
  person.id as person_id,
  coalesce(nullif(btrim(profile.display_name), ''), concat_ws(' ', person.first_name, person.last_name)) as display_name,
  pos.code as position_code,
  pos.title_kiny,
  pos.title_eng,
  pos.title_fra,
  b.id as administrative_unit_id,
  b.scope_code,
  b.name_kiny as administrative_unit_name_kiny,
  b.name_eng as administrative_unit_name_eng,
  b.level::text as administrative_unit_level,
  a.effective_from,
  a.effective_to,
  profile.biography,
  profile.office_hours,
  profile.service_priorities,
  profile.public_photo_object_key,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'type', c.contact_type, 'label', c.label, 'value', c.contact_value
    ) order by c.sort_order, c.contact_type)
    from public.leader_contacts c
    where c.appointment_id = a.id
      and c.visibility = 'public'
      and c.public_approved_at is not null
  ), '[]'::jsonb) as public_contacts
from public.leader_appointments a
join public.leader_people person on person.id = a.person_id
join public.leader_positions pos on pos.id = a.position_id
join public.boundaries b on b.id = a.administrative_unit_id
join public.leader_public_profiles profile on profile.appointment_id = a.id
join public.leader_verification_cases v on v.appointment_id = a.id
where a.appointment_status in ('approved','active')
  and a.effective_from <= current_date
  and (a.effective_to is null or a.effective_to > current_date)
  and v.verification_status = 'approved'
  and pos.position_status = 'approved'
  and profile.publication_status = 'published'
  and b.valid_to is null;

revoke all on public.leader_directory_public from public, authenticated, anon;
grant select on public.leader_directory_public to anon, authenticated;

commit;
