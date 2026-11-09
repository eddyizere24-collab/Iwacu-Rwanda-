-- DISPOSABLE CI TEST DATABASE ONLY. Never run this bootstrap on any shared or Production database.
create extension if not exists postgis;

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

grant usage on schema public to anon, authenticated, service_role;
create table if not exists public.boundaries (
  id uuid primary key default gen_random_uuid(),
  scope_code text unique not null,
  name_kiny text not null,
  level text not null,
  geom geometry(MultiPolygon, 4326) not null,
  valid_to timestamptz null,
  updated_at timestamptz not null default now()
);
grant select on public.boundaries to service_role;

insert into public.boundaries (scope_code, name_kiny, level, geom, valid_to)
values
  ('RW-P1-D12', 'Gasabo CI fixture', 'district', ST_Multi(ST_MakeEnvelope(30.0,-2.0,30.01,-1.99,4326)), null),
  ('RW-TST-D2', 'Adjacent CI fixture', 'district', ST_Multi(ST_MakeEnvelope(30.01,-2.0,30.02,-1.99,4326)), null),
  ('RW-TST-D3', 'Separate CI fixture', 'district', ST_Multi(ST_MakeEnvelope(30.03,-2.0,30.04,-1.99,4326)), null)
on conflict (scope_code) do update set
  name_kiny = excluded.name_kiny,
  level = excluded.level,
  geom = excluded.geom,
  valid_to = excluded.valid_to,
  updated_at = now();
