-- DISPOSABLE CI TEST DATABASE ONLY. Never run this bootstrap on any shared or Production database.
create extension if not exists postgis;
create extension if not exists ltree;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key
);
create or replace function auth.uid()
returns uuid language sql stable
as $uid$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $uid$;
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table if not exists public.boundaries (
  id uuid primary key default gen_random_uuid(),
  scope_code text unique not null,
  name_kiny text not null,
  level text not null,
  path ltree not null,
  geom geometry(MultiPolygon, 4326) not null,
  valid_to timestamptz null,
  updated_at timestamptz not null default now()
);
grant select on public.boundaries to service_role;

create table if not exists public.admin_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role_code text not null,
  administrative_unit_id uuid not null,
  assignment_status text not null default 'active',
  valid_from timestamptz not null default now(),
  valid_until timestamptz
);

insert into public.boundaries (scope_code, name_kiny, level, path, geom, valid_to)
values
  ('RW', 'u Rwanda', 'country', 'rwanda', ST_Multi(ST_MakeEnvelope(29.0,-3.0,31.0,-1.0,4326)), null),
  ('RW-P1-D12', 'Gasabo CI fixture', 'district', 'rwanda.p1.d12', ST_Multi(ST_MakeEnvelope(30.0,-2.0,30.01,-1.99,4326)), null),
  ('RW-P1-D12-S1', 'Gasabo sector CI fixture', 'sector', 'rwanda.p1.d12.s1', ST_Multi(ST_MakeEnvelope(30.001,-1.999,30.009,-1.991,4326)), null),
  ('RW-P1-D12-S1-C1', 'Gasabo cell CI fixture', 'cell', 'rwanda.p1.d12.s1.c1', ST_Multi(ST_MakeEnvelope(30.002,-1.998,30.008,-1.992,4326)), null),
  ('RW-P1-D12-S1-C1-V1', 'Gasabo village CI fixture', 'village', 'rwanda.p1.d12.s1.c1.v1', ST_Multi(ST_MakeEnvelope(30.003,-1.997,30.007,-1.993,4326)), null),
  ('RW-TST-D2', 'Kamonyi CI fixture', 'district', 'rwanda.p2.d28', ST_Multi(ST_MakeEnvelope(30.01,-2.0,30.02,-1.99,4326)), null),
  ('RW-TST-D3', 'Separate CI fixture', 'district', 'rwanda.p3.d3', ST_Multi(ST_MakeEnvelope(30.03,-2.0,30.04,-1.99,4326)), null)
on conflict (scope_code) do update set
  name_kiny = excluded.name_kiny,
  level = excluded.level,
  path = excluded.path,
  geom = excluded.geom,
  valid_to = excluded.valid_to,
  updated_at = now();
