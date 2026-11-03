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
as $
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    jsonb_build_object(
      'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
      'aal', 'aal2'
    )
  )
$;
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
grant select on public.boundaries to anon, authenticated;

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
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','RW-02-01-01-01-01','village','Umudugudu B','Village B','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10');

insert into public.admin_profiles(user_id,scope_code,is_super_admin)
values ('11111111-1111-4111-8111-111111111111','RW',true);
