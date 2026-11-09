-- IWACU RWANDA — Office workspaces (M5): leader verification, per-unit report, official records.
-- Additive only. Builds on M4 (office_unit_leaders) and M4b (private.office_top_scope, office_account_status, office_case_units).
--   * office_unit_leaders.verified_at/verified_by : an office ABOVE a unit confirms its leader card is correct.
--       Editing the name, title or phone clears the confirmation, so the queue shows it again.
--   * verify_office_unit_leader_v1 / list_office_verification_v1 / get_office_unit_verification_v1
--   * list_office_report_v1     : one row per direct child with coverage numbers (no ranking, no invented figures).
--   * office_records            : official records (decisions, reports, minutes, circulars) per unit, optional PDF/photo file
--       kept in the PRIVATE bucket "office-records"; read only through the functions below.
--   * list_office_audit_v1      : replaced to include record events.
-- Same rule as before: tables have no client grants; everything goes through SECURITY DEFINER functions under auth.uid().
begin;

-- ---------------------------------------------------------------------------
-- 1. Leader verification
-- ---------------------------------------------------------------------------
alter table public.office_unit_leaders
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

create or replace function private.office_leader_verify_reset()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verified_at is not distinct from old.verified_at
     and (new.display_name, new.job_title, new.phone) is distinct from (old.display_name, old.job_title, old.phone) then
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end $$;
revoke all on function private.office_leader_verify_reset() from public, anon, authenticated;
drop trigger if exists office_unit_leaders_verify_reset_trg on public.office_unit_leaders;
create trigger office_unit_leaders_verify_reset_trg
  before update on public.office_unit_leaders
  for each row execute function private.office_leader_verify_reset();

create or replace function public.verify_office_unit_leader_v1(p_unit_id uuid, p_verified boolean default true)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_scope text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select b.scope_code into v_scope from public.boundaries b where b.id = p_unit_id and b.valid_to is null;
  if v_scope is null or not private.office_in_scope(auth.uid(), v_scope, true) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  update public.office_unit_leaders
     set verified_at = case when p_verified then now() else null end,
         verified_by = case when p_verified then auth.uid() else null end,
         updated_by = auth.uid(), updated_at = now()
   where unit_id = p_unit_id;
  if not found then raise exception 'No leader card on this unit' using errcode = '22023'; end if;
  return coalesce(p_verified, true);
end $$;

