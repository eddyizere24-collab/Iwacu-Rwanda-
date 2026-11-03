-- [CHATGPT] Leaders L1: additive employment history, certifications, position provenance and owner bootstrap.
-- Does not alter or delete public.leaders, public.boundaries or location code.
begin;

do $bootstrap$
declare
  v_profiles integer;
  v_super_admins integer;
  v_user uuid;
  v_scope text;
  v_country_id uuid;
begin
  select count(*), count(*) filter (where is_super_admin is true)
    into v_profiles, v_super_admins
  from public.admin_profiles;
  if v_profiles <> 1 or v_super_admins <> 1 then
    raise exception 'L1 stopped: expected exactly one owner profile and one Super Admin flag; found %, %',
      v_profiles, v_super_admins;
  end if;
  select user_id, scope_code into v_user, v_scope
  from public.admin_profiles where is_super_admin is true;
  if v_scope <> 'RW' then raise exception 'L1 stopped: Super Admin profile is not country scope RW'; end if;
  select id into v_country_id from public.boundaries
    where scope_code='RW' and level::text='country' and valid_to is null;
  if v_country_id is null then raise exception 'Active canonical country boundary RW not found'; end if;
  if exists (
    select 1 from public.admin_role_assignments
    where role_code='national_super_admin' and assignment_status='active'
      and (user_id <> v_user or administrative_unit_id <> v_country_id)
  ) then raise exception 'Unexpected active National Super Admin assignment already exists'; end if;
  insert into public.admin_role_assignments(
    user_id,role_code,administrative_unit_id,assignment_status,valid_from,grant_reason
  )
  select v_user,'national_super_admin',v_country_id,'active',now(),
    'L1 first Super Admin bootstrap from the sole existing owner admin_profiles row'
  where not exists (
    select 1 from public.admin_role_assignments
    where user_id=v_user and role_code='national_super_admin'
      and administrative_unit_id=v_country_id and assignment_status='active'
  );
end
$bootstrap$;

alter table public.leader_positions
  add column if not exists source_reference text,
  add column if not exists confirmation_required boolean not null default true;

-- All imported enum labels remain DRAFT; none is approved by this migration.
insert into public.leader_positions(
  code,title_kiny,title_eng,title_fra,required_boundary_level,
  is_exclusive,position_status,source_reference,confirmation_required,created_by
)
select v.code,v.title_kiny,v.title_eng,v.title_fra,v.required_boundary_level,
       case when v.code='vice_mayor' then false else true end,
       'draft',v.source_reference,true,ap.user_id
from (values
  ('village_leader','Umuyobozi w''Umudugudu','Village Leader','Chef de village','village',
   'Governance Specification §§6.4–6.5; public.leaders.role enum: Village Leader'),
  ('cell_executive_secretary','Umunyamabanga Nshingwabikorwa w''Akagari','Cell Executive Secretary','Secrétaire exécutif de cellule','cell',
   'Governance Specification §6.4; public.leaders.role enum: Cell Executive Secretary'),
  ('sector_executive_secretary','Umunyamabanga Nshingwabikorwa w''Umurenge','Sector Executive Secretary','Secrétaire exécutif de secteur','sector',
   'Governance Specification §6.3; public.leaders.role enum: Sector Executive Secretary'),
  ('mayor','Meya w''Akarere','District Mayor','Maire du district','district',
   'Governance Specification §6.2; public.leaders.role enum: Mayor'),
  ('vice_mayor','Visi Meya w''Akarere','Deputy District Mayor','Maire adjoint du district','district',
   'Governance Specification §6.2; public.leaders.role enum: Vice Mayor'),
  ('district_executive_secretary','Umunyamabanga Nshingwabikorwa w''Akarere','District Executive Secretary','Secrétaire exécutif de district','district',
   'Governance Specification §6.2; public.leaders.role enum: District Executive Secretary')
) as v(code,title_kiny,title_eng,title_fra,required_boundary_level,source_reference)
cross join lateral (
  select user_id from public.admin_profiles
  where is_super_admin is true and scope_code='RW'
) ap
where not exists (select 1 from public.leader_positions p where p.code=v.code);

create table if not exists public.leader_employment_history (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.leader_people(id) on delete restrict,
  employer text not null check (length(btrim(employer)) between 2 and 200),
  position_title text not null check (length(btrim(position_title)) between 2 and 200),
  started_on date,
  ended_on date,
  source_reference text,
  recorded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint leader_employment_dates check (ended_on is null or started_on is null or ended_on >= started_on)
);
create index if not exists leader_employment_history_person
  on public.leader_employment_history(person_id,started_on desc);

create table if not exists public.leader_certifications (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.leader_people(id) on delete restrict,
  certification_name text not null check (length(btrim(certification_name)) between 2 and 240),
  issuer text,
  issued_on date,
  valid_until date,
  evidence_reference text,
  recorded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint leader_certification_dates check (valid_until is null or issued_on is null or valid_until >= issued_on)
);
create index if not exists leader_certifications_person
  on public.leader_certifications(person_id,issued_on desc);

alter table public.leader_employment_history enable row level security;
alter table public.leader_certifications enable row level security;
revoke all on public.leader_employment_history,public.leader_certifications from public,anon,authenticated;
grant select,insert,update on public.leader_employment_history,public.leader_certifications to authenticated;

create policy leader_employment_dossier_read
on public.leader_employment_history for select to authenticated
using (exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_employment_history.person_id
    and private.leader_actor_can('view_dossier',a.administrative_unit_id)
));
create policy leader_employment_dossier_write
on public.leader_employment_history for insert to authenticated
with check (recorded_by=(select auth.uid()) and exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_employment_history.person_id
    and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
));
create policy leader_employment_dossier_update
on public.leader_employment_history for update to authenticated
using (exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_employment_history.person_id
    and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
))
with check (exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_employment_history.person_id
    and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
));

