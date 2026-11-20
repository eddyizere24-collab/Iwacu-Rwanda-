-- IWACU RWANDA "Ikarita y'Icyizere" (certainty zones). ADDITIVE ONLY: creates new objects, changes nothing that exists.
-- Authored by AI Studio from our written order; reviewed and adjusted by Claude (candidate distance now reprojects
-- only the closest point; service_role granted explicitly). Verified in CI against real PostGIS (see
-- .github/workflows/certainty-zones-contract.yml). NOT yet applied to production.
-- After any boundary re-import, rebuild the zones (stale zones are the only way this layer can drift).
--
-- Migration: 20261120_01_boundary_certainty_zones.sql
-- Purpose: Create precomputed inward-buffered certainty zones per administrative
--          level and safety distance, plus builder and fast public lookup RPC.
-- Prerequisite: Run check (a) in sql/tests/boundary_certainty_zones_checks.sql
--               BEFORE applying this migration to verify exact level names and SRID.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table: public.boundary_certainty_zones
--    Dynamically match public.boundaries.id column type (uuid/bigint/int/text).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_id_type text;
BEGIN
  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
  INTO v_id_type
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'boundaries'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF v_id_type IS NULL THEN
    RAISE EXCEPTION 'Column public.boundaries.id not found';
  END IF;

  EXECUTE pg_catalog.format($sql$
    CREATE TABLE IF NOT EXISTS public.boundary_certainty_zones (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      boundary_id %s NOT NULL REFERENCES public.boundaries(id) ON DELETE CASCADE,
      scope_code text NOT NULL,
      level text NOT NULL CHECK (level IN ('province', 'district', 'sector', 'cell', 'village')),
      safe_m integer NOT NULL CHECK (safe_m IN (35, 70, 130, 300, 700, 1500)),
      geom extensions.geometry(MultiPolygon, 4326) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
      CONSTRAINT boundary_certainty_zones_boundary_safe_uidx UNIQUE (boundary_id, safe_m)
    );
  $sql$, v_id_type);
END
$$;

CREATE INDEX IF NOT EXISTS boundary_certainty_zones_geom_gist
  ON public.boundary_certainty_zones
  USING gist (geom);

CREATE INDEX IF NOT EXISTS boundary_certainty_zones_level_safe_idx
  ON public.boundary_certainty_zones (level, safe_m);

-- ---------------------------------------------------------------------------
-- 2. Security & RLS: no direct table access for anon / authenticated / public
-- ---------------------------------------------------------------------------
ALTER TABLE public.boundary_certainty_zones ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.boundary_certainty_zones FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.boundary_certainty_zones_id_seq FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Builder function: public.build_boundary_certainty_zones_v1
--    Idempotently (re)builds exactly one (level, safe_m) slice in one call.
--    Does all metre-based buffering in EPSG:32735, then stores as MultiPolygon 4326.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_boundary_certainty_zones_v1(
  p_level text,
  p_safe_m integer
)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog, extensions
AS $$
DECLARE
  v_max_safe_m integer;
  v_inserted_count integer := 0;