-- Verification state of ONE unit (for its dossier).
create or replace function public.get_office_unit_verification_v1(p_scope text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid; v_l record;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.office_in_scope(auth.uid(), p_scope, false) then raise exception 'Outside your scope' using errcode = '42501'; end if;
  select b.id into v_id from public.boundaries b where b.scope_code = p_scope and b.valid_to is null;
  select l.verified_at, l.verified_by into v_l from public.office_unit_leaders l where l.unit_id = v_id;
  return jsonb_build_object(
    'has_card', v_l is not null,
    'verified_at', v_l.verified_at,
    'verified_by_name', (select p.display_name from public.office_profiles p where p.user_id = v_l.verified_by),
    'can_verify', v_l is not null and private.office_in_scope(auth.uid(), p_scope, true));
end $$;

-- Queue: cards below me that are waiting for (or already have) confirmation.
create or replace function public.list_office_verification_v1(
  p_state text default 'pending', p_under text default null, p_level text default null,
  p_limit integer default 30, p_offset integer default 0)
returns table(unit_id uuid, scope_code text, level text, unit_name text, parent_name text, leader_name text,
              leader_title text, leader_phone text, leader_photo text, status text,
              verified_at timestamptz, verified_by_name text, updated_at timestamptz, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_state not in ('pending','verified','all') then raise exception 'Unknown state' using errcode = '22023'; end if;
  if p_level is not null and p_level not in ('district','sector','cell','village') then raise exception 'Unknown level' using errcode = '22023'; end if;
  if p_under is not null and not private.office_in_scope(auth.uid(), p_under, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  return query
  with my as (select m.scope_code from private.office_scopes(auth.uid()) m),
  f as (
    select b.id, b.scope_code, b.level::text as lvl, b.name_kiny, b.name_eng, b.parent_id, l.display_name, l.job_title, l.phone,
           l.photo_path, l.user_id, l.verified_at, l.verified_by, l.updated_at, count(*) over() as total_n
    from public.office_unit_leaders l
    join public.boundaries b on b.id = l.unit_id and b.valid_to is null
    where exists (select 1 from my where b.scope_code like my.scope_code || '-%')
      and (p_under is null or b.scope_code like p_under || '-%')
      and (p_level is null or b.level::text = p_level)
      and (p_state = 'all' or (p_state = 'pending' and l.verified_at is null) or (p_state = 'verified' and l.verified_at is not null))
    order by (l.verified_at is null) desc, case b.level::text when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 4 end,
             l.updated_at desc, b.id
    limit least(greatest(coalesce(p_limit, 30), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
  )
  select f.id, f.scope_code, f.lvl, coalesce(f.name_kiny, f.name_eng), coalesce(pb.name_kiny, pb.name_eng),
         f.display_name, f.job_title, f.phone, f.photo_path, coalesce(private.office_account_status(f.user_id), 'record'),
         f.verified_at, (select p.display_name from public.office_profiles p where p.user_id = f.verified_by), f.updated_at, f.total_n
  from f left join public.boundaries pb on pb.id = f.parent_id
  order by (f.verified_at is null) desc, case f.lvl when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 4 end,
           f.updated_at desc, f.id;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Official records
-- ---------------------------------------------------------------------------
create table if not exists public.office_records (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.boundaries(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  kind text not null check (kind in ('decision','report','minutes','circular','other')),
  note text check (note is null or char_length(note) <= 1000),
  file_path text check (file_path is null or file_path ~ '^rec/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$'),
  file_name text check (file_name is null or char_length(file_name) <= 120),
  size_bytes integer check (size_bytes is null or size_bytes between 1 and 5242880),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null
);
create index if not exists office_records_unit_idx on public.office_records(unit_id, created_at desc) where archived_at is null;
alter table public.office_records enable row level security;
revoke all on table public.office_records from public, anon, authenticated;

do $bucket$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
    select 'office-records', 'office-records', false, 5242880, array['application/pdf','image/jpeg','image/png']::text[]
    where not exists (select 1 from storage.buckets where id = 'office-records');
  end if;
end
$bucket$;

-- Creates the record row; when a file is announced the exact storage path is returned and the server uploads to it.
create or replace function public.create_office_record_v1(
  p_unit_id uuid, p_title text, p_kind text, p_note text default null,
  p_file_name text default null, p_size integer default null, p_ext text default null)
returns table(id uuid, file_path text)
language plpgsql security definer set search_path = '' as $$
declare v_scope text; v_id uuid := gen_random_uuid(); v_path text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select b.scope_code into v_scope from public.boundaries b where b.id = p_unit_id and b.valid_to is null;
  if v_scope is null or not private.office_in_scope(auth.uid(), v_scope, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  if p_ext is not null then
    if p_ext not in ('pdf','jpg','png') or p_size is null or p_size < 1 or p_size > 5242880 then
      raise exception 'File not allowed' using errcode = '22023';
    end if;
    v_path := 'rec/' || p_unit_id::text || '/' || v_id::text || '.' || p_ext;
  end if;
  insert into public.office_records(id, unit_id, title, kind, note, file_path, file_name, size_bytes, created_by)
  values (v_id, p_unit_id, btrim(p_title), p_kind, nullif(btrim(coalesce(p_note, '')), ''), v_path,
          case when v_path is null then null else left(coalesce(nullif(btrim(p_file_name), ''), 'file'), 120) end,
          case when v_path is null then null else p_size end, auth.uid());
  return query select v_id, v_path;
end $$;

create or replace function public.list_office_records_v1(
  p_q text default null, p_kind text default null, p_under text default null,
  p_limit integer default 30, p_offset integer default 0)
returns table(id uuid, title text, kind text, note text, file_name text, size_bytes integer, has_file boolean,
              created_at timestamptz, created_by_name text, unit_id uuid, scope_code text, level text, unit_name text,
              can_archive boolean, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_q text := nullif(replace(replace(btrim(coalesce(p_q, '')), '%', ''), '_', ''), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_kind is not null and p_kind not in ('decision','report','minutes','circular','other') then
    raise exception 'Unknown kind' using errcode = '22023';
  end if;
  if p_under is not null and not private.office_in_scope(auth.uid(), p_under, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  return query
  with my as (select m.scope_code from private.office_scopes(auth.uid()) m)
  select r.id, r.title, r.kind, r.note, r.file_name, r.size_bytes, r.file_path is not null, r.created_at,
         (select p.display_name from public.office_profiles p where p.user_id = r.created_by),
         b.id, b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng),
         (r.created_by = auth.uid() or private.office_in_scope(auth.uid(), b.scope_code, true)),
         count(*) over()
  from public.office_records r
  join public.boundaries b on b.id = r.unit_id
  where r.archived_at is null
    and exists (select 1 from my where b.scope_code = my.scope_code or b.scope_code like my.scope_code || '-%')
    and (p_under is null or b.scope_code = p_under or b.scope_code like p_under || '-%')
    and (p_kind is null or r.kind = p_kind)
    and (v_q is null or r.title ilike '%' || v_q || '%' or coalesce(r.note, '') ilike '%' || v_q || '%')
  order by r.created_at desc, r.id
  limit least(greatest(coalesce(p_limit, 30), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Authority check for the download route: returns the storage path only when the record is inside my scope.
create or replace function public.get_office_record_file_v1(p_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_path text; v_scope text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select r.file_path, b.scope_code into v_path, v_scope
  from public.office_records r join public.boundaries b on b.id = r.unit_id
  where r.id = p_id and r.archived_at is null;
  if v_scope is null or not private.office_in_scope(auth.uid(), v_scope, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  if v_path is null then raise exception 'No file on this record' using errcode = '22023'; end if;
  return v_path;
end $$;

create or replace function public.archive_office_record_v1(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_scope text; v_by uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select b.scope_code, r.created_by into v_scope, v_by
  from public.office_records r join public.boundaries b on b.id = r.unit_id where r.id = p_id and r.archived_at is null;
  if v_scope is null or not private.office_in_scope(auth.uid(), v_scope, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  if v_by is distinct from auth.uid() and not private.office_in_scope(auth.uid(), v_scope, true) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  update public.office_records set archived_at = now(), archived_by = auth.uid() where id = p_id;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Report: one row per direct child, numbers only (what exists, not scores)
-- ---------------------------------------------------------------------------
create or replace function public.list_office_report_v1(p_scope text default null)
returns table(unit_id uuid, scope_code text, level text, name text, leader_name text, leader_status text,
              units_below integer, cards integer, accounts integer, signed_in integer, verified integer,
              open_cases integer, overdue_tasks integer, records integer)
language plpgsql stable security definer set search_path = '' as $$
declare v_top record; v_unit record; v_child text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_top from private.office_top_scope(auth.uid());
  if v_top.unit_id is null then raise exception 'No office scope' using errcode = '42501'; end if;
  select b.scope_code, b.level::text as level into v_unit
  from public.boundaries b where b.scope_code = coalesce(p_scope, v_top.scope_code) and b.valid_to is null;
  if v_unit.scope_code is null or not private.office_in_scope(auth.uid(), v_unit.scope_code, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  v_child := private.office_level_below(v_unit.level);
  if v_child is null then return; end if;
  return query
  with kids as (
    select b.id, b.scope_code as sc, b.level::text as lvl, coalesce(b.name_kiny, b.name_eng) as nm
    from public.boundaries b
    where b.valid_to is null and b.level::text = v_child and b.scope_code like v_unit.scope_code || '-%'
  ),
  d as (
    select k.id as kid, x.id as did, l.user_id, l.verified_at, (l.unit_id is not null) as has_card
    from kids k
    join public.boundaries x on x.valid_to is null and x.scope_code like k.sc || '-%'
    left join public.office_unit_leaders l on l.unit_id = x.id
  ),
  dagg as (
    select d.kid,
           count(*)::int as below,
           count(*) filter (where d.has_card)::int as cards,
           count(*) filter (where d.user_id is not null)::int as accounts,
           count(*) filter (where d.user_id is not null and private.office_account_status(d.user_id) = 'active')::int as signed_in,
           count(*) filter (where d.verified_at is not null)::int as verified
    from d group by d.kid
  ),
  cagg as (
    select k.id as kid, count(*)::int as n
    from kids k
    join public.boundaries x on x.valid_to is null and (x.scope_code = k.sc or x.scope_code like k.sc || '-%')
    join private.office_case_units() c on c.unit_id = x.id
    where c.status in ('new','reviewing')
    group by k.id
  ),
  tagg as (
    select k.id as kid, count(*)::int as n
    from kids k
    join public.boundaries x on x.valid_to is null and (x.scope_code = k.sc or x.scope_code like k.sc || '-%')
    join public.office_task_targets tt on tt.unit_id = x.id
    join public.office_tasks t on t.id = tt.task_id
    where t.status = 'open' and t.due_at < now() and tt.status in ('assigned','acknowledged','in_progress','returned')
    group by k.id
  ),
  ragg as (
    select k.id as kid, count(*)::int as n
    from kids k
    join public.boundaries x on x.valid_to is null and (x.scope_code = k.sc or x.scope_code like k.sc || '-%')
    join public.office_records r on r.unit_id = x.id and r.archived_at is null
    group by k.id
  )
  select k.id, k.sc, k.lvl, k.nm, l.display_name,
         case when l.unit_id is null then 'vacant' else coalesce(private.office_account_status(l.user_id), 'record') end,
         coalesce(a.below, 0), coalesce(a.cards, 0), coalesce(a.accounts, 0), coalesce(a.signed_in, 0), coalesce(a.verified, 0),
         coalesce(c.n, 0), coalesce(t.n, 0), coalesce(r.n, 0)
  from kids k
  left join public.office_unit_leaders l on l.unit_id = k.id
  left join dagg a on a.kid = k.id
  left join cagg c on c.kid = k.id
  left join tagg t on t.kid = k.id
  left join ragg r on r.kid = k.id
  order by k.nm, k.id;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Audit view now also lists record events (replaces the M4b function in place).
-- ---------------------------------------------------------------------------
create or replace function public.list_office_audit_v1(p_limit integer default 50, p_offset integer default 0)
returns table(at timestamptz, kind text, who text, unit_name text, level text, scope_code text, detail text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return query
  with ev as (
    select a.changed_at as at, ('card_' || a.action)::text as kind, a.changed_by as actor, a.unit_id,
           coalesce(a.new_row ->> 'display_name', a.old_row ->> 'display_name') as detail
    from public.office_unit_leader_audit a
    union all
    select t.created_at, 'task_issued', t.issued_by, t.issuer_unit_id, t.reference || ' · ' || t.title from public.office_tasks t
    union all
    select p.created_at, 'account_created', p.created_by, l.unit_id, p.display_name
    from public.office_profiles p join public.office_unit_leaders l on l.user_id = p.user_id
    union all
    select r.created_at, 'record_added', r.created_by, r.unit_id, r.title from public.office_records r
    union all
    select r.archived_at, 'record_archived', r.archived_by, r.unit_id, r.title from public.office_records r where r.archived_at is not null
  )
  select e.at, e.kind, coalesce(ap.display_name, 'Sisitemu'), coalesce(b.name_kiny, b.name_eng), b.level::text, b.scope_code, e.detail,
         count(*) over()
  from ev e
  join public.boundaries b on b.id = e.unit_id
  left join public.office_profiles ap on ap.user_id = e.actor
  where private.office_in_scope(auth.uid(), b.scope_code, false)
  order by e.at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- ---------------------------------------------------------------------------
-- Execute rights: signed-in office users only; nothing for anon.
-- ---------------------------------------------------------------------------
revoke all on function
  public.verify_office_unit_leader_v1(uuid, boolean), public.get_office_unit_verification_v1(text),
  public.list_office_verification_v1(text, text, text, integer, integer),
  public.create_office_record_v1(uuid, text, text, text, text, integer, text),
  public.list_office_records_v1(text, text, text, integer, integer), public.get_office_record_file_v1(uuid),
  public.archive_office_record_v1(uuid), public.list_office_report_v1(text), public.list_office_audit_v1(integer, integer)
from public, anon;
grant execute on function
  public.verify_office_unit_leader_v1(uuid, boolean), public.get_office_unit_verification_v1(text),
  public.list_office_verification_v1(text, text, text, integer, integer),
  public.create_office_record_v1(uuid, text, text, text, text, integer, text),
  public.list_office_records_v1(text, text, text, integer, integer), public.get_office_record_file_v1(uuid),
  public.archive_office_record_v1(uuid), public.list_office_report_v1(text), public.list_office_audit_v1(integer, integer)
to authenticated;

commit;
