-- Disposable PostgreSQL harness for IWACU Leader Registry V2.
-- The GitHub Actions workflow runs this only inside an ephemeral postgres:17 service.
create extension if not exists pgcrypto;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end
$roles$;

-- CHANGED 2026-11-04 CLAUDE: mimic Supabase, which grants ALL on every new public table/function/sequence to
-- anon, authenticated and service_role by default. Without this the isolated baseline hid a real Production
-- finding (anon write privileges and authenticated TRUNCATE on leader_appointments); see docs/HANDOFF.md.
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;

create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text unique not null
);
create or replace function auth.uid()
returns uuid language sql stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
    ),
    ''
  )::uuid
$$;
create or replace function auth.jwt()
returns jsonb language sql stable
as $iwacu_auth_jwt$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    jsonb_build_object(
      'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
      'aal', 'aal2'
    )
  )
$iwacu_auth_jwt$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.jwt() to anon, authenticated;

create table public.boundaries (
  id uuid primary key default gen_random_uuid(),
  scope_code text not null unique,
  level text not null check (level in ('country','province','district','sector','cell','village')),
  name_kiny text not null,
  name_eng text,
  parent_id uuid references public.boundaries(id),
  valid_to timestamptz
);
-- CHANGED 2026-11-04 CLAUDE: mimic Production, where anon/authenticated had column-level SELECT on boundaries WITHOUT id and parent_id; migration 07 adds them; see docs/HANDOFF.md
revoke all on public.boundaries from anon, authenticated;
grant select (scope_code, level, name_kiny, name_eng, valid_to) on public.boundaries to anon, authenticated;

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  scope_code text not null,
  is_super_admin boolean not null default false
);

insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','national-test@iwacu.invalid'),
 ('22222222-2222-4222-8222-222222222222','district-a-test@iwacu.invalid'),
 ('33333333-3333-4333-8333-333333333333','sector-a-test@iwacu.invalid'),
 ('44444444-4444-4444-8444-444444444444','cell-a-test@iwacu.invalid'),
 ('55555555-5555-4555-8555-555555555555','cell-b-test@iwacu.invalid');

insert into public.boundaries(id,scope_code,level,name_kiny,name_eng,parent_id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','RW','country','U Rwanda','Rwanda',null),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','RW-01','province','Intara A','Province A','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','RW-01-01','district','Akarere A','District A','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','RW-01-01-01','sector','Umurenge A','Sector A','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','RW-01-01-01-01','cell','Akagari A','Cell A','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','RW-01-01-01-01-01','village','Umudugudu A','Village A','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','RW-02','province','Intara B','Province B','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','RW-02-01','district','Akarere B','District B','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9','RW-02-01-01','sector','Umurenge B','Sector B','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10','RW-02-01-01-01','cell','Akagari B','Cell B','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','RW-02-01-01-01-01','village','Umudugudu B','Village B','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12','RW-01-01-01-02','cell','Akagari A2','Cell A2','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13','RW-01-01-01-02-01','village','Umudugudu A2','Village A2','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12');

insert into public.admin_profiles(user_id,scope_code,is_super_admin)
values ('11111111-1111-4111-8111-111111111111','RW',true);

-- Minimal Supabase Storage metadata schema for isolated PostgreSQL Actions tests.
-- Storage files themselves are not emulated or uploaded in these database contracts.
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner_id uuid,
  metadata jsonb
);
create or replace function storage.foldername(p_name text)
returns text[] language sql immutable
as $folder$
  select case
    when position('/' in p_name)=0 then array[]::text[]
    else (string_to_array(p_name,'/'))[1:array_length(string_to_array(p_name,'/'),1)-1]
  end
$folder$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select,insert,update on storage.objects to authenticated;
grant select on storage.buckets to anon,authenticated;
