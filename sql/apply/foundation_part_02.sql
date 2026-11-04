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
