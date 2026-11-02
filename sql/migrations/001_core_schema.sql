-- =============================================================================
-- IWACU RWANDA — 001_core_schema.sql  (idempotent, non-destructive)
-- Full Claude stage1-v3 schema. Safe to re-run: no DROP TABLE, no data deletion.
-- Enable extensions first: CREATE EXTENSION postgis; CREATE EXTENSION ltree;
-- =============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- admin hierarchy nodes (ltree path)
CREATE TABLE IF NOT EXISTS public.admin_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_code TEXT NOT NULL UNIQUE,
  path LTREE NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('country','province','district','sector','cell','village')),
  name_kiny TEXT NOT NULL,
  name_eng TEXT,
  parent_scope_code TEXT REFERENCES public.admin_nodes(scope_code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_nodes_path_idx ON public.admin_nodes USING GIST (path);
CREATE INDEX IF NOT EXISTS admin_nodes_parent_idx ON public.admin_nodes(parent_scope_code);

-- boundaries with geometry
CREATE TABLE IF NOT EXISTS public.boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_code TEXT NOT NULL UNIQUE REFERENCES public.admin_nodes(scope_code),
  name_kiny TEXT NOT NULL,
  name_eng TEXT,
  level TEXT NOT NULL,
  parent_id UUID REFERENCES public.boundaries(id),
  geom GEOMETRY(MultiPolygon, 4326),
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','rejected')),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS boundaries_geom_idx ON public.boundaries USING GIST (geom);
CREATE INDEX IF NOT EXISTS boundaries_status_idx ON public.boundaries(verification_status);

-- locate helper (sector-level)
CREATE OR REPLACE FUNCTION public.locate_sector(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE (
  scope_code TEXT,
  name_kiny TEXT,
  name_eng TEXT,
  level TEXT,
  confidence DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT b.scope_code, b.name_kiny, b.name_eng, b.level,
         1.0::DOUBLE PRECISION AS confidence
  FROM public.boundaries b
  WHERE b.verification_status = 'verified'
    AND b.level = 'sector'
    AND b.geom IS NOT NULL
    AND ST_Contains(b.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.locate_sector(DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.locate_sector(DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated, service_role;

COMMIT;
