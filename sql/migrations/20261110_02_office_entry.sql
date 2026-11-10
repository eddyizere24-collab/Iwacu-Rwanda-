-- IWACU RWANDA — Office entry (M6): choose tier -> choose place -> type that place's key.
-- Additive only.
--   * list_entry_places_v1      : PUBLIC list of places to pick from (district; sector under a district; cell under a sector).
--                                 Names and scope codes only; no ids, no account information.
--   * office_entry_failures     : wrong-key attempts, used only for the temporary lock.
--   * office_entry_lookup_v1    : SERVER ONLY (service_role). Finds the login behind a place and says whether it is locked.
--   * office_entry_fail_v1 / office_entry_clear_v1 : SERVER ONLY. Record / forget wrong tries.
-- The National tier does not use this: it keeps the strong login (name, password, second step).
-- The key itself is the account's password in Supabase Auth: it is never stored or readable here.
begin;

create table if not exists public.office_entry_failures (
  id bigint generated always as identity primary key,
  scope_code text not null check (char_length(scope_code) <= 40),
  ip_hash text not null check (char_length(ip_hash) <= 64),
  at timestamptz not null default now()
);
create index if not exists office_entry_failures_idx on public.office_entry_failures(scope_code, at desc);
alter table public.office_entry_failures enable row level security;
revoke all on table public.office_entry_failures from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public list of places (the same names the public site already shows).
-- ---------------------------------------------------------------------------
create or replace function public.list_entry_places_v1(
  p_level text, p_parent_scope text default null, p_q text default null, p_limit integer default 40)
returns table(scope_code text, level text, name text, parent_name text)
language plpgsql stable security definer set search_path = '' as $$
declare v_q text := nullif(replace(replace(btrim(coalesce(p_q, '')), '%', ''), '_', ''), ''); v_parent_level text;
begin
  if p_level not in ('district','sector','cell') then raise exception 'Unknown level' using errcode = '22023'; end if;
  if p_level <> 'district' then
    v_parent_level := case p_level when 'sector' then 'district' else 'sector' end;
    if p_parent_scope is null or not exists (
      select 1 from public.boundaries b where b.scope_code = p_parent_scope and b.level::text = v_parent_level and b.valid_to is null
    ) then raise exception 'Choose the place above first' using errcode = '22023'; end if;
  end if;
  return query
  select b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng), coalesce(pb.name_kiny, pb.name_eng)
  from public.boundaries b
  left join public.boundaries pb on pb.id = b.parent_id
  where b.level::text = p_level and b.valid_to is null
    and (p_level = 'district' or b.scope_code like p_parent_scope || '-%')
    and (v_q is null or b.name_kiny ilike '%' || v_q || '%' or b.name_eng ilike '%' || v_q || '%')
  order by coalesce(b.name_kiny, b.name_eng), b.scope_code
  limit least(greatest(coalesce(p_limit, 40), 1), 60);
end $$;

-- ---------------------------------------------------------------------------
-- Server-only helpers for the entry route.
-- ---------------------------------------------------------------------------
create or replace function public.office_entry_lookup_v1(p_scope text, p_ip text)
returns table(email text, user_id uuid, role_code text, unit_id uuid, locked boolean)
language plpgsql security definer set search_path = '' as $$
declare v_unit_fails integer; v_ip_fails integer; v_locked boolean;
begin
  if p_scope is null or p_scope !~ '^RW(-[A-Za-z0-9]{1,12}){0,5}$' then raise exception 'Bad place' using errcode = '22023'; end if;
  delete from public.office_entry_failures where at < now() - interval '1 day';
  select count(*) into v_unit_fails from public.office_entry_failures f where f.scope_code = p_scope and f.at > now() - interval '15 minutes';
  select count(*) into v_ip_fails from public.office_entry_failures f where f.scope_code = p_scope and f.ip_hash = left(coalesce(p_ip, ''), 64) and f.at > now() - interval '15 minutes';
  v_locked := v_unit_fails >= 20 or v_ip_fails >= 5;
  return query
  select u.email::text, a.user_id, a.role_code, a.administrative_unit_id, v_locked
  from public.admin_role_assignments a
  join public.boundaries b on b.id = a.administrative_unit_id and b.valid_to is null
  join auth.users u on u.id = a.user_id
  where b.scope_code = p_scope
    and b.level::text in ('district','sector','cell')
    and a.role_code in ('district_admin','sector_admin','cell_admin')
    and a.assignment_status = 'active' and a.valid_from <= now() and (a.valid_until is null or a.valid_until > now())
  order by a.valid_from desc
  limit 1;
  if not found then
    return query select null::text, null::uuid, null::text, null::uuid, v_locked;
  end if;
end $$;

create or replace function public.office_entry_fail_v1(p_scope text, p_ip text)
returns void language sql security definer set search_path = '' as $$
  insert into public.office_entry_failures(scope_code, ip_hash) values (left(p_scope, 40), left(coalesce(p_ip, ''), 64));
$$;

create or replace function public.office_entry_clear_v1(p_scope text, p_ip text)
returns void language sql security definer set search_path = '' as $$
  delete from public.office_entry_failures where scope_code = p_scope and ip_hash = left(coalesce(p_ip, ''), 64);
$$;

revoke all on function public.office_entry_lookup_v1(text, text), public.office_entry_fail_v1(text, text), public.office_entry_clear_v1(text, text)
  from public, anon, authenticated;
grant execute on function public.office_entry_lookup_v1(text, text), public.office_entry_fail_v1(text, text), public.office_entry_clear_v1(text, text)
  to service_role;
revoke all on function public.list_entry_places_v1(text, text, text, integer) from public;
grant execute on function public.list_entry_places_v1(text, text, text, integer) to anon, authenticated;

commit;