BEGIN
  IF p_level IS NULL OR p_level NOT IN ('province', 'district', 'sector', 'cell', 'village') THEN
    RAISE EXCEPTION 'Invalid p_level: %. Expected one of province, district, sector, cell, village.', p_level;
  END IF;

  IF p_safe_m IS NULL OR p_safe_m NOT IN (35, 70, 130, 300, 700, 1500) THEN
    RAISE EXCEPTION 'Invalid p_safe_m: %. Expected one of 35, 70, 130, 300, 700, 1500.', p_safe_m;
  END IF;

  v_max_safe_m := CASE p_level
    WHEN 'village'  THEN 130
    WHEN 'cell'     THEN 300
    WHEN 'sector'   THEN 700
    WHEN 'district' THEN 1500
    WHEN 'province' THEN 1500
  END;

  IF p_safe_m > v_max_safe_m THEN
    RAISE EXCEPTION 'p_safe_m (%) exceeds maximum allowed (%) for level %.', p_safe_m, v_max_safe_m, p_level;
  END IF;

  -- Idempotent replace for this (level, safe_m) slice only
  DELETE FROM public.boundary_certainty_zones z
  WHERE z.level = p_level
    AND z.safe_m = p_safe_m;

  WITH raw_shrunk AS (
    SELECT
      b.id AS boundary_id,
      b.scope_code,
      b.level::text AS level,
      extensions.ST_Multi(
        extensions.ST_CollectionExtract(
          extensions.ST_MakeValid(
            extensions.ST_Buffer(
              extensions.ST_Transform(
                extensions.ST_MakeValid(b.geom),
                32735
              ),
              -(p_safe_m::double precision)
            )
          ),
          3
        )
      ) AS geom_32735
    FROM public.boundaries b
    WHERE b.valid_to IS NULL
      AND b.level::text = p_level
      AND b.geom IS NOT NULL
  ),
  valid_32735 AS (
    SELECT
      r.boundary_id,
      r.scope_code,
      r.level,
      r.geom_32735
    FROM raw_shrunk r
    WHERE r.geom_32735 IS NOT NULL
      AND NOT extensions.ST_IsEmpty(r.geom_32735)
      AND extensions.ST_Area(r.geom_32735) > 1.0
  ),
  reprojected AS (
    SELECT
      v.boundary_id,
      v.scope_code,
      v.level,
      extensions.ST_Multi(
        extensions.ST_CollectionExtract(
          extensions.ST_MakeValid(
            extensions.ST_Transform(v.geom_32735, 4326)
          ),
          3
        )
      ) AS geom_4326
    FROM valid_32735 v
  )
  INSERT INTO public.boundary_certainty_zones (
    boundary_id,
    scope_code,
    level,
    safe_m,
    geom
  )
  SELECT
    rp.boundary_id,
    rp.scope_code,
    rp.level,
    p_safe_m,
    rp.geom_4326
  FROM reprojected rp
  WHERE rp.geom_4326 IS NOT NULL
    AND NOT extensions.ST_IsEmpty(rp.geom_4326)
    AND extensions.ST_GeometryType(rp.geom_4326) = 'ST_MultiPolygon';

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.build_boundary_certainty_zones_v1(text, integer) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Public lookup function: public.certainty_lookup_v1
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.certainty_lookup_v1(
  p_lng double precision,
  p_lat double precision,
  p_accuracy_m double precision
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, extensions
AS $$
DECLARE
  v_needed_m integer;
  v_pt_4326 extensions.geometry;
  v_pt_32735 extensions.geometry;
  v_deg_radius double precision;
  v_search_box_4326 extensions.geometry;
  v_inside_rwanda boolean := false;
  v_levels_json jsonb;
BEGIN
  -- Strict input validation (reject NULL, NaN, Infinity, out-of-bounds)
  IF p_lng IS NULL OR p_lng = 'NaN'::double precision OR p_lng = 'Infinity'::double precision OR p_lng = '-Infinity'::double precision THEN
    RAISE EXCEPTION 'Invalid longitude: must be a finite number.';
  END IF;
  IF p_lat IS NULL OR p_lat = 'NaN'::double precision OR p_lat = 'Infinity'::double precision OR p_lat = '-Infinity'::double precision THEN
    RAISE EXCEPTION 'Invalid latitude: must be a finite number.';
  END IF;
  IF p_accuracy_m IS NULL OR p_accuracy_m = 'NaN'::double precision OR p_accuracy_m = 'Infinity'::double precision OR p_accuracy_m = '-Infinity'::double precision THEN
    RAISE EXCEPTION 'Invalid accuracy_m: must be a finite number.';
  END IF;

  IF p_lng < 28.7 OR p_lng > 31.1 THEN
    RAISE EXCEPTION 'Longitude % out of supported Rwanda bounds (28.7 to 31.1).', p_lng;
  END IF;
  IF p_lat < -3.0 OR p_lat > -0.8 THEN
    RAISE EXCEPTION 'Latitude % out of supported Rwanda bounds (-3.0 to -0.8).', p_lat;
  END IF;
  IF p_accuracy_m <= 0.0 OR p_accuracy_m > 100000.0 THEN
    RAISE EXCEPTION 'Accuracy % must be > 0 and <= 100000 metres.', p_accuracy_m;
  END IF;

  v_needed_m := pg_catalog.ceil(2.5 * p_accuracy_m + 10.0)::integer;
  v_pt_4326 := extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326);
  v_pt_32735 := extensions.ST_Transform(v_pt_4326, 32735);

  -- Conservative degree envelope for 4326 GiST prefiltering (near equator, 1 deg >= ~110 km)
  v_deg_radius := (v_needed_m::double precision / 100000.0) + 0.002;
  v_search_box_4326 := extensions.ST_Expand(v_pt_4326, v_deg_radius);

  -- Check if point lies inside Rwanda (current province polygons)
  SELECT EXISTS (
    SELECT 1
    FROM public.boundaries p
    WHERE p.valid_to IS NULL
      AND p.level::text = 'province'
      AND p.geom OPERATOR(extensions.&&) v_pt_4326
      AND extensions.ST_Covers(p.geom, v_pt_4326)
  ) INTO v_inside_rwanda;

  WITH level_cfg(level_name, max_safe_m, safe_m) AS (
    VALUES
      ('village'::text,  130,
        CASE
          WHEN v_needed_m <= 35  THEN 35
          WHEN v_needed_m <= 70  THEN 70
          WHEN v_needed_m <= 130 THEN 130
          ELSE NULL
        END),
      ('cell'::text,     300,
        CASE
          WHEN v_needed_m <= 35  THEN 35
          WHEN v_needed_m <= 70  THEN 70
          WHEN v_needed_m <= 130 THEN 130
          WHEN v_needed_m <= 300 THEN 300
          ELSE NULL
        END),
      ('sector'::text,   700,
        CASE
          WHEN v_needed_m <= 35  THEN 35
          WHEN v_needed_m <= 70  THEN 70
          WHEN v_needed_m <= 130 THEN 130
          WHEN v_needed_m <= 300 THEN 300
          WHEN v_needed_m <= 700 THEN 700
          ELSE NULL
        END),
      ('district'::text, 1500,
        CASE
          WHEN v_needed_m <= 35   THEN 35
          WHEN v_needed_m <= 70   THEN 70
          WHEN v_needed_m <= 130  THEN 130
          WHEN v_needed_m <= 300  THEN 300
          WHEN v_needed_m <= 700  THEN 700
          WHEN v_needed_m <= 1500 THEN 1500
          ELSE NULL
        END),
      ('province'::text, 1500,
        CASE
          WHEN v_needed_m <= 35   THEN 35
          WHEN v_needed_m <= 70   THEN 70
          WHEN v_needed_m <= 130  THEN 130
          WHEN v_needed_m <= 300  THEN 300
          WHEN v_needed_m <= 700  THEN 700
          WHEN v_needed_m <= 1500 THEN 1500
          ELSE NULL
        END)
  ),
  zone_hits AS (
    SELECT
      lc.level_name,
      b.scope_code,
      b.name_kiny,
      b.name_eng
    FROM level_cfg lc
    JOIN public.boundary_certainty_zones z
      ON z.level = lc.level_name
     AND z.safe_m = lc.safe_m
     AND z.geom OPERATOR(extensions.&&) v_pt_4326
     AND extensions.ST_Covers(z.geom, v_pt_4326)
    JOIN public.boundaries b
      ON b.id = z.boundary_id
     AND b.valid_to IS NULL
    WHERE lc.safe_m IS NOT NULL
      AND v_inside_rwanda
  ),
  zone_summary AS (
    SELECT
      lc.level_name,
      lc.safe_m,
      COUNT(zh.scope_code) AS hit_count,
      MAX(zh.scope_code) AS scope_code,
      MAX(zh.name_kiny) AS name_kiny,
      MAX(zh.name_eng) AS name_eng
    FROM level_cfg lc
    LEFT JOIN zone_hits zh
      ON zh.level_name = lc.level_name
    GROUP BY lc.level_name, lc.safe_m
  ),
  level_results AS (
    SELECT
      zs.level_name,
      CASE
        WHEN zs.safe_m IS NULL OR NOT v_inside_rwanda THEN
          pg_catalog.jsonb_build_object(
            'status', 'not_confirmable',
            'scope_code', NULL,
            'name_kiny', NULL,
            'name_eng', NULL,
            'candidates', '[]'::jsonb
          )
        WHEN zs.hit_count = 1 THEN
          pg_catalog.jsonb_build_object(
            'status', 'confirmed',
            'scope_code', zs.scope_code,
            'name_kiny', zs.name_kiny,
            'name_eng', zs.name_eng,
            'candidates', '[]'::jsonb
          )
        ELSE
          pg_catalog.jsonb_build_object(
            'status', 'near_border',
            'scope_code', NULL,
            'name_kiny', NULL,
            'name_eng', NULL,
            'candidates', (
              SELECT COALESCE(
                pg_catalog.jsonb_agg(
                  pg_catalog.jsonb_build_object(
                    'scope_code', cand.scope_code,
                    'name_kiny', cand.name_kiny,
                    'name_eng', cand.name_eng,
                    'distance_m', cand.distance_m
                  )
                  ORDER BY cand.distance_m ASC, cand.scope_code ASC
                ),
                '[]'::jsonb
              )
              FROM (
                SELECT
                  raw_c.scope_code,
                  raw_c.name_kiny,
                  raw_c.name_eng,
                  pg_catalog.round(raw_c.raw_dist_m::numeric, 2)::double precision AS distance_m
                FROM (
                  SELECT
                    b.scope_code,
                    b.name_kiny,
                    b.name_eng,
                    -- Transform only the closest point (not the whole polygon): large
                    -- district/province geometries would otherwise be reprojected per request.
                    extensions.ST_Distance(
                      extensions.ST_Transform(
                        extensions.ST_ClosestPoint(b.geom, v_pt_4326),
                        32735
                      ),
                      v_pt_32735
                    ) AS raw_dist_m
                  FROM public.boundaries b
                  WHERE b.valid_to IS NULL
                    AND b.level::text = zs.level_name
                    AND b.geom OPERATOR(extensions.&&) v_search_box_4326
                ) raw_c
                WHERE raw_c.raw_dist_m <= v_needed_m::double precision
                ORDER BY raw_c.raw_dist_m ASC, raw_c.scope_code ASC
                LIMIT 3
              ) cand
            )
          )
      END AS payload
    FROM zone_summary zs
  )
  SELECT pg_catalog.jsonb_object_agg(lr.level_name, lr.payload)
  INTO v_levels_json
  FROM level_results lr;

  RETURN pg_catalog.jsonb_build_object(
    'needed_m', v_needed_m,
    'levels', v_levels_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.certainty_lookup_v1(double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.certainty_lookup_v1(double precision, double precision, double precision) TO anon, authenticated, service_role;

COMMIT;

-- ===========================================================================
-- BUILD EXECUTION ORDER (run as privileged role / SQL editor after migration)
-- First run in the same session:  SET statement_timeout = 0;   (village slices process ~14,800 polygons per call)
-- Coarsest levels first (fewest polygons, fastest) down to villages.
-- ===========================================================================
-- SELECT public.build_boundary_certainty_zones_v1('province', 35);
-- SELECT public.build_boundary_certainty_zones_v1('province', 70);
-- SELECT public.build_boundary_certainty_zones_v1('province', 130);
-- SELECT public.build_boundary_certainty_zones_v1('province', 300);
-- SELECT public.build_boundary_certainty_zones_v1('province', 700);
-- SELECT public.build_boundary_certainty_zones_v1('province', 1500);
--
-- SELECT public.build_boundary_certainty_zones_v1('district', 35);
-- SELECT public.build_boundary_certainty_zones_v1('district', 70);
-- SELECT public.build_boundary_certainty_zones_v1('district', 130);
-- SELECT public.build_boundary_certainty_zones_v1('district', 300);
-- SELECT public.build_boundary_certainty_zones_v1('district', 700);
-- SELECT public.build_boundary_certainty_zones_v1('district', 1500);
--
-- SELECT public.build_boundary_certainty_zones_v1('sector', 35);
-- SELECT public.build_boundary_certainty_zones_v1('sector', 70);
-- SELECT public.build_boundary_certainty_zones_v1('sector', 130);
-- SELECT public.build_boundary_certainty_zones_v1('sector', 300);
-- SELECT public.build_boundary_certainty_zones_v1('sector', 700);
--
-- SELECT public.build_boundary_certainty_zones_v1('cell', 35);
-- SELECT public.build_boundary_certainty_zones_v1('cell', 70);
-- SELECT public.build_boundary_certainty_zones_v1('cell', 130);
-- SELECT public.build_boundary_certainty_zones_v1('cell', 300);
--
-- SELECT public.build_boundary_certainty_zones_v1('village', 35);
-- SELECT public.build_boundary_certainty_zones_v1('village', 70);
-- SELECT public.build_boundary_certainty_zones_v1('village', 130);
--
-- ANALYZE public.boundary_certainty_zones;

-- ===========================================================================
-- EXPLAIN PLAN CHECKS (run after populating data and ANALYZE)
-- Expected:
--   1. Zone lookup uses Index Scan / Bitmap Index Scan on
--      boundary_certainty_zones_geom_gist (and/or BitmapAnd with
--      boundary_certainty_zones_level_safe_idx) instead of Seq Scan.
--   2. Full RPC execution time well under 50 ms on warm cache.
-- ===========================================================================
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT z.boundary_id, z.scope_code, z.level
-- FROM public.boundary_certainty_zones z
-- WHERE z.level = 'village'
--   AND z.safe_m = 35
--   AND z.geom OPERATOR(extensions.&&) extensions.ST_SetSRID(extensions.ST_MakePoint(30.0619, -1.9441), 4326)
--   AND extensions.ST_Covers(z.geom, extensions.ST_SetSRID(extensions.ST_MakePoint(30.0619, -1.9441), 4326));
--
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT public.certainty_lookup_v1(30.0619, -1.9441, 10.0);