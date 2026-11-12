-- Isolated PostGIS contract test for get_location_map_overlay_v2.
-- Run only in the temporary postgis/postgis CI database, never against Production.

DO $preflight$
DECLARE
  v_is_definer boolean;
  v_owner text;
  v_config text[];
BEGIN
  SELECT p.prosecdef, r.rolname, p.proconfig
    INTO v_is_definer, v_owner, v_config
  FROM pg_proc p
  JOIN pg_roles r ON r.oid = p.proowner
  WHERE p.oid = 'public.get_location_map_overlay_v2(double precision,double precision,double precision,double precision,integer)'::regprocedure;

  IF NOT COALESCE(v_is_definer, false) THEN
    RAISE EXCEPTION 'Map overlay v2 must be SECURITY DEFINER';
  END IF;
  IF v_owner <> 'postgres' THEN
    RAISE EXCEPTION 'Map overlay v2 must be owned by postgres';
  END IF;
  IF NOT COALESCE(array_to_string(v_config, ',') LIKE '%search_path=pg_catalog, extensions%', false) THEN
    RAISE EXCEPTION 'Map overlay v2 must use the restricted search_path';
  END IF;
  IF has_table_privilege('anon', 'public.boundaries', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not receive direct SELECT on public.boundaries';
  END IF;
  IF NOT has_function_privilege('anon', 'public.get_location_map_overlay_v2(double precision,double precision,double precision,double precision,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must be able to call the bounded public RPC';
  END IF;
END;
$preflight$;

BEGIN;
SET LOCAL ROLE anon;

DO $public_call$
DECLARE
  v_result jsonb;
  v_single jsonb;
  v_empty jsonb;
  v_invalid_bounds_rejected boolean := false;
BEGIN
  v_result := public.get_location_map_overlay_v2(30.09, -1.92, 30.12, -1.89, 1000);

  IF v_result->>'type' <> 'FeatureCollection' THEN
    RAISE EXCEPTION 'Expected a GeoJSON FeatureCollection';
  END IF;
  IF (v_result->>'feature_count')::integer <> 300 THEN
    RAISE EXCEPTION 'RPC must cap results at 300; got %', v_result->>'feature_count';
  END IF;
  IF jsonb_array_length(v_result->'features') <> 300 THEN
    RAISE EXCEPTION 'Feature array does not match feature_count';
  END IF;
  IF (v_result->>'truncated') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'More than 300 matching boundaries must be marked truncated';
  END IF;

  v_single := public.get_location_map_overlay_v2(30.09, -1.92, 30.12, -1.89, 1);
  IF jsonb_array_length(v_single->'features') <> 1 THEN
    RAISE EXCEPTION 'Caller-provided limit of 1 must be respected';
  END IF;
  IF (v_single->>'truncated') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'A one-feature page must disclose that more matches remain';
  END IF;

  v_empty := public.get_location_map_overlay_v2(30.30, -1.70, 30.31, -1.69, 300);
  IF jsonb_array_length(v_empty->'features') <> 0 OR (v_empty->>'truncated') IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'A complete empty result must not be marked truncated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_result->'features') AS item
    WHERE item->'properties'->>'scope_code' IS NULL
       OR item->'properties'->>'level' <> 'village'
       OR (item->'properties') ? 'phone_number'
  ) THEN
    RAISE EXCEPTION 'RPC returned a missing scope, non-village, or private field';
  END IF;

  BEGIN
    PERFORM public.get_location_map_overlay_v2(10, -1.92, 10.1, -1.89, 300);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_invalid_bounds_rejected := true;
  END;

  IF NOT v_invalid_bounds_rejected THEN
    RAISE EXCEPTION 'Out-of-Rwanda map bounds must be rejected';
  END IF;
END;
$public_call$;

RESET ROLE;
COMMIT;