create policy leader_certifications_dossier_read
on public.leader_certifications for select to authenticated
using (exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_certifications.person_id
    and private.leader_actor_can('view_dossier',a.administrative_unit_id)
));
create policy leader_certifications_dossier_write
on public.leader_certifications for insert to authenticated
with check (recorded_by=(select auth.uid()) and exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_certifications.person_id
    and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
));
create policy leader_certifications_dossier_update
on public.leader_certifications for update to authenticated
using (exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_certifications.person_id
    and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
))
with check (exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_certifications.person_id
    and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
));

-- Archive confidential document metadata without deleting the underlying file.
grant update on public.leader_dossier_documents to authenticated;
create policy leader_dossier_documents_scoped_archive
on public.leader_dossier_documents for update to authenticated
using (exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_dossier_documents.person_id
    and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
))
with check (exists (
  select 1 from public.leader_appointments a
  where a.person_id=leader_dossier_documents.person_id
    and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
));

create or replace function private.guard_leader_dossier_child()
returns trigger language plpgsql security definer set search_path=''
as $child$
begin
  if tg_op='DELETE' then raise exception 'Confidential dossier history is archived, not deleted'; end if;
  if tg_op='INSERT' then
    new.recorded_by:=auth.uid();
    new.created_at:=now();
  else
    if new.id is distinct from old.id
       or new.person_id is distinct from old.person_id
       or new.recorded_by is distinct from old.recorded_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Confidential history origin is immutable';
    end if;
  end if;
  return new;
end
$child$;

drop trigger if exists leader_employment_history_guard on public.leader_employment_history;
create trigger leader_employment_history_guard
before insert or update or delete on public.leader_employment_history
for each row execute function private.guard_leader_dossier_child();
drop trigger if exists leader_certifications_guard on public.leader_certifications;
create trigger leader_certifications_guard
before insert or update or delete on public.leader_certifications
for each row execute function private.guard_leader_dossier_child();

drop trigger if exists leader_employment_history_audit_event on public.leader_employment_history;
create trigger leader_employment_history_audit_event after insert or update
on public.leader_employment_history for each row execute function private.capture_leader_audit_event();
drop trigger if exists leader_certifications_audit_event on public.leader_certifications;
create trigger leader_certifications_audit_event after insert or update
on public.leader_certifications for each row execute function private.capture_leader_audit_event();


-- Tighten administrator assignment hierarchy at the RLS layer as well as the API.
-- A National Super Admin may create District Admins only; District -> Sector;
-- Sector -> Cell. Each lower assignment must target a direct canonical child.
create or replace function private.leader_actor_can_manage_assignment(
  p_role_code text,
  p_unit_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $assignment_hierarchy$
  select
    exists (
      select 1
      from public.admin_role_assignments actor
      join public.boundaries actor_unit on actor_unit.id = actor.administrative_unit_id
      join public.boundaries target on target.id = p_unit_id
      where actor.user_id = auth.uid()
        and actor.assignment_status = 'active'
        and actor.valid_from <= now()
        and (actor.valid_until is null or actor.valid_until > now())
        and target.valid_to is null
        and actor.role_code = 'national_super_admin'
        and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
        and p_role_code = 'district_admin'
        and target.level::text = 'district'
        and target.scope_code like actor_unit.scope_code || '-%'
        and actor_unit.level::text = 'country'
        and actor_unit.scope_code = 'RW'
    )
    or exists (
      select 1
      from public.admin_role_assignments actor
      join public.boundaries actor_unit on actor_unit.id = actor.administrative_unit_id
      join public.boundaries target on target.id = p_unit_id
      where actor.user_id = auth.uid()
        and actor.assignment_status = 'active'
        and actor.valid_from <= now()
        and (actor.valid_until is null or actor.valid_until > now())
        and actor.role_code = 'district_admin'
        and actor_unit.level::text = 'district'
        and target.level::text = 'sector'
        and target.parent_id = actor_unit.id
        and target.valid_to is null
        and p_role_code = 'sector_admin'
    )
    or exists (
      select 1
      from public.admin_role_assignments actor
      join public.boundaries actor_unit on actor_unit.id = actor.administrative_unit_id
      join public.boundaries target on target.id = p_unit_id
      where actor.user_id = auth.uid()
        and actor.assignment_status = 'active'
        and actor.valid_from <= now()
        and (actor.valid_until is null or actor.valid_until > now())
        and actor.role_code = 'sector_admin'
        and actor_unit.level::text = 'sector'
        and target.level::text = 'cell'
        and target.parent_id = actor_unit.id
        and target.valid_to is null
        and p_role_code = 'cell_admin'
    );
$assignment_hierarchy$;

revoke all on function private.leader_actor_can_manage_assignment(text,uuid) from public,anon,authenticated;
grant execute on function private.leader_actor_can_manage_assignment(text,uuid) to authenticated;

drop policy if exists admin_role_assignments_l1_hierarchy_insert on public.admin_role_assignments;
create policy admin_role_assignments_l1_hierarchy_insert
on public.admin_role_assignments as restrictive
for insert to authenticated
with check (private.leader_actor_can_manage_assignment(role_code, administrative_unit_id));

drop policy if exists admin_role_assignments_l1_hierarchy_update on public.admin_role_assignments;
create policy admin_role_assignments_l1_hierarchy_update
on public.admin_role_assignments as restrictive
for update to authenticated
using (private.leader_actor_can_manage_assignment(role_code, administrative_unit_id))
with check (private.leader_actor_can_manage_assignment(role_code, administrative_unit_id));

commit;
