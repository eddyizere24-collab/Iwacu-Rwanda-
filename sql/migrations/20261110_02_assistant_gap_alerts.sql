-- Route missing Ishakiro data to the responsible, currently assigned authority.
-- Stores only an aggregate gap category, administrative scope and assigned authority.
-- No visitor question, name, phone, account, precise location or IP is stored.
begin;

create table if not exists public.assistant_gap_alerts (
  id uuid primary key default gen_random_uuid(),
  gap_type text not null check (gap_type in (
    'leader_missing',
    'contact_missing',
    'place_not_found',
    'capability_data_missing'
  )),
  scope_code text not null default '',
  destination_scope_code text not null,
  recipient_user_id uuid not null references auth.users(id) on delete restrict,
  occurrences bigint not null default 1 check (occurrences > 0),
  status text not null default 'new' check (status in ('new','reviewing','resolved')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint assistant_gap_alert_scope_format check (
    scope_code = '' or scope_code ~ '^RW(-[A-Z0-9]{1,12}){1,5}$'
  ),
  constraint assistant_gap_alert_destination_format check (
    destination_scope_code ~ '^RW(-[A-Z0-9]{1,12}){0,5}$'
  ),
  unique (gap_type, scope_code, recipient_user_id)
);

create index if not exists assistant_gap_alerts_inbox_idx
  on public.assistant_gap_alerts(recipient_user_id, status, last_seen_at desc);

alter table public.assistant_gap_alerts enable row level security;
revoke all on table public.assistant_gap_alerts from public, anon, authenticated;

-- Replace the aggregate-only recorder with one that also creates/upgrades scoped authority alerts.
-- Routing: nearest active cell/sector administration, plus the matching district office.
-- Where no matching district office exists, the national authority receives the fallback alert.
create or replace function public.record_assistant_gap_v1(
  p_gap_type text,
  p_scope_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $assistant_gap$
declare
  v_scope_code text := coalesce(nullif(btrim(p_scope_code), ''), '');
  v_origin public.boundaries%rowtype;
  v_target record;
  v_notified integer := 0;
begin
  if p_gap_type is null or p_gap_type not in (
    'leader_missing',
    'contact_missing',
    'place_not_found',
    'capability_data_missing'
  ) then
    return jsonb_build_object('recorded', false, 'reason', 'invalid_gap_type');
  end if;

  if v_scope_code <> '' then
    select b.* into v_origin
    from public.boundaries b
    where b.scope_code = v_scope_code
      and b.valid_to is null
    limit 1;

    if not found then
      return jsonb_build_object('recorded', false, 'reason', 'unknown_scope');
    end if;
  end if;

  insert into public.assistant_gap_counts (
    gap_type, scope_code, occurrences, first_seen_at, last_seen_at
  )
  values (p_gap_type, v_scope_code, 1, now(), now())
  on conflict (gap_type, scope_code)
  do update set
    occurrences = public.assistant_gap_counts.occurrences + 1,
    last_seen_at = now();

  if v_scope_code = '' then
    for v_target in
      select a.user_id, b.scope_code
      from public.admin_role_assignments a
      join public.boundaries b
        on b.id = a.administrative_unit_id
       and b.valid_to is null
      where a.role_code = 'national_super_admin'
        and b.level::text = 'country'
        and a.assignment_status = 'active'
        and a.valid_from <= now()
        and (a.valid_until is null or a.valid_until > now())
    loop
      insert into public.assistant_gap_alerts (
        gap_type, scope_code, destination_scope_code, recipient_user_id
      )
      values (p_gap_type, v_scope_code, v_target.scope_code, v_target.user_id)
      on conflict (gap_type, scope_code, recipient_user_id)
      do update set
        occurrences = public.assistant_gap_alerts.occurrences + 1,
        last_seen_at = now(),
        status = case when public.assistant_gap_alerts.status = 'resolved' then 'new'
                      else public.assistant_gap_alerts.status end,
        resolved_at = case when public.assistant_gap_alerts.status = 'resolved' then null
                           else public.assistant_gap_alerts.resolved_at end;
      v_notified := v_notified + 1;
    end loop;
  else
    for v_target in
      with candidates as (
        select
          a.user_id,
          a.role_code,
          b.scope_code,
          b.level::text as unit_level,
          greatest(extensions.nlevel(v_origin.path) - extensions.nlevel(b.path), 0) as path_distance
        from public.admin_role_assignments a
        join public.boundaries b
          on b.id = a.administrative_unit_id
         and b.valid_to is null
        where a.assignment_status = 'active'
          and a.valid_from <= now()
          and (a.valid_until is null or a.valid_until > now())
          and v_origin.path <@ b.path
          and (
            (a.role_code = 'cell_admin' and b.level::text = 'cell')
            or (a.role_code = 'sector_admin' and b.level::text = 'sector')
            or (a.role_code = 'district_admin' and b.level::text = 'district')
            or (a.role_code = 'national_super_admin' and b.level::text = 'country')
          )
      ),
      nearest_local as (
        select c.*
        from candidates c
        where c.role_code in ('cell_admin','sector_admin')
          and c.path_distance = (
            select min(c2.path_distance)
            from candidates c2
            where c2.role_code in ('cell_admin','sector_admin')
          )
      ),
      district_authority as (
        select c.*
        from candidates c
        where c.role_code = 'district_admin'
      ),
      national_fallback as (
        select c.*
        from candidates c
        where c.role_code = 'national_super_admin'
          and not exists (select 1 from district_authority)
      )
      select distinct user_id, scope_code
      from (
        select user_id, scope_code from nearest_local
        union all
        select user_id, scope_code from district_authority
        union all
        select user_id, scope_code from national_fallback
      ) routed
    loop
      insert into public.assistant_gap_alerts (
        gap_type, scope_code, destination_scope_code, recipient_user_id
      )
      values (p_gap_type, v_scope_code, v_target.scope_code, v_target.user_id)
      on conflict (gap_type, scope_code, recipient_user_id)
      do update set
        occurrences = public.assistant_gap_alerts.occurrences + 1,
        last_seen_at = now(),
        status = case when public.assistant_gap_alerts.status = 'resolved' then 'new'
                      else public.assistant_gap_alerts.status end,
        resolved_at = case when public.assistant_gap_alerts.status = 'resolved' then null
                           else public.assistant_gap_alerts.resolved_at end;
      v_notified := v_notified + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'recorded', true,
    'notified_authorities', v_notified
  );
end;
$assistant_gap$;

revoke all on function public.record_assistant_gap_v1(text, text) from public;
revoke execute on function public.record_assistant_gap_v1(text, text) from anon, authenticated;
grant execute on function public.record_assistant_gap_v1(text, text) to service_role;

-- Each authority sees only gap alerts routed to its own authenticated account.
create or replace function public.list_assistant_gap_alerts_v1(p_limit integer default 100)
returns table (
  alert_id uuid,
  gap_type text,
  scope_code text,
  place_name text,
  place_level text,
  destination_scope_code text,
  occurrences bigint,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = ''
as $list_gap_alerts$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.admin_role_assignments a
    where a.user_id = auth.uid()
      and a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
  ) then
    raise exception 'Active authority assignment required' using errcode = '42501';
  end if;

  return query
  select
    g.id,
    g.gap_type,
    g.scope_code,
    coalesce(b.name_kiny, 'Aho hantu ntihamenyekanye'),
    coalesce(b.level::text, 'unknown'),
    g.destination_scope_code,
    g.occurrences,
    g.first_seen_at,
    g.last_seen_at,
    g.status
  from public.assistant_gap_alerts g
  left join public.boundaries b
    on b.scope_code = g.scope_code
   and b.valid_to is null
  where g.recipient_user_id = auth.uid()
  order by
    case g.status when 'new' then 0 when 'reviewing' then 1 else 2 end,
    g.last_seen_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$list_gap_alerts$;

create or replace function public.update_assistant_gap_alert_v1(
  p_alert_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $update_gap_alert$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('reviewing','resolved') then
    raise exception 'Unsupported alert status' using errcode = '22023';
  end if;

  update public.assistant_gap_alerts
  set status = p_status,
      resolved_at = case when p_status = 'resolved' then now() else null end
  where id = p_alert_id
    and recipient_user_id = auth.uid();

  return found;
end;
$update_gap_alert$;

revoke all on function public.list_assistant_gap_alerts_v1(integer) from public, anon;
revoke all on function public.update_assistant_gap_alert_v1(uuid, text) from public, anon;
grant execute on function public.list_assistant_gap_alerts_v1(integer) to authenticated;
grant execute on function public.update_assistant_gap_alert_v1(uuid, text) to authenticated;

commit;
