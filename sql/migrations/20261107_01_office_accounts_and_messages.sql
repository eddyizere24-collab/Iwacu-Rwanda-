-- IWACU RWANDA — Office accounts and official messages (M3).
-- Additive only. Builds on admin_role_assignments (the existing authority model):
--   Igihugu -> Akarere -> Umurenge -> Akagari; each tier creates the tier directly below.
-- All client access goes through SECURITY DEFINER functions below; the tables have no client grants.
begin;

create schema if not exists private;

create table if not exists public.office_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  login_name text not null,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  job_title text check (job_title is null or char_length(job_title) <= 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{7,16}$'),
  created_by uuid references auth.users(id) on delete restrict,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint office_login_name_format check (login_name ~ '^[a-z0-9._-]{3,40}$')
);
create unique index if not exists office_profiles_login_name_key on public.office_profiles(login_name);

create table if not exists public.office_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete restrict,
  subject text not null check (char_length(btrim(subject)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  audience text not null check (audience in ('person','below','above')),
  created_at timestamptz not null default now()
);
create index if not exists office_messages_sender_idx on public.office_messages(sender_id, created_at desc);

create table if not exists public.office_message_recipients (
  message_id uuid not null references public.office_messages(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete restrict,
  read_at timestamptz,
  primary key (message_id, recipient_id)
);
create index if not exists office_message_recipients_inbox_idx
  on public.office_message_recipients(recipient_id, message_id);

alter table public.office_profiles enable row level security;
alter table public.office_messages enable row level security;
alter table public.office_message_recipients enable row level security;
revoke all on table public.office_profiles, public.office_messages, public.office_message_recipients
  from public, anon, authenticated;
-- No policies on purpose: nothing but the functions below can read or write these tables.

-- ---------------------------------------------------------------------------
-- Helper: the active, current admin assignments (with scope) of one user.
-- ---------------------------------------------------------------------------
create or replace function private.office_scopes(p_user uuid)
returns table(role_code text, unit_id uuid, scope_code text, unit_level text)
language sql stable security definer set search_path = '' as $$
  select a.role_code, a.administrative_unit_id, b.scope_code, b.level::text
  from public.admin_role_assignments a
  join public.boundaries b on b.id = a.administrative_unit_id and b.valid_to is null
  where a.user_id = p_user
    and a.assignment_status = 'active'
    and a.valid_from <= now()
    and (a.valid_until is null or a.valid_until > now());
$$;
revoke all on function private.office_scopes(uuid) from public, anon, authenticated;

-- Everyone the caller may write to: accounts below (any depth) and accounts above (any depth).
create or replace function private.office_reachable(p_user uuid)
returns table(user_id uuid, relation text)
language sql stable security definer set search_path = '' as $$
  with mine as (select * from private.office_scopes(p_user)),
  others as (
    select a.user_id, b.scope_code
    from public.admin_role_assignments a
    join public.boundaries b on b.id = a.administrative_unit_id and b.valid_to is null
    where a.assignment_status = 'active'
      and a.valid_from <= now()
      and (a.valid_until is null or a.valid_until > now())
      and a.user_id <> p_user
  )
  select o.user_id,
    case when bool_or(o.scope_code like m.scope_code || '-%') then 'below' else 'above' end
  from others o
  join mine m on o.scope_code like m.scope_code || '-%' or m.scope_code like o.scope_code || '-%'
  group by o.user_id;
$$;
revoke all on function private.office_reachable(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Create an account for the tier directly below. The Auth user is created by the server first
-- (service role); this function then records authority + profile atomically under the caller's JWT.
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
  return v_assignment;
end $$;

-- Who I can write to / manage (name, role, place), both directions.
create or replace function public.list_office_contacts_v1()
returns table(user_id uuid, display_name text, job_title text, phone text, login_name text,
              role_code text, unit_id uuid, unit_name text, unit_level text, relation text,
              created_by_me boolean, must_change_password boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.leader_actor_can('create_person') then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  return query
  select r.user_id,
         coalesce(p.display_name, 'Umuyobozi'),
         p.job_title, p.phone, p.login_name,
         s.role_code, s.unit_id,
         coalesce(b.name_kiny, b.name_eng, b.scope_code), s.unit_level,
         r.relation,
         coalesce(p.created_by = auth.uid(), false),
         coalesce(p.must_change_password, false)
  from private.office_reachable(auth.uid()) r
  join lateral (select * from private.office_scopes(r.user_id) order by unit_level limit 1) s on true
  join public.boundaries b on b.id = s.unit_id
  left join public.office_profiles p on p.user_id = r.user_id
  order by r.relation desc,
           case s.unit_level when 'country' then 0 when 'district' then 2 when 'sector' then 3 when 'cell' then 4 else 9 end, 2
  limit 500;
end $$;

create or replace function public.get_office_me_v1()
returns table(display_name text, job_title text, login_name text, must_change_password boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return query
  select p.display_name, p.job_title, p.login_name, p.must_change_password
  from public.office_profiles p where p.user_id = auth.uid();
end $$;

create or replace function public.complete_office_password_change_v1()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.office_profiles set must_change_password = false, updated_at = now()
  where user_id = auth.uid();
end $$;

-- ---------------------------------------------------------------------------
-- Messages: one row per recipient, so everybody receives (and reads) their own copy.
-- ---------------------------------------------------------------------------
create or replace function public.send_office_message_v1(
  p_subject text, p_body text, p_audience text, p_recipient_ids uuid[] default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_count integer; v_targets uuid[];
begin
  if auth.uid() is null or not private.leader_actor_can('create_person') then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_audience not in ('person','below','above') then
    raise exception 'Unknown audience' using errcode = '22023';
  end if;
  if p_audience = 'person' and (p_recipient_ids is null or cardinality(p_recipient_ids) not between 1 and 50) then
    raise exception 'Choose between 1 and 50 people' using errcode = '22023';
  end if;

  select coalesce(array_agg(r.user_id), '{}'::uuid[]) into v_targets
  from private.office_reachable(auth.uid()) r
  where (p_audience = 'below' and r.relation = 'below')
     or (p_audience = 'above' and r.relation = 'above')
     or (p_audience = 'person' and r.user_id = any(p_recipient_ids));
  v_count := cardinality(v_targets);
  if v_count = 0 then raise exception 'Nobody to send to' using errcode = '22023'; end if;
  if p_audience = 'person' and v_count <> (select count(distinct x) from unnest(p_recipient_ids) x) then
    raise exception 'Some recipients are outside your reach' using errcode = '42501';
  end if;
  if v_count > 5000 then raise exception 'Too many recipients' using errcode = '22023'; end if;

  insert into public.office_messages(sender_id, subject, body, audience)
  values (auth.uid(), btrim(p_subject), btrim(p_body), p_audience) returning id into v_id;
  insert into public.office_message_recipients(message_id, recipient_id)
  select v_id, x from unnest(v_targets) x;
  return v_count;
end $$;

create or replace function public.list_office_inbox_v1(p_limit integer default 50)
returns table(message_id uuid, subject text, body text, created_at timestamptz, read_at timestamptz,
              sender_id uuid, sender_name text, sender_title text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return query
  select m.id, m.subject, m.body, m.created_at, r.read_at, m.sender_id,
         coalesce(p.display_name, 'Umuyobozi'), p.job_title
  from public.office_message_recipients r
  join public.office_messages m on m.id = r.message_id
  left join public.office_profiles p on p.user_id = m.sender_id
  where r.recipient_id = auth.uid()
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end $$;

create or replace function public.list_office_sent_v1(p_limit integer default 50)
returns table(message_id uuid, subject text, body text, created_at timestamptz, audience text,
              recipients integer, read_count integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return query
  select m.id, m.subject, m.body, m.created_at, m.audience,
         (select count(*)::int from public.office_message_recipients r where r.message_id = m.id),
         (select count(*)::int from public.office_message_recipients r where r.message_id = m.id and r.read_at is not null)
  from public.office_messages m
  where m.sender_id = auth.uid()
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end $$;

create or replace function public.mark_office_message_read_v1(p_message_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.office_message_recipients set read_at = now()
  where message_id = p_message_id and recipient_id = auth.uid() and read_at is null;
end $$;

-- Execute rights: authenticated only.
revoke all on function
  public.create_office_account_v1(uuid,text,text,text,text,text,uuid),
  public.list_office_contacts_v1(), public.get_office_me_v1(), public.complete_office_password_change_v1(),
  public.send_office_message_v1(text,text,text,uuid[]), public.list_office_inbox_v1(integer),
  public.list_office_sent_v1(integer), public.mark_office_message_read_v1(uuid)
from public, anon;
grant execute on function
  public.create_office_account_v1(uuid,text,text,text,text,text,uuid),
  public.list_office_contacts_v1(), public.get_office_me_v1(), public.complete_office_password_change_v1(),
  public.send_office_message_v1(text,text,text,uuid[]), public.list_office_inbox_v1(integer),
  public.list_office_sent_v1(integer), public.mark_office_message_read_v1(uuid)
to authenticated;

commit;
