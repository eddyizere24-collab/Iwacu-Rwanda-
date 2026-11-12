-- IWACU RWANDA — Office workspaces (M4): one leader card per administrative unit, unit explorer, dashboard.
-- Additive only. Builds on M3 (office_profiles, private.office_scopes) and the existing boundaries table.
--   * public.office_unit_leaders : ONE current leader card per unit (district, sector, cell, village).
--       The card exists with or without a login account (villages have no accounts).
--   * list_office_units_v1       : drill down the hierarchy inside the caller's scope, with each unit's leader.
--   * list_office_leaders_v1     : flat, searchable table of leaders inside the caller's scope.
--   * save_office_unit_leader_v1 : edit/create a card (self, or any unit below the caller).
--   * get_office_workspace_v1    : dashboard numbers for the caller's scope.
--   * get_public_unit_leaders_v1 : the ONLY public read path; returns approved public fields only.
-- All client access goes through SECURITY DEFINER functions; the tables have no client grants.
begin;

create schema if not exists private;

create table if not exists public.office_unit_leaders (
  unit_id uuid primary key references public.boundaries(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  job_title text check (job_title is null or char_length(job_title) <= 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{7,16}$'),
  public_email text check (public_email is null or (char_length(public_email) <= 160 and public_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  bio text check (bio is null or char_length(bio) <= 600),
  office_hours text check (office_hours is null or char_length(office_hours) <= 120),
  photo_path text check (photo_path is null or photo_path ~ '^office/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'),
  is_public boolean not null default true,
  show_phone boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists office_unit_leaders_user_idx on public.office_unit_leaders(user_id) where user_id is not null;

create table if not exists public.office_unit_leader_audit (
  id bigint generated always as identity primary key,
  unit_id uuid not null,
  action text not null check (action in ('insert','update','delete')),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_row jsonb,
  new_row jsonb
);
create index if not exists office_unit_leader_audit_unit_idx on public.office_unit_leader_audit(unit_id, changed_at desc);

alter table public.office_unit_leaders enable row level security;
alter table public.office_unit_leader_audit enable row level security;
revoke all on table public.office_unit_leaders, public.office_unit_leader_audit from public, anon, authenticated;
-- No policies on purpose: nothing but the functions below can read or write these tables.

-- Every change to a card is kept (who, when, before, after).
create or replace function private.office_unit_leaders_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.office_unit_leader_audit(unit_id, action, changed_by, new_row)
    values (new.unit_id, 'insert', auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.office_unit_leader_audit(unit_id, action, changed_by, old_row, new_row)
    values (new.unit_id, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.office_unit_leader_audit(unit_id, action, changed_by, old_row)
    values (old.unit_id, 'delete', auth.uid(), to_jsonb(old));
    return old;
  end if;
end $$;
revoke all on function private.office_unit_leaders_audit() from public, anon, authenticated;
drop trigger if exists office_unit_leaders_audit_trg on public.office_unit_leaders;
create trigger office_unit_leaders_audit_trg
  after insert or update or delete on public.office_unit_leaders
  for each row execute function private.office_unit_leaders_audit();

-- ---------------------------------------------------------------------------
-- Scope helper: is a place (by scope_code) inside one of the user's scopes?
-- strict = strictly below (not the user's own unit).
-- ---------------------------------------------------------------------------
create or replace function private.office_in_scope(p_user uuid, p_scope text, p_strict boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.office_scopes(p_user) s
    where p_scope like s.scope_code || '-%'
       or (not p_strict and p_scope = s.scope_code)
  );
$$;
revoke all on function private.office_in_scope(uuid, text, boolean) from public, anon, authenticated;

-- The level a role may create accounts for.
create or replace function private.office_child_level(p_role text)
returns text language sql immutable set search_path = '' as $$
  select case p_role
    when 'national_super_admin' then 'district'
    when 'district_admin' then 'sector'
    when 'sector_admin' then 'cell'
    else null end;
$$;
revoke all on function private.office_child_level(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Creating an account also gives the unit its leader card (linked to the new login).
-- Same signature as M3, so this replaces it in place.
-- ---------------------------------------------------------------------------
create or replace function public.create_office_account_v1(
  p_user_id uuid,
  p_login_name text,
  p_display_name text,
  p_job_title text,
  p_phone text,
  p_role_code text,
  p_unit_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_assignment uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_role_code not in ('district_admin','sector_admin','cell_admin') then
    raise exception 'Only district, sector and cell accounts can be created here' using errcode = '22023';
  end if;
  if not private.leader_actor_can('manage_admins', p_unit_id) then
    raise exception 'No authority to create this account at this place' using errcode = '42501';
  end if;
  insert into public.admin_role_assignments(user_id, role_code, administrative_unit_id, grant_reason)
  values (p_user_id, p_role_code, p_unit_id, 'Konti yaremwe n''urwego rwo hejuru (office)')
  returning id into v_assignment;
  insert into public.office_profiles(user_id, login_name, display_name, job_title, phone, created_by)
  values (p_user_id, lower(btrim(p_login_name)), btrim(p_display_name),
          nullif(btrim(coalesce(p_job_title,'')),''), nullif(btrim(coalesce(p_phone,'')),''), auth.uid());
  insert into public.office_unit_leaders(unit_id, user_id, display_name, job_title, phone, updated_by)
  values (p_unit_id, p_user_id, btrim(p_display_name),
          nullif(btrim(coalesce(p_job_title,'')),''), nullif(btrim(coalesce(p_phone,'')),''), auth.uid())
  on conflict (unit_id) do update
    set user_id = excluded.user_id,
        display_name = excluded.display_name,
        job_title = coalesce(excluded.job_title, public.office_unit_leaders.job_title),
        phone = coalesce(excluded.phone, public.office_unit_leaders.phone),
        updated_by = excluded.updated_by,
        updated_at = now();
  return v_assignment;
end $$;

-- ---------------------------------------------------------------------------
-- Dashboard numbers for the caller's own (highest) scope.
-- ---------------------------------------------------------------------------
create or replace function public.get_office_workspace_v1()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_scope record;
  v_child text;
  v_counts jsonb;
  v_child_total integer := 0;
  v_child_with integer := 0;
  v_child_acc integer := 0;
  v_acc_below integer := 0;
  v_acc_wait integer := 0;
  v_unread integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select s.role_code, s.unit_id, s.scope_code, s.unit_level, b.name_kiny, b.name_eng
    into v_scope
  from private.office_scopes(auth.uid()) s
  join public.boundaries b on b.id = s.unit_id
  order by case s.unit_level when 'country' then 0 when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 9 end
  limit 1;
  if v_scope is null then raise exception 'No office scope' using errcode = '42501'; end if;

  v_child := private.office_child_level(v_scope.role_code);

  select coalesce(jsonb_object_agg(level, n), '{}'::jsonb) into v_counts
  from (select b.level, count(*)::int as n
        from public.boundaries b
        where b.valid_to is null and b.scope_code like v_scope.scope_code || '-%'
        group by b.level) c;

  if v_child is not null then
    select count(*)::int,
           count(l.unit_id)::int,
           count(l.user_id)::int
      into v_child_total, v_child_with, v_child_acc
    from public.boundaries b
    left join public.office_unit_leaders l on l.unit_id = b.id
    where b.valid_to is null and b.level = v_child and b.scope_code like v_scope.scope_code || '-%';
  end if;

  select count(*)::int, count(*) filter (where p.must_change_password)::int
    into v_acc_below, v_acc_wait
  from private.office_reachable(auth.uid()) r
  join public.office_profiles p on p.user_id = r.user_id
  where r.relation = 'below';

  select count(*)::int into v_unread
  from public.office_message_recipients where recipient_id = auth.uid() and read_at is null;

  return jsonb_build_object(
    'scope', jsonb_build_object('unit_id', v_scope.unit_id, 'scope_code', v_scope.scope_code,
             'level', v_scope.unit_level, 'name_kiny', v_scope.name_kiny, 'name_eng', v_scope.name_eng,
             'role_code', v_scope.role_code),
    'child_level', v_child,
    'counts', v_counts,
    'child_total', v_child_total,
    'child_with_leader', v_child_with,
    'child_with_account', v_child_acc,
    'accounts_below', v_acc_below,
    'accounts_waiting_first_login', v_acc_wait,
    'unread', v_unread
  );
end $$;

-- ---------------------------------------------------------------------------
-- Hierarchy explorer: the direct children of one place (default: my own place), with each leader.
-- ---------------------------------------------------------------------------
create or replace function public.list_office_units_v1(p_parent_scope text default null)
returns table(unit_id uuid, scope_code text, level text, name_kiny text, name_eng text, child_count integer,
              leader_user_id uuid, leader_name text, leader_title text, leader_phone text, leader_photo text,
              leader_public boolean, status text, can_edit boolean, can_create_account boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_parent record; v_role text; v_my_child text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_parent_scope is null then
    select b.id, b.scope_code into v_parent
    from private.office_scopes(auth.uid()) s join public.boundaries b on b.id = s.unit_id
    order by case s.unit_level when 'country' then 0 when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 9 end
    limit 1;
  else
    select b.id, b.scope_code into v_parent
    from public.boundaries b where b.scope_code = p_parent_scope and b.valid_to is null;
  end if;
  if v_parent is null or not private.office_in_scope(auth.uid(), v_parent.scope_code, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  -- the level of account I may create (from my highest role)
  select private.office_child_level(s.role_code) into v_my_child
  from private.office_scopes(auth.uid()) s
  where private.office_child_level(s.role_code) is not null
  order by case s.unit_level when 'country' then 0 when 'district' then 1 else 2 end limit 1;

  return query
  select b.id, b.scope_code, b.level::text, b.name_kiny, b.name_eng,
         (select count(*)::int from public.boundaries c where c.parent_id = b.id and c.valid_to is null),
         l.user_id, l.display_name, l.job_title, l.phone, l.photo_path, l.is_public,
         case when l.unit_id is null then 'vacant'
              when l.user_id is null then 'record'
              when coalesce(p.must_change_password, false) then 'invited'
              else 'active' end,
         b.level::text in ('district','sector','cell','village'),
         (l.user_id is null and b.level::text = v_my_child)
  from public.boundaries b
  left join public.office_unit_leaders l on l.unit_id = b.id
  left join public.office_profiles p on p.user_id = l.user_id
  where b.parent_id = v_parent.id and b.valid_to is null
  order by b.name_kiny
  limit 1000;
end $$;

-- ---------------------------------------------------------------------------
-- Flat table of leaders inside my scope (searchable by name or place).
-- ---------------------------------------------------------------------------
create or replace function public.list_office_leaders_v1(p_search text default null, p_level text default null, p_limit integer default 200)
returns table(unit_id uuid, scope_code text, level text, unit_name text, parent_name text,
              leader_user_id uuid, leader_name text, leader_title text, leader_phone text, leader_photo text,
              leader_public boolean, status text)
language plpgsql stable security definer set search_path = '' as $$
declare v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_level is not null and p_level not in ('district','sector','cell','village') then
    raise exception 'Unknown level' using errcode = '22023';
  end if;
  return query
  select b.id, b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng), coalesce(pb.name_kiny, pb.name_eng),
         l.user_id, l.display_name, l.job_title, l.phone, l.photo_path, l.is_public,
         case when l.user_id is null then 'record'
              when coalesce(p.must_change_password, false) then 'invited'
              else 'active' end
  from public.office_unit_leaders l
  join public.boundaries b on b.id = l.unit_id and b.valid_to is null
  left join public.boundaries pb on pb.id = b.parent_id
  left join public.office_profiles p on p.user_id = l.user_id
  where private.office_in_scope(auth.uid(), b.scope_code, false)
    and (p_level is null or b.level::text = p_level)
    and (v_q is null
         or l.display_name ilike '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
         or b.name_kiny ilike '%' || replace(replace(v_q, '%', ''), '_', '') || '%')
  order by case b.level::text when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 4 end,
           b.name_kiny
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
end $$;

-- One card in full (for the edit form): includes email, bio and hours.
create or replace function public.get_office_unit_leader_v1(p_unit_id uuid)
returns table(unit_id uuid, scope_code text, level text, unit_name text, user_id uuid, display_name text,
              job_title text, phone text, public_email text, bio text, office_hours text, photo_path text,
              is_public boolean, show_phone boolean, can_edit boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return query
  select b.id, b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng),
         l.user_id, l.display_name, l.job_title, l.phone, l.public_email, l.bio, l.office_hours, l.photo_path,
         coalesce(l.is_public, true), coalesce(l.show_phone, true),
         b.level::text in ('district','sector','cell','village')
  from public.boundaries b
  left join public.office_unit_leaders l on l.unit_id = b.id
  where b.id = p_unit_id and b.valid_to is null
    and private.office_in_scope(auth.uid(), b.scope_code, false);
  if not found then raise exception 'Outside your scope' using errcode = '42501'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- Create or edit a card. Allowed for my own unit and for any unit below me.
-- ---------------------------------------------------------------------------
create or replace function public.save_office_unit_leader_v1(
  p_unit_id uuid,
  p_display_name text,
  p_job_title text default null,
  p_phone text default null,
  p_public_email text default null,
  p_bio text default null,
  p_office_hours text default null,
  p_is_public boolean default true,
  p_show_phone boolean default true,
  p_photo_path text default null,
  p_remove_photo boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_unit record; v_user uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select b.id, b.scope_code, b.level::text as level into v_unit
  from public.boundaries b where b.id = p_unit_id and b.valid_to is null;
  if v_unit is null then raise exception 'Unknown place' using errcode = '22023'; end if;
  if v_unit.level not in ('district','sector','cell','village') then
    raise exception 'Leader cards exist for district, sector, cell and village only' using errcode = '22023';
  end if;
  if not private.office_in_scope(auth.uid(), v_unit.scope_code, false) then
    raise exception 'No authority at this place' using errcode = '42501';
  end if;
  if p_photo_path is not null and left(p_photo_path, 7 + 36 + 1) <> 'office/' || p_unit_id::text || '/' then
    raise exception 'Photo does not belong to this place' using errcode = '22023';
  end if;

  insert into public.office_unit_leaders(unit_id, display_name, job_title, phone, public_email, bio, office_hours,
                                         is_public, show_phone, photo_path, updated_by)
  values (p_unit_id, btrim(p_display_name),
          nullif(btrim(coalesce(p_job_title,'')),''), nullif(btrim(coalesce(p_phone,'')),''),
          nullif(btrim(coalesce(p_public_email,'')),''), nullif(btrim(coalesce(p_bio,'')),''),
          nullif(btrim(coalesce(p_office_hours,'')),''),
          coalesce(p_is_public, true), coalesce(p_show_phone, true), p_photo_path, auth.uid())
  on conflict (unit_id) do update
    set display_name = excluded.display_name,
        job_title = excluded.job_title,
        phone = excluded.phone,
        public_email = excluded.public_email,
        bio = excluded.bio,
        office_hours = excluded.office_hours,
        is_public = excluded.is_public,
        show_phone = excluded.show_phone,
        photo_path = case when p_remove_photo then null
                          when p_photo_path is not null then p_photo_path
                          else public.office_unit_leaders.photo_path end,
        updated_by = auth.uid(),
        updated_at = now()
  returning user_id into v_user;

  -- keep the login profile (names in messages) consistent with the card
  if v_user is not null then
    update public.office_profiles
       set display_name = btrim(p_display_name),
           job_title = nullif(btrim(coalesce(p_job_title,'')),''),
           phone = nullif(btrim(coalesce(p_phone,'')),''),
           updated_at = now()
     where user_id = v_user;
  end if;
  return p_unit_id;
end $$;

-- A card that has no login behind it (typically a village leader) may be removed by someone above it.
create or replace function public.remove_office_unit_leader_v1(p_unit_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_scope text; v_deleted integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select b.scope_code into v_scope from public.boundaries b where b.id = p_unit_id and b.valid_to is null;
  if v_scope is null or not private.office_in_scope(auth.uid(), v_scope, true) then
    raise exception 'No authority at this place' using errcode = '42501';
  end if;
  delete from public.office_unit_leaders where unit_id = p_unit_id and user_id is null;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end $$;

-- ---------------------------------------------------------------------------
-- Public read path (citizens): approved public fields only, for the places the engine resolved.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_unit_leaders_v1(p_scope_codes text[])
returns table(scope_code text, level text, unit_name text, display_name text, job_title text, phone text,
              public_email text, bio text, office_hours text, photo_path text)
language sql stable security definer set search_path = '' as $$
  select b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng),
         l.display_name, l.job_title,
         case when l.show_phone then l.phone else null end,
         l.public_email, l.bio, l.office_hours, l.photo_path
  from public.office_unit_leaders l
  join public.boundaries b on b.id = l.unit_id and b.valid_to is null
  where l.is_public
    and b.scope_code = any ((select coalesce(array_agg(x), '{}') from unnest(p_scope_codes) x
                             where char_length(x) <= 40 limit 12)::text[]);
$$;

-- Execute rights.
revoke all on function
  public.get_office_workspace_v1(), public.list_office_units_v1(text),
  public.list_office_leaders_v1(text,text,integer), public.get_office_unit_leader_v1(uuid),
  public.save_office_unit_leader_v1(uuid,text,text,text,text,text,text,boolean,boolean,text,boolean),
  public.remove_office_unit_leader_v1(uuid), public.get_public_unit_leaders_v1(text[]),
  public.create_office_account_v1(uuid,text,text,text,text,text,uuid)
from public, anon;
grant execute on function
  public.get_office_workspace_v1(), public.list_office_units_v1(text),
  public.list_office_leaders_v1(text,text,integer), public.get_office_unit_leader_v1(uuid),
  public.save_office_unit_leader_v1(uuid,text,text,text,text,text,text,boolean,boolean,text,boolean),
  public.remove_office_unit_leader_v1(uuid), public.create_office_account_v1(uuid,text,text,text,text,text,uuid)
to authenticated;
grant execute on function public.get_public_unit_leaders_v1(text[]) to anon, authenticated;

commit;
