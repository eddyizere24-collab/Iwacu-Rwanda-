-- CI-only fixture (temporary PostGIS database, never Production).
-- Two adjacent ~334 m x ~332 m villages (A | B) share a border at longitude 30.103, inside one cell,
-- inside a sector, district and province. 0.001 degree of longitude here is about 111 m.
CREATE SCHEMA extensions;
CREATE EXTENSION postgis WITH SCHEMA extensions;

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
GRANT USAGE ON SCHEMA public, extensions TO anon, authenticated, service_role;

CREATE TYPE public.boundary_level AS ENUM ('country', 'province', 'district', 'sector', 'cell', 'village');

CREATE TABLE public.boundaries (
  id uuid PRIMARY KEY,
  scope_code text NOT NULL,
  name_kiny text NOT NULL,
  name_eng text,
  level public.boundary_level NOT NULL,
  path text,
  parent_id uuid,
  valid_to timestamptz,
  geom extensions.geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX boundaries_geom_gist ON public.boundaries USING gist (geom);
ALTER TABLE public.boundaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY boundaries_public_read ON public.boundaries FOR SELECT TO anon, authenticated USING (valid_to IS NULL);
REVOKE ALL ON public.boundaries FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO public.boundaries (id, scope_code, name_kiny, name_eng, level, geom) VALUES
 ('00000000-0000-0000-0000-000000000001','RW-P1','Intara','Province','province',
  extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((30.0 -1.8,30.2 -1.8,30.2 -2.0,30.0 -2.0,30.0 -1.8))',4326))),
 ('00000000-0000-0000-0000-000000000002','RW-P1-D1','Akarere','District','district',
  extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((30.0 -1.8,30.2 -1.8,30.2 -2.0,30.0 -2.0,30.0 -1.8))',4326))),
 ('00000000-0000-0000-0000-000000000003','RW-P1-D1-S1','Umurenge','Sector','sector',
  extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((30.09 -1.89,30.12 -1.89,30.12 -1.92,30.09 -1.92,30.09 -1.89))',4326))),
 ('00000000-0000-0000-0000-000000000004','RW-P1-D1-S1-C1','Akagari','Cell','cell',
  extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((30.100 -1.900,30.106 -1.900,30.106 -1.903,30.100 -1.903,30.100 -1.900))',4326))),
 ('00000000-0000-0000-0000-00000000000a','RW-P1-D1-S1-C1-VA','Umudugudu A','Village A','village',
  extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((30.100 -1.900,30.103 -1.900,30.103 -1.903,30.100 -1.903,30.100 -1.900))',4326))),
 ('00000000-0000-0000-0000-00000000000b','RW-P1-D1-S1-C1-VB','Umudugudu B','Village B','village',
  extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((30.103 -1.900,30.106 -1.900,30.106 -1.903,30.103 -1.903,30.103 -1.900))',4326)));
