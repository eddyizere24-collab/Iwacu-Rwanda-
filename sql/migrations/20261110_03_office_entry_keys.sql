-- IWACU RWANDA — Entry keys (M7): the key that opens the District, Sector and Cell offices.
-- Additive. National (with its second step) sets one key per level; the server checks what people type against a
-- salted hash kept here and never stores or returns the key itself. Places get their own login the first time
-- someone enters with the right key, so nothing has to be prepared per place in advance.
--   * office_entry_keys / office_entry_key_log : the hashes (no grants) and who changed which level, when.
--   * office_entry_key_get_v1 / office_entry_key_set_v1 : SERVER ONLY (service_role).
--   * office_entry_create_account_v1 / office_entry_settle_v1 : SERVER ONLY. First entry creates the place's account.
--   * authorize_office_entry_key_v1 / get_office_entry_keys_status_v1 : National only (second step required).
--   * list_office_audit_v1 : replaced to include entry_key_set.
begin;

create table if not exists public.office_entry_keys (
  level text primary key check (level in ('district','sector','cell')),
  salt text not null check (char_length(salt) between 16 and 64),
  hash text not null check (char_length(hash) between 32 and 256),
  set_by uuid references auth.users(id) on delete set null,
  set_at timestamptz not null default now()
);
create table if not exists public.office_entry_key_log (
  id bigint generated always as identity primary key,
  level text not null check (level in ('district','sector','cell')),
  actor uuid not null references auth.users(id) on delete restrict,
  at timestamptz not null default now()
);
alter table public.office_entry_keys enable row level security;
alter table public.office_entry_key_log enable row level security;
revoke all on table public.office_entry_keys, public.office_entry_key_log from public, anon, authenticated;

-- National only (the second step is enforced inside leader_actor_can). Records who changed which level.
create or replace function public.authorize_office_entry_key_v1(p_level text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_level not in ('district','sector','cell') then raise exception 'Unknown level' using errcode = '22023'; end if;
  if not private.leader_actor_can('manage_admins', null) then
    raise exception 'Only the national office sets entry keys' using errcode = '42501';
  end if;
  insert into public.office_entry_key_log(level, actor) values (p_level, auth.uid());
end $$;

create or replace function public.get_office_entry_keys_status_v1()
returns table(level text, is_set boolean, set_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.leader_actor_can('manage_admins', null) then
    raise exception 'Only the national office sees entry keys' using errcode = '42501';
  end if;
  return query
  select l.level, k.level is not null, k.set_at
  from (values ('district'),('sector'),('cell')) l(level)
  left join public.office_entry_keys k on k.level = l.level
  order by case l.level when 'district' then 1 when 'sector' then 2 else 3 end;
end $$;

create or replace function public.office_entry_key_get_v1(p_level text)
returns table(salt text, hash text)
language sql stable security definer set search_path = '' as $$
  select k.salt, k.hash from public.office_entry_keys k where k.level = p_level;
$$;

create or replace function public.office_entry_key_set_v1(p_level text, p_salt text, p_hash text, p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_level not in ('district','sector','cell') then raise exception 'Unknown level' using errcode = '22023'; end if;
  insert into public.office_entry_keys(level, salt, hash, set_by, set_at) values (p_level, p_salt, p_hash, p_actor, now())
  on conflict (level) do update set salt = excluded.salt, hash = excluded.hash, set_by = excluded.set_by, set_at = now();
end $$;

-- First entry to a place that has no account: record its account (the server created the Auth user with a password nobody knows).
create or replace function public.office_entry_create_account_v1(p_user_id uuid, p_login_name text, p_unit_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_level text; v_name text; v_role text;
begin
  select b.level::text, coalesce(b.name_kiny, b.name_eng) into v_level, v_name
  from public.boundaries b where b.id = p_unit_id and b.valid_to is null;
  v_role := case v_level when 'district' then 'district_admin' when 'sector' then 'sector_admin' when 'cell' then 'cell_admin' else null end;
  if v_role is null then raise exception 'Only district, sector and cell places have an office' using errcode = '22023'; end if;
  if exists (select 1 from public.admin_role_assignments a where a.administrative_unit_id = p_unit_id
             and a.assignment_status = 'active' and a.role_code in ('district_admin','sector_admin','cell_admin')
             and a.valid_from <= now() and (a.valid_until is null or a.valid_until > now())) then
    raise exception 'This place already has an account' using errcode = '23505';
  end if;
  insert into public.admin_role_assignments(user_id, role_code, administrative_unit_id, grant_reason)
  values (p_user_id, v_role, p_unit_id, 'Konti y''ahantu yaremwe ubwa mbere hinjiwe n''urufunguzo');
  insert into public.office_profiles(user_id, login_name, display_name, job_title, phone, created_by, must_change_password)
  values (p_user_id, lower(btrim(p_login_name)), v_name, null, null, null, false);
end $$;

-- Entering by key is the way in for these places: an older account of a place must not send the person to a password page.
create or replace function public.office_entry_settle_v1(p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.office_profiles set must_change_password = false, updated_at = now() where user_id = p_user_id and must_change_password;
$$;

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
    union all
    select l.at, 'entry_key_set', l.actor, (select b0.id from public.boundaries b0 where b0.scope_code = 'RW' and b0.valid_to is null limit 1), l.level
    from public.office_entry_key_log l
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


revoke all on function public.office_entry_key_get_v1(text), public.office_entry_key_set_v1(text, text, text, uuid),
  public.office_entry_create_account_v1(uuid, text, uuid), public.office_entry_settle_v1(uuid) from public, anon, authenticated;
grant execute on function public.office_entry_key_get_v1(text), public.office_entry_key_set_v1(text, text, text, uuid),
  public.office_entry_create_account_v1(uuid, text, uuid), public.office_entry_settle_v1(uuid) to service_role;
revoke all on function public.authorize_office_entry_key_v1(text), public.get_office_entry_keys_status_v1(), public.list_office_audit_v1(integer, integer) from public, anon;
grant execute on function public.authorize_office_entry_key_v1(text), public.get_office_entry_keys_status_v1(), public.list_office_audit_v1(integer, integer) to authenticated;

commit;
