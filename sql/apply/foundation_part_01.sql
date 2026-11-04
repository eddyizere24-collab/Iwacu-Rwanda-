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
