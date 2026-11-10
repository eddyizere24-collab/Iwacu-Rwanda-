-- DISPOSABLE / SYNTHETIC ONLY — DO NOT APPLY TO PRODUCTION SUPABASE
-- Purpose: unit/integration tests for place facts (parent, children, area, adjacency, distance)
-- Rollback: DROP SCHEMA IF EXISTS assistant_spatial_fixture CASCADE;
--
-- Geometries are tiny synthetic polygons in EPSG:4326 around Kigali-ish coordinates.
-- Area values are computed from these fixtures, not official administrative areas.

begin;

create schema if not exists assistant_spatial_fixture;

create extension if not exists postgis;

create table if not exists assistant_spatial_fixture.places (
  scope_code text primary key,
  name_kiny text not null,
  level text not null check (level in ('province','district','sector','cell','village')),
  parent_scope_code text references assistant_spatial_fixture.places(scope_code),
  geom geometry(MultiPolygon, 4326) not null,
  area_m2 double precision generated always as (ST_Area(geom::geography)) stored
);

create index if not exists idx_assistant_spatial_fixture_geom
  on assistant_spatial_fixture.places using gist (geom);

create index if not exists idx_assistant_spatial_fixture_parent
  on assistant_spatial_fixture.places (parent_scope_code);

-- Synthetic hierarchy: province -> 2 districts -> sectors
insert into assistant_spatial_fixture.places (scope_code, name_kiny, level, parent_scope_code, geom)
values
(
  'SYN-P1',
  'Intara y''Igerageza',
  'province',
  null,
  ST_Multi(ST_MakeEnvelope(30.0, -2.0, 30.2, -1.8, 4326))
),
(
  'SYN-P1-D1',
  'Akarere ka A',
  'district',
  'SYN-P1',
  ST_Multi(ST_MakeEnvelope(30.0, -2.0, 30.1, -1.9, 4326))
),
(
  'SYN-P1-D2',
  'Akarere ka B',
  'district',
  'SYN-P1',
  ST_Multi(ST_MakeEnvelope(30.1, -2.0, 30.2, -1.9, 4326))
),
(
  'SYN-P1-D1-S1',
  'Umurenge wa A1',
  'sector',
  'SYN-P1-D1',
  ST_Multi(ST_MakeEnvelope(30.0, -2.0, 30.05, -1.95, 4326))
),
(
  'SYN-P1-D1-S2',
  'Umurenge wa A2',
  'sector',
  'SYN-P1-D1',
  ST_Multi(ST_MakeEnvelope(30.05, -2.0, 30.1, -1.95, 4326))
)
on conflict (scope_code) do nothing;

-- Parent lookup
create or replace function assistant_spatial_fixture.get_parent(p_scope text)
returns table (scope_code text, name_kiny text, level text)
language sql
stable
as $$
  select p.scope_code, p.name_kiny, p.level
  from assistant_spatial_fixture.places c
  join assistant_spatial_fixture.places p on p.scope_code = c.parent_scope_code
  where c.scope_code = p_scope;
$$;

-- Direct children count + sample
create or replace function assistant_spatial_fixture.get_children(p_scope text)
returns table (scope_code text, name_kiny text, level text)
language sql
stable
as $$
  select scope_code, name_kiny, level
  from assistant_spatial_fixture.places
  where parent_scope_code = p_scope
  order by name_kiny;
$$;

-- Area in square metres (from synthetic geometry; NOT official)
create or replace function assistant_spatial_fixture.get_area_m2(p_scope text)
returns double precision
language sql
stable
as $$
  select area_m2 from assistant_spatial_fixture.places where scope_code = p_scope;
$$;

-- Straight-line geodesic distance between representative points (ST_PointOnSurface)
create or replace function assistant_spatial_fixture.distance_m(p_from text, p_to text)
returns double precision
language sql
stable
as $$
  select ST_Distance(
    ST_PointOnSurface(a.geom)::geography,
    ST_PointOnSurface(b.geom)::geography
  )
  from assistant_spatial_fixture.places a,
       assistant_spatial_fixture.places b
  where a.scope_code = p_from and b.scope_code = p_to;
$$;

-- Adjacent if boundaries touch (ST_Touches) — not the same as "nearby"
create or replace function assistant_spatial_fixture.adjacent_scopes(p_scope text)
returns table (scope_code text, name_kiny text)
language sql
stable
as $$
  select b.scope_code, b.name_kiny
  from assistant_spatial_fixture.places a
  join assistant_spatial_fixture.places b on a.scope_code <> b.scope_code
  where a.scope_code = p_scope
    and ST_Touches(a.geom, b.geom)
  order by b.name_kiny;
$$;

commit;
