-- IWACU RWANDA — Place keys (M7): the level above creates / resets the key of each place below it.
-- Additive. A key is the password of the account that holds that place (see M6 entry); it is never stored or readable here.
--   * office_key_events          : who created / reset which place's key, and when (no secret).
--   * list_office_keys_v1        : for one place, its direct children (district/sector/cell) and whether each has a key.
--   * create_office_key_account_v1 : records the account of a place that has none yet (server creates the Auth user first).
--   * reset_office_key_v1        : authorises a reset for a place that already has an account; returns the account to change.
--   * list_office_audit_v1       : replaced to include key_issued / key_reset.
begin;

create table if not exists public.office_key_events (
  id bigint generated always as identity primary key,
  unit_id uuid not null references public.boundaries(id) on delete restrict,
  actor uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('issued','reset')),
  at timestamptz not null default now()
);
create index if not exists office_key_events_unit_idx on public.office_key_events(unit_id, at desc);
alter table public.office_key_events enable row level security;
revoke all on table public.office_key_events from public, anon, authenticated;

-- Direct children of one place (for the country: its districts, provinces are not an office), with key state. Only places the caller may manage are listed.
create or replace function public.list_office_keys_v1(p_scope text)
returns table(unit_id uuid, scope_code text, level text, name text, has_key boolean, last_event_at timestamptz, last_action text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_scope is null or p_scope !~ '^RW(-[A-Za-z0-9]{1,12}){0,5}$' then raise exception 'Bad place' using errcode = '22023'; end if;
  if not private.office_in_scope(auth.uid(), p_scope, false) then
    raise exception 'No authority at this place' using errcode = '42501';
  end if;
  return query
  select c.id, c.scope_code, c.level::text, coalesce(c.name_kiny, c.name_eng),
         exists (select 1 from public.admin_role_assignments a
                 where a.administrative_unit_id = c.id and a.assignment_status = 'active'
                   and a.role_code in ('district_admin','sector_admin','cell_admin')
                   and a.valid_from <= now() and (a.valid_until is null or a.valid_until > now())),
         ev.at, ev.action
  from public.boundaries p
  join public.boundaries c on c.valid_to is null and c.level::text in ('district','sector','cell')
    and (c.parent_id = p.id or (p.level::text = 'country' and c.level::text = 'district'))
  left join lateral (select e.at, e.action from public.office_key_events e where e.unit_id = c.id order by e.at desc, e.id desc limit 1) ev on true
  where p.scope_code = p_scope and p.valid_to is null
    and private.leader_actor_can('manage_admins', c.id)
  order by coalesce(c.name_kiny, c.name_eng), c.scope_code
  limit 500;
end $$;

-- Record the account of a place that has no key yet. The login name is chosen by the server.
create or replace function public.create_office_key_account_v1(p_user_id uuid, p_login_name text, p_unit_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_level text; v_name text; v_role text; v_assignment uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select b.level::text, coalesce(b.name_kiny, b.name_eng) into v_level, v_name
  from public.boundaries b where b.id = p_unit_id and b.valid_to is null;
  v_role := case v_level when 'district' then 'district_admin' when 'sector' then 'sector_admin' when 'cell' then 'cell_admin' else null end;
  if v_role is null then raise exception 'Only district, sector and cell places hold a key' using errcode = '22023'; end if;
  if not private.leader_actor_can('manage_admins', p_unit_id) then
    raise exception 'No authority to create this key' using errcode = '42501';
  end if;
  if exists (select 1 from public.admin_role_assignments a where a.administrative_unit_id = p_unit_id
             and a.assignment_status = 'active' and a.role_code in ('district_admin','sector_admin','cell_admin')
             and a.valid_from <= now() and (a.valid_until is null or a.valid_until > now())) then
    raise exception 'This place already has a key; reset it instead' using errcode = '23505';
  end if;
  insert into public.admin_role_assignments(user_id, role_code, administrative_unit_id, grant_reason)
  values (p_user_id, v_role, p_unit_id, 'Urufunguzo rw''ahantu rwaremwe n''urwego rwo hejuru')
  returning id into v_assignment;
  insert into public.office_profiles(user_id, login_name, display_name, job_title, phone, created_by, must_change_password)
  values (p_user_id, lower(btrim(p_login_name)), v_name, null, null, auth.uid(), false);
  insert into public.office_key_events(unit_id, actor, action) values (p_unit_id, auth.uid(), 'issued');
  return v_assignment;
end $$;

-- Authorise a reset: returns the account behind the place's key. The server then sets the new key in Auth.
create or replace function public.reset_office_key_v1(p_unit_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.leader_actor_can('manage_admins', p_unit_id) then
    raise exception 'No authority to reset this key' using errcode = '42501';
  end if;
  select a.user_id into v_user
  from public.admin_role_assignments a
  join public.boundaries b on b.id = a.administrative_unit_id and b.valid_to is null
  where a.administrative_unit_id = p_unit_id and b.level::text in ('district','sector','cell')
    and a.role_code in ('district_admin','sector_admin','cell_admin') and a.assignment_status = 'active'
    and a.valid_from <= now() and (a.valid_until is null or a.valid_until > now())
  order by a.valid_from desc limit 1;
  if v_user is null then raise exception 'This place has no key yet' using errcode = 'P0002'; end if;
  update public.office_profiles set must_change_password = false, updated_at = now() where user_id = v_user;
  insert into public.office_key_events(unit_id, actor, action) values (p_unit_id, auth.uid(), 'reset');
  return v_user;
end $$;

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
    select k.at, 'key_' || k.action, k.actor, k.unit_id, null::text from public.office_key_events k
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


revoke all on function public.list_office_keys_v1(text), public.create_office_key_account_v1(uuid, text, uuid), public.reset_office_key_v1(uuid), public.list_office_audit_v1(integer, integer) from public, anon;
grant execute on function public.list_office_keys_v1(text), public.create_office_key_account_v1(uuid, text, uuid), public.reset_office_key_v1(uuid), public.list_office_audit_v1(integer, integer) to authenticated;

commit;
