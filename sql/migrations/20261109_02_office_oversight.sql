-- IWACU RWANDA — Office oversight (M4b): unit dossiers, nationwide search, accounts & access, support cases, tasks, audit.
-- Additive only. Builds on 20261109_01_office_workspaces.sql. Every function runs under the caller's JWT and checks scope in the database.
begin;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- The caller's highest active scope (country > district > sector > cell).
create or replace function private.office_top_scope(p_user uuid)
returns table(role_code text, unit_id uuid, scope_code text, unit_level text)
language sql stable security definer set search_path = '' as $$
  select s.role_code, s.unit_id, s.scope_code, s.unit_level
  from private.office_scopes(p_user) s
  order by case s.unit_level when 'country' then 0 when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 9 end
  limit 1;
$$;
revoke all on function private.office_top_scope(uuid) from public, anon, authenticated;

-- invited = never signed in and changed the temporary password; suspended = access switched off.
create or replace function private.office_account_status(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when p_user is null then null
    when exists (select 1 from public.admin_role_assignments a where a.user_id = p_user and a.assignment_status = 'active')
      then case when coalesce((select p.must_change_password from public.office_profiles p where p.user_id = p_user), false) then 'invited' else 'active' end
    when exists (select 1 from public.admin_role_assignments a where a.user_id = p_user and a.assignment_status = 'suspended') then 'suspended'
    else 'revoked' end;
$$;
revoke all on function private.office_account_status(uuid) from public, anon, authenticated;

-- Level of the units an office at this level manages.
create or replace function private.office_level_below(p_level text)
returns text language sql immutable set search_path = '' as $$
  select case p_level when 'country' then 'district' when 'district' then 'sector' when 'sector' then 'cell' when 'cell' then 'village' else null end;
$$;
revoke all on function private.office_level_below(text) from public, anon, authenticated;

-- Citizen cases (feedback) mapped to the place they are about.
create or replace function private.office_case_units()
returns table(id uuid, category text, message text, status text, created_at timestamptz, unit_id uuid, scope_code text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.category, f.message, f.status, f.created_at, b.id, b.scope_code
  from public.leader_public_feedback f
  left join public.leader_appointments a on a.id = f.appointment_id
  join public.boundaries b on b.id = coalesce(f.administrative_unit_id, a.administrative_unit_id);
$$;
revoke all on function private.office_case_units() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tasks (imirimo): issued downwards with a deadline, tracked per unit, reviewed by the issuer.
-- ---------------------------------------------------------------------------
create sequence if not exists private.office_task_seq;

create table if not exists public.office_tasks (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  body text check (body is null or char_length(body) <= 4000),
  priority text not null default 'normal' check (priority in ('normal','high','critical')),
  due_at timestamptz not null,
  issued_by uuid not null references auth.users(id) on delete restrict,
  issuer_unit_id uuid not null references public.boundaries(id) on delete restrict,
  parent_task_id uuid references public.office_tasks(id) on delete set null,
  status text not null default 'open' check (status in ('open','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists office_tasks_issuer_idx on public.office_tasks(issuer_unit_id, created_at desc);

create table if not exists public.office_task_targets (
  task_id uuid not null references public.office_tasks(id) on delete cascade,
  unit_id uuid not null references public.boundaries(id) on delete restrict,
  status text not null default 'assigned' check (status in ('assigned','acknowledged','in_progress','submitted','returned','approved')),
  note text check (note is null or char_length(note) <= 2000),
  review_note text check (review_note is null or char_length(review_note) <= 2000),
  acknowledged_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (task_id, unit_id)
);
create index if not exists office_task_targets_unit_idx on public.office_task_targets(unit_id, status);

alter table public.office_tasks enable row level security;
alter table public.office_task_targets enable row level security;
revoke all on table public.office_tasks, public.office_task_targets from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Dossier of one place (or the caller's own top place when p_scope is null).
-- ---------------------------------------------------------------------------
create or replace function public.get_office_unit_v1(p_scope text default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_top record; v_unit record; v_pref text; v_below text;
  v_levels jsonb; v_children jsonb; v_ancestors jsonb; v_leader jsonb; v_cases jsonb; v_recent jsonb;
  v_attention jsonb; v_tasks jsonb; v_messages jsonb := null; v_case_counts jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_top from private.office_top_scope(auth.uid());
  if v_top.unit_id is null then raise exception 'No office scope' using errcode = '42501'; end if;
  select b.id, b.scope_code, b.level::text as level, b.name_kiny, b.name_eng, b.parent_id into v_unit
  from public.boundaries b where b.scope_code = coalesce(p_scope, v_top.scope_code) and b.valid_to is null;
  if v_unit.id is null or not private.office_in_scope(auth.uid(), v_unit.scope_code, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  v_pref := v_unit.scope_code || '-%';
  v_below := private.office_level_below(v_unit.level);

  -- Coverage per level inside this place.
  select coalesce(jsonb_object_agg(x.level, jsonb_build_object('total', x.total, 'with_leader', x.with_leader,
           'with_account', x.with_account, 'signed_in', x.signed_in)), '{}'::jsonb) into v_levels
  from (
    select b.level::text as level, count(*)::int as total, count(l.unit_id)::int as with_leader,
           count(l.user_id)::int as with_account,
           count(p.user_id) filter (where not p.must_change_password)::int as signed_in
    from public.boundaries b
    left join public.office_unit_leaders l on l.unit_id = b.id
    left join public.office_profiles p on p.user_id = l.user_id
    where b.valid_to is null and b.scope_code like v_pref
    group by b.level
  ) x;

  -- Ancestors the caller is allowed to see (breadcrumb).
  with recursive up as (
    select b.id, b.parent_id, b.scope_code, b.level::text as level, coalesce(b.name_kiny, b.name_eng) as name, 0 as depth
    from public.boundaries b where b.id = v_unit.parent_id
    union all
    select b.id, b.parent_id, b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng), up.depth + 1
    from public.boundaries b join up on b.id = up.parent_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('scope_code', u.scope_code, 'level', u.level, 'name', u.name) order by u.depth desc), '[]'::jsonb)
    into v_ancestors
  from up u where private.office_in_scope(auth.uid(), u.scope_code, false);

  -- The leader card of this place.
  select jsonb_build_object(
           'display_name', l.display_name, 'job_title', l.job_title, 'phone', l.phone, 'public_email', l.public_email,
           'office_hours', l.office_hours, 'bio', l.bio, 'photo_path', l.photo_path, 'is_public', l.is_public,
           'has_account', l.user_id is not null, 'status', coalesce(private.office_account_status(l.user_id), 'record'),
           'login_name', p.login_name, 'user_id', l.user_id, 'updated_at', l.updated_at)
    into v_leader
  from public.office_unit_leaders l left join public.office_profiles p on p.user_id = l.user_id
  where l.unit_id = v_unit.id;

  -- Direct children with their own coverage inside.
  select coalesce(jsonb_agg(c.row order by c.name), '[]'::jsonb) into v_children
  from (
    select coalesce(b.name_kiny, b.name_eng) as name,
      jsonb_build_object(
        'unit_id', b.id, 'scope_code', b.scope_code, 'level', b.level::text, 'name', coalesce(b.name_kiny, b.name_eng),
        'sub', (select coalesce(jsonb_object_agg(q.level, q.n), '{}'::jsonb)
                from (select d.level::text as level, count(*)::int as n from public.boundaries d
                      where d.valid_to is null and d.scope_code like b.scope_code || '-%' group by d.level) q),
        'cards_inside', (select count(*)::int from public.office_unit_leaders l2 join public.boundaries d on d.id = l2.unit_id
                         where d.valid_to is null and d.scope_code like b.scope_code || '-%'),
        'open_cases', (select count(*)::int from private.office_case_units() k
                       where k.status in ('new','reviewing') and (k.scope_code = b.scope_code or k.scope_code like b.scope_code || '-%')),
        'leader_name', l.display_name, 'leader_title', l.job_title, 'leader_phone', l.phone, 'leader_photo', l.photo_path,
        'status', case when l.unit_id is null then 'vacant' else coalesce(private.office_account_status(l.user_id), 'record') end,
        'card_expected', b.level::text in ('district','sector','cell','village')
      ) as row
    from public.boundaries b
    left join public.office_unit_leaders l on l.unit_id = b.id
    where b.parent_id = v_unit.id and b.valid_to is null
  ) c;

  -- Cases (citizen feedback) about this place and everything below it.
  select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb) into v_case_counts
  from (select k.status, count(*)::int as n from private.office_case_units() k
        where k.scope_code = v_unit.scope_code or k.scope_code like v_pref group by k.status) s;
  select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'category', k.category, 'message', left(k.message, 200),
           'status', k.status, 'created_at', k.created_at, 'scope_code', k.scope_code,
           'unit_name', coalesce(b.name_kiny, b.name_eng), 'level', b.level::text) order by k.created_at desc), '[]'::jsonb)
    into v_cases
  from (select * from private.office_case_units() k0 where (k0.scope_code = v_unit.scope_code or k0.scope_code like v_pref)
        and k0.status in ('new','reviewing') order by k0.created_at desc limit 5) k
  join public.boundaries b on b.id = k.unit_id;

  -- Recent changes to leader cards inside this place.
  select coalesce(jsonb_agg(jsonb_build_object('at', a.changed_at, 'action', a.action, 'scope_code', b.scope_code,
           'unit_name', coalesce(b.name_kiny, b.name_eng), 'level', b.level::text,
           'who', coalesce(p.display_name, 'Sisitemu'),
           'leader_name', coalesce(a.new_row ->> 'display_name', a.old_row ->> 'display_name')) order by a.changed_at desc), '[]'::jsonb)
    into v_recent
  from (select * from public.office_unit_leader_audit au order by au.changed_at desc limit 400) a
  join public.boundaries b on b.id = a.unit_id
  left join public.office_profiles p on p.user_id = a.changed_by
  where (b.scope_code = v_unit.scope_code or b.scope_code like v_pref)
  limit 8;

  -- What needs attention.
  select jsonb_build_object(
    'vacant_units', case when v_below is null then null else
        (select count(*)::int from public.boundaries b left join public.office_unit_leaders l on l.unit_id = b.id
         where b.valid_to is null and b.level::text = v_below and b.scope_code like v_pref and l.unit_id is null) end,
    'vacant_level', v_below,
    'waiting_login_over_7d', (select count(*)::int from public.office_unit_leaders l join public.boundaries b on b.id = l.unit_id
         join public.office_profiles p on p.user_id = l.user_id
         where b.valid_to is null and b.scope_code like v_pref and p.must_change_password and p.created_at < now() - interval '7 days'),
    'cards_without_phone', (select count(*)::int from public.office_unit_leaders l join public.boundaries b on b.id = l.unit_id
         where b.valid_to is null and b.scope_code like v_pref and l.phone is null),
    'open_cases', (select count(*)::int from private.office_case_units() k
         where k.status in ('new','reviewing') and (k.scope_code = v_unit.scope_code or k.scope_code like v_pref))
  ) into v_attention;

  -- Tasks sent into this place.
  select jsonb_build_object(
    'open_targets', count(*) filter (where t.status = 'open' and tt.status in ('assigned','acknowledged','in_progress','returned'))::int,
    'overdue_targets', count(*) filter (where t.status = 'open' and tt.status in ('assigned','acknowledged','in_progress','returned') and t.due_at < now())::int,
    'waiting_review', count(*) filter (where t.status = 'open' and tt.status = 'submitted')::int)
    into v_tasks
  from public.office_task_targets tt join public.office_tasks t on t.id = tt.task_id
  join public.boundaries b on b.id = tt.unit_id
  where b.scope_code = v_unit.scope_code or b.scope_code like v_pref;

  -- My own message activity (only on the caller's own top place).
  if v_unit.id = v_top.unit_id then
    select jsonb_build_object(
      'sent_30d', count(distinct m.id)::int,
      'delivered_30d', count(r.recipient_id)::int,
      'read_30d', count(r.read_at)::int)
      into v_messages
    from public.office_messages m left join public.office_message_recipients r on r.message_id = m.id
    where m.sender_id = auth.uid() and m.created_at > now() - interval '30 days';
  end if;

  return jsonb_build_object(
    'unit', jsonb_build_object('unit_id', v_unit.id, 'scope_code', v_unit.scope_code, 'level', v_unit.level,
            'name_kiny', v_unit.name_kiny, 'name_eng', v_unit.name_eng, 'child_level', v_below,
            'is_my_top', v_unit.id = v_top.unit_id, 'card_expected', v_unit.level in ('district','sector','cell','village')),
    'ancestors', v_ancestors, 'leader', v_leader, 'levels', v_levels, 'children', v_children,
    'case_counts', v_case_counts, 'cases', v_cases, 'recent', v_recent, 'attention', v_attention,
    'tasks', coalesce(v_tasks, '{}'::jsonb), 'messages', v_messages, 'as_of', now());
end $$;

-- ---------------------------------------------------------------------------
-- Search / list places anywhere inside the caller's scope (all 30 districts, all 416 sectors, ...).
-- ---------------------------------------------------------------------------
create or replace function public.search_office_units_v1(
  p_q text default null, p_level text default null, p_vacant boolean default null,
  p_limit integer default 50, p_offset integer default 0)
returns table(unit_id uuid, scope_code text, level text, name text, parent_name text, leader_name text,
              leader_title text, leader_phone text, leader_photo text, status text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_q text := nullif(replace(replace(btrim(coalesce(p_q, '')), '%', ''), '_', ''), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_level is not null and p_level not in ('province','district','sector','cell','village') then
    raise exception 'Unknown level' using errcode = '22023';
  end if;
  return query
  with my as (select m.scope_code from private.office_scopes(auth.uid()) m),
  f as (
    select b.id, b.scope_code, b.level::text as lvl, b.name_kiny, b.name_eng, b.parent_id, count(*) over() as total_n
    from public.boundaries b
    left join public.office_unit_leaders l on l.unit_id = b.id
    where b.valid_to is null and b.level::text <> 'country'
      and exists (select 1 from my where b.scope_code = my.scope_code or b.scope_code like my.scope_code || '-%')
      and (p_level is null or b.level::text = p_level)
      and (p_vacant is null or (p_vacant and l.unit_id is null and b.level::text in ('district','sector','cell','village'))
                            or (not p_vacant and l.unit_id is not null))
      and (v_q is null or b.name_kiny ilike '%' || v_q || '%' or b.name_eng ilike '%' || v_q || '%'
           or l.display_name ilike '%' || v_q || '%')
    order by case b.level::text when 'province' then 0 when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 4 end,
             b.name_kiny, b.id
    limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
  )
  select f.id, f.scope_code, f.lvl, coalesce(f.name_kiny, f.name_eng), coalesce(pb.name_kiny, pb.name_eng),
         l.display_name, l.job_title, l.phone, l.photo_path,
         case when l.unit_id is null then 'vacant' else coalesce(private.office_account_status(l.user_id), 'record') end,
         f.total_n
  from f
  left join public.boundaries pb on pb.id = f.parent_id
  left join public.office_unit_leaders l on l.unit_id = f.id
  order by case f.lvl when 'province' then 0 when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 4 end,
           f.name_kiny, f.id;
end $$;

-- ---------------------------------------------------------------------------
-- Accounts and access
-- ---------------------------------------------------------------------------
create or replace function public.list_office_accounts_v1(
  p_search text default null, p_status text default null, p_limit integer default 50, p_offset integer default 0)
returns table(user_id uuid, display_name text, job_title text, phone text, login_name text, role_code text,
              unit_id uuid, scope_code text, unit_level text, unit_name text, parent_name text, status text,
              created_at timestamptz, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_q text := nullif(replace(replace(btrim(coalesce(p_search, '')), '%', ''), '_', ''), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status is not null and p_status not in ('invited','active','suspended') then
    raise exception 'Unknown status' using errcode = '22023';
  end if;
  return query
  select p.user_id, p.display_name, p.job_title, p.phone, p.login_name, a.role_code, b.id, b.scope_code, b.level::text,
         coalesce(b.name_kiny, b.name_eng), coalesce(pb.name_kiny, pb.name_eng),
         private.office_account_status(p.user_id), p.created_at, count(*) over()
  from public.office_profiles p
  join lateral (select a0.* from public.admin_role_assignments a0 where a0.user_id = p.user_id
                order by (a0.assignment_status = 'active') desc, a0.created_at desc limit 1) a on true
  join public.boundaries b on b.id = a.administrative_unit_id
  left join public.boundaries pb on pb.id = b.parent_id
  where private.office_in_scope(auth.uid(), b.scope_code, true)
    and (p_status is null or private.office_account_status(p.user_id) = p_status)
    and (v_q is null or p.display_name ilike '%' || v_q || '%' or p.login_name ilike '%' || v_q || '%'
         or b.name_kiny ilike '%' || v_q || '%')
  order by case b.level::text when 'district' then 1 when 'sector' then 2 when 'cell' then 3 else 4 end, b.name_kiny
  limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Switch an account on or off (suspended accounts cannot act at all). Only for accounts strictly below the caller.
create or replace function public.set_office_account_active_v1(p_user uuid, p_active boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v_a record; v_changed integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'You cannot change your own access' using errcode = '22023'; end if;
  for v_a in
    select a.id, a.administrative_unit_id, b.scope_code, a.assignment_status
    from public.admin_role_assignments a join public.boundaries b on b.id = a.administrative_unit_id
    where a.user_id = p_user and a.assignment_status in ('active','suspended')
  loop
    if not private.office_in_scope(auth.uid(), v_a.scope_code, true)
       or not private.leader_actor_can('manage_admins', v_a.administrative_unit_id) then
      raise exception 'No authority over this account' using errcode = '42501';
    end if;
    update public.admin_role_assignments
       set assignment_status = case when p_active then 'active' else 'suspended' end, updated_at = now()
     where id = v_a.id and assignment_status = case when p_active then 'suspended' else 'active' end;
    v_changed := v_changed + 1;
  end loop;
  if v_changed = 0 then raise exception 'Account not found' using errcode = '22023'; end if;
  return private.office_account_status(p_user);
end $$;

-- Step 1 of a password reset: the database confirms authority and forces a new password at next sign-in.
-- (The server then sets the new temporary password with the Auth admin API; it is never stored here.)
create or replace function public.prepare_office_reset_v1(p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_ok boolean := false; v_a record;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'You cannot reset your own access here' using errcode = '22023'; end if;
  for v_a in
    select a.administrative_unit_id, b.scope_code from public.admin_role_assignments a
    join public.boundaries b on b.id = a.administrative_unit_id
    where a.user_id = p_user and a.assignment_status in ('active','suspended')
  loop
    if not private.office_in_scope(auth.uid(), v_a.scope_code, true)
       or not private.leader_actor_can('manage_admins', v_a.administrative_unit_id) then
      raise exception 'No authority over this account' using errcode = '42501';
    end if;
    v_ok := true;
  end loop;
  if not v_ok then raise exception 'Account not found' using errcode = '22023'; end if;
  update public.office_profiles set must_change_password = true, updated_at = now() where user_id = p_user;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Cases (citizen feedback)
-- ---------------------------------------------------------------------------
create or replace function public.list_office_cases_v1(
  p_status text default null, p_scope text default null, p_limit integer default 30, p_offset integer default 0)
returns table(id uuid, category text, message text, status text, created_at timestamptz, scope_code text, level text,
              unit_name text, parent_name text, leader_name text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status is not null and p_status not in ('new','reviewing','resolved','rejected','open') then
    raise exception 'Unknown status' using errcode = '22023';
  end if;
  if p_scope is not null and not private.office_in_scope(auth.uid(), p_scope, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  return query
  select k.id, k.category, k.message, k.status, k.created_at, b.scope_code, b.level::text,
         coalesce(b.name_kiny, b.name_eng), coalesce(pb.name_kiny, pb.name_eng), l.display_name, count(*) over()
  from private.office_case_units() k
  join public.boundaries b on b.id = k.unit_id
  left join public.boundaries pb on pb.id = b.parent_id
  left join public.office_unit_leaders l on l.unit_id = b.id
  where private.office_in_scope(auth.uid(), b.scope_code, false)
    and (p_scope is null or b.scope_code = p_scope or b.scope_code like p_scope || '-%')
    and (p_status is null or (p_status = 'open' and k.status in ('new','reviewing')) or k.status = p_status)
  order by (k.status in ('new','reviewing')) desc, k.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.set_office_case_status_v1(p_id uuid, p_status text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_scope text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status not in ('new','reviewing','resolved','rejected') then raise exception 'Unknown status' using errcode = '22023'; end if;
  select k.scope_code into v_scope from private.office_case_units() k where k.id = p_id;
  if v_scope is null or not private.office_in_scope(auth.uid(), v_scope, false) then
    raise exception 'Outside your scope' using errcode = '42501';
  end if;
  update public.leader_public_feedback set status = p_status where id = p_id;
  return p_status;
end $$;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create or replace function public.create_office_task_v1(
  p_title text, p_body text, p_priority text, p_due_at timestamptz, p_unit_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_top record; v_id uuid; v_n integer; v_bad integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_top from private.office_top_scope(auth.uid());
  if v_top.unit_id is null or private.office_level_below(v_top.unit_level) is null then
    raise exception 'This office cannot issue tasks' using errcode = '42501';
  end if;
  if p_unit_ids is null or coalesce(array_length(p_unit_ids, 1), 0) not between 1 and 500 then
    raise exception 'Choose between 1 and 500 places' using errcode = '22023';
  end if;
  if p_due_at is null or p_due_at <= now() then raise exception 'The deadline must be in the future' using errcode = '22023'; end if;
  select count(*) into v_n from public.boundaries b where b.id = any (p_unit_ids) and b.valid_to is null;
  select count(*) into v_bad from public.boundaries b
   where b.id = any (p_unit_ids) and (b.level::text not in ('district','sector','cell','village')
        or not private.office_in_scope(auth.uid(), b.scope_code, true));
  if v_n <> (select count(distinct x) from unnest(p_unit_ids) x) or v_bad > 0 then
    raise exception 'Some places are outside your authority' using errcode = '42501';
  end if;
  insert into public.office_tasks(reference, title, body, priority, due_at, issued_by, issuer_unit_id)
  values ('IM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('private.office_task_seq')::text, 4, '0'),
          btrim(p_title), nullif(btrim(coalesce(p_body, '')), ''), coalesce(p_priority, 'normal'), p_due_at, auth.uid(), v_top.unit_id)
  returning id into v_id;
  insert into public.office_task_targets(task_id, unit_id, updated_by)
  select v_id, x, auth.uid() from (select distinct unnest(p_unit_ids) as x) u;
  return v_id;
end $$;

create or replace function public.list_office_tasks_v1(p_view text default 'issued', p_limit integer default 50, p_offset integer default 0)
returns table(id uuid, reference text, title text, priority text, due_at timestamptz, status text, created_at timestamptz,
              issuer_name text, targets integer, acknowledged integer, in_progress integer, submitted integer,
              approved integer, returned integer, overdue integer, my_status text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_view not in ('issued','assigned') then raise exception 'Unknown view' using errcode = '22023'; end if;
  return query
  select t.id, t.reference, t.title, t.priority, t.due_at, t.status, t.created_at,
         coalesce(p.display_name, 'Ibiro'),
         count(tt.unit_id)::int,
         count(*) filter (where tt.status = 'acknowledged')::int,
         count(*) filter (where tt.status = 'in_progress')::int,
         count(*) filter (where tt.status = 'submitted')::int,
         count(*) filter (where tt.status = 'approved')::int,
         count(*) filter (where tt.status = 'returned')::int,
         count(*) filter (where t.status = 'open' and tt.status in ('assigned','acknowledged','in_progress','returned') and t.due_at < now())::int,
         (select tt2.status from public.office_task_targets tt2
           where tt2.task_id = t.id and tt2.unit_id in (select s.unit_id from private.office_scopes(auth.uid()) s) limit 1),
         count(*) over()
  from public.office_tasks t
  join public.boundaries ib on ib.id = t.issuer_unit_id
  left join public.office_profiles p on p.user_id = t.issued_by
  join public.office_task_targets tt on tt.task_id = t.id
  join public.boundaries tb on tb.id = tt.unit_id
  where case p_view
          when 'issued' then private.office_in_scope(auth.uid(), ib.scope_code, false) and private.office_in_scope(auth.uid(), tb.scope_code, true)
          else tt.unit_id in (select s.unit_id from private.office_scopes(auth.uid()) s) end
  group by t.id, p.display_name
  order by (t.status = 'open') desc, t.due_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.get_office_task_v1(p_task uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_t record; v_targets jsonb; v_issuer_scope text; v_manages boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select t.*, ib.scope_code as issuer_scope, coalesce(p.display_name, 'Ibiro') as issuer_name, coalesce(ib.name_kiny, ib.name_eng) as issuer_unit
    into v_t
  from public.office_tasks t join public.boundaries ib on ib.id = t.issuer_unit_id
  left join public.office_profiles p on p.user_id = t.issued_by where t.id = p_task;
  if v_t.id is null then raise exception 'Outside your scope' using errcode = '42501'; end if;
  v_manages := private.office_in_scope(auth.uid(), v_t.issuer_scope, false);
  select coalesce(jsonb_agg(jsonb_build_object(
           'unit_id', b.id, 'scope_code', b.scope_code, 'level', b.level::text, 'name', coalesce(b.name_kiny, b.name_eng),
           'parent_name', coalesce(pb.name_kiny, pb.name_eng), 'leader_name', l.display_name,
           'status', tt.status, 'note', tt.note, 'review_note', tt.review_note,
           'acknowledged_at', tt.acknowledged_at, 'submitted_at', tt.submitted_at, 'reviewed_at', tt.reviewed_at,
           'overdue', v_t.status = 'open' and tt.status in ('assigned','acknowledged','in_progress','returned') and v_t.due_at < now(),
           'can_review', v_manages and tt.status = 'submitted' and private.office_in_scope(auth.uid(), b.scope_code, true),
           'can_update', exists (select 1 from private.office_scopes(auth.uid()) s where s.unit_id = b.id) and tt.status <> 'approved')
         order by b.name_kiny), '[]'::jsonb)
    into v_targets
  from public.office_task_targets tt
  join public.boundaries b on b.id = tt.unit_id
  left join public.boundaries pb on pb.id = b.parent_id
  left join public.office_unit_leaders l on l.unit_id = b.id
  where tt.task_id = p_task
    and (private.office_in_scope(auth.uid(), b.scope_code, true)
         or exists (select 1 from private.office_scopes(auth.uid()) s where s.unit_id = b.id));
  if v_targets = '[]'::jsonb and not v_manages then raise exception 'Outside your scope' using errcode = '42501'; end if;
  return jsonb_build_object('task', jsonb_build_object('id', v_t.id, 'reference', v_t.reference, 'title', v_t.title,
           'body', v_t.body, 'priority', v_t.priority, 'due_at', v_t.due_at, 'status', v_t.status, 'created_at', v_t.created_at,
           'issuer_name', v_t.issuer_name, 'issuer_unit', v_t.issuer_unit, 'can_cancel', v_manages and v_t.status = 'open'),
         'targets', v_targets);
end $$;

-- Assignee: acknowledge / start / submit (own unit only). Issuer: approve / return a submitted target.
create or replace function public.update_office_task_target_v1(p_task uuid, p_unit uuid, p_status text, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_t record; v_tt record; v_scope text; v_mine boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status not in ('acknowledged','in_progress','submitted','approved','returned') then
    raise exception 'Unknown status' using errcode = '22023';
  end if;
  select t.id, t.status, ib.scope_code as issuer_scope into v_t
  from public.office_tasks t join public.boundaries ib on ib.id = t.issuer_unit_id where t.id = p_task;
  select tt.* into v_tt from public.office_task_targets tt where tt.task_id = p_task and tt.unit_id = p_unit;
  if v_t.id is null or v_tt.task_id is null then raise exception 'Outside your scope' using errcode = '42501'; end if;
  if v_t.status <> 'open' then raise exception 'This task is closed' using errcode = '22023'; end if;
  select b.scope_code into v_scope from public.boundaries b where b.id = p_unit;
  if p_status in ('approved','returned') then
    if not private.office_in_scope(auth.uid(), v_t.issuer_scope, false) or not private.office_in_scope(auth.uid(), v_scope, true) then
      raise exception 'Only the issuing office can review' using errcode = '42501';
    end if;
    if v_tt.status <> 'submitted' then raise exception 'Only submitted work can be reviewed' using errcode = '22023'; end if;
    update public.office_task_targets
       set status = p_status, review_note = nullif(btrim(coalesce(p_note, '')), ''), reviewed_at = now(), updated_by = auth.uid(), updated_at = now()
     where task_id = p_task and unit_id = p_unit;
  else
    select exists (select 1 from private.office_scopes(auth.uid()) s where s.unit_id = p_unit) into v_mine;
    if not v_mine then raise exception 'Only the receiving office can update this' using errcode = '42501'; end if;
    if v_tt.status = 'approved' then raise exception 'Already approved' using errcode = '22023'; end if;
    if p_status = 'acknowledged' and v_tt.status <> 'assigned' then raise exception 'Already acknowledged' using errcode = '22023'; end if;
    update public.office_task_targets
       set status = p_status,
           note = case when p_note is null then note else nullif(btrim(p_note), '') end,
           acknowledged_at = case when p_status = 'acknowledged' then now() else acknowledged_at end,
           submitted_at = case when p_status = 'submitted' then now() else submitted_at end,
           updated_by = auth.uid(), updated_at = now()
     where task_id = p_task and unit_id = p_unit;
  end if;
  return p_status;
end $$;

create or replace function public.cancel_office_task_v1(p_task uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_scope text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select ib.scope_code into v_scope from public.office_tasks t join public.boundaries ib on ib.id = t.issuer_unit_id where t.id = p_task;
  if v_scope is null or not private.office_in_scope(auth.uid(), v_scope, false) then
    raise exception 'Only the issuing office can cancel' using errcode = '42501';
  end if;
  update public.office_tasks set status = 'cancelled' where id = p_task and status = 'open';
  return found;
end $$;

-- ---------------------------------------------------------------------------
-- Audit trail (what happened, who did it) inside the caller's scope.
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
  public.get_office_unit_v1(text),
  public.search_office_units_v1(text,text,boolean,integer,integer),
  public.list_office_accounts_v1(text,text,integer,integer),
  public.set_office_account_active_v1(uuid,boolean),
  public.prepare_office_reset_v1(uuid),
  public.list_office_cases_v1(text,text,integer,integer),
  public.set_office_case_status_v1(uuid,text),
  public.create_office_task_v1(text,text,text,timestamptz,uuid[]),
  public.list_office_tasks_v1(text,integer,integer),
  public.get_office_task_v1(uuid),
  public.update_office_task_target_v1(uuid,uuid,text,text),
  public.cancel_office_task_v1(uuid),
  public.list_office_audit_v1(integer,integer)
from public, anon;
grant execute on function
  public.get_office_unit_v1(text),
  public.search_office_units_v1(text,text,boolean,integer,integer),
  public.list_office_accounts_v1(text,text,integer,integer),
  public.set_office_account_active_v1(uuid,boolean),
  public.prepare_office_reset_v1(uuid),
  public.list_office_cases_v1(text,text,integer,integer),
  public.set_office_case_status_v1(uuid,text),
  public.create_office_task_v1(text,text,text,timestamptz,uuid[]),
  public.list_office_tasks_v1(text,integer,integer),
  public.get_office_task_v1(uuid),
  public.update_office_task_target_v1(uuid,uuid,text,text),
  public.cancel_office_task_v1(uuid),
  public.list_office_audit_v1(integer,integer)
to authenticated;

commit;
