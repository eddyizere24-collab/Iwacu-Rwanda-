-- IWACU RWANDA: bounded public map overlay RPC without the per-row public RLS scan.
-- SECURITY DEFINER is deliberately narrow: it returns active village boundary geometry and
-- public administrative labels only. It does not expose leader, contact, or private fields.
-- The function owner is postgres; search_path excludes public and all relations are schema-qualified.

CREATE OR REPLACE FUNCTION public.get_location_map_overlay_v2(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, extensions
AS $function$
DECLARE
  v_bounds extensions.geometry;
  v_features jsonb;
  v_truncated boolean := false;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 300), 1), 300);
BEGIN
  IF
    p_west IS NULL OR p_south IS NULL OR p_east IS NULL OR p_north IS NULL
    OR p_west = 'NaN'::double precision
    OR p_south = 'NaN'::double precision
    OR p_east = 'NaN'::double precision
    OR p_north = 'NaN'::double precision
    OR p_west < 28.7 OR p_east > 31.1
    OR p_south < -3.0 OR p_north > -0.8
    OR p_west >= p_east OR p_south >= p_north
    OR (p_east - p_west) > 0.5 OR (p_north - p_south) > 0.5
  THEN
    RAISE EXCEPTION 'Map bounds are outside the supported Rwanda map window'
      USING ERRCODE = '22023';
  END IF;

  v_bounds := extensions.ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326);

  WITH selected AS MATERIALIZED (
    SELECT id, scope_code, name_kiny, name_eng, level, path, parent_id, geom
    FROM public.boundaries
    WHERE valid_to IS NULL
      AND level = 'village'
      AND geom && v_bounds
      AND extensions.ST_Intersects(geom, v_bounds)
    ORDER BY scope_code
    LIMIT v_limit + 1
  ),
  visible AS MATERIALIZED (
    SELECT *
    FROM selected
    ORDER BY scope_code
    LIMIT v_limit
  )
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', b.id,
            'geometry', extensions.ST_AsGeoJSON(
              extensions.ST_SimplifyPreserveTopology(b.geom, 0.000015),
              6,
              0
            )::jsonb,
            'properties', jsonb_build_object(
              'id', b.id,
              'scope_code', b.scope_code,
              'name_kiny', b.name_kiny,
              'name_eng', b.name_eng,
              'level', b.level::text,
              'path', b.path::text,
              'parent_id', b.parent_id
            )
          )
          ORDER BY b.scope_code
        )
        FROM visible AS b
      ),
      '[]'::jsonb
    ),
    (SELECT count(*) > v_limit FROM selected)
  INTO v_features, v_truncated;

  RETURN jsonb_build_object(
    'type', 'FeatureCollection',
    'features', v_features,
    'source', 'public.boundaries',
    'feature_count', jsonb_array_length(v_features),
    'truncated', v_truncated
  );
END;
$function$;

ALTER FUNCTION public.get_location_map_overlay_v2(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_location_map_overlay_v2(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_location_map_overlay_v2(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_location_map_overlay_v2(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) IS 'Bounded public village map overlay. Uses the table owner to bypass the expensive row-level policy scan, returns only public active village geometry/labels, simplifies geometry before GeoJSON, and caps results at 300.';
