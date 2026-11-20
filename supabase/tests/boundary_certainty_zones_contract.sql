-- Isolated PostGIS contract test for the certainty zones. Run only in the temporary CI database.
-- Fixture: villages A | B share a border at lon 30.103. Centre of A is (30.1015, -1.9015).
-- 0.00018 deg ~ 20 m, 0.00027 ~ 30 m, 0.00036 ~ 40 m of longitude at this latitude.

DO $privileges$
BEGIN
  IF has_table_privilege('anon', 'public.boundary_certainty_zones', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not read boundary_certainty_zones directly';
  END IF;
  IF has_table_privilege('authenticated', 'public.boundary_certainty_zones', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated must not read boundary_certainty_zones directly';
  END IF;
  IF NOT has_function_privilege('anon', 'public.certainty_lookup_v1(double precision,double precision,double precision)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must be able to call certainty_lookup_v1';
  END IF;
  IF has_function_privilege('anon', 'public.build_boundary_certainty_zones_v1(text,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.build_boundary_certainty_zones_v1(text,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'the builder must not be callable by anon or authenticated';
  END IF;
END
$privileges$;

DO $build$
DECLARE
  lv text;
  d integer;
  n1 integer;
  n2 integer;
BEGIN
  FOREACH lv IN ARRAY ARRAY['province','district','sector','cell','village'] LOOP
    FOREACH d IN ARRAY ARRAY[35,70,130,300,700,1500] LOOP
      IF (lv = 'village' AND d > 130) OR (lv = 'cell' AND d > 300) OR (lv = 'sector' AND d > 700) THEN
        CONTINUE;
      END IF;
      PERFORM public.build_boundary_certainty_zones_v1(lv, d);
    END LOOP;
  END LOOP;

  -- Idempotent: running a slice twice gives the same row count.
  n1 := public.build_boundary_certainty_zones_v1('village', 35);
  n2 := public.build_boundary_certainty_zones_v1('village', 35);
  IF n1 <> 2 OR n2 <> 2 THEN
    RAISE EXCEPTION 'village/35 must hold exactly 2 zones (got % and %)', n1, n2;
  END IF;

  -- A 332 m wide cell cannot keep a 300 m inset: no row, never confirmable.
  IF EXISTS (SELECT 1 FROM public.boundary_certainty_zones WHERE level = 'cell' AND safe_m = 300) THEN
    RAISE EXCEPTION 'cell/300 must be empty for the fixture';
  END IF;
  -- A village keeps a 130 m inset (about 74 m wide strip remains).
  IF (SELECT count(*) FROM public.boundary_certainty_zones WHERE level = 'village' AND safe_m = 130) <> 2 THEN
    RAISE EXCEPTION 'village/130 must hold 2 zones';
  END IF;
  -- The builder refuses a distance that is not allowed for the level.
  BEGIN
    PERFORM public.build_boundary_certainty_zones_v1('village', 300);
    RAISE EXCEPTION 'village/300 must be refused';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'village/300 must be refused' THEN RAISE; END IF;
  END;
END
$build$;

DO $geometry$
BEGIN
  -- Every zone is inside its source polygon, and zones of one level/distance never overlap.
  IF EXISTS (
    SELECT 1 FROM public.boundary_certainty_zones z
    JOIN public.boundaries b ON b.id = z.boundary_id
    WHERE NOT extensions.ST_Covers(b.geom, z.geom)
  ) THEN
    RAISE EXCEPTION 'a certainty zone escapes its source polygon';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.boundary_certainty_zones z1
    JOIN public.boundary_certainty_zones z2
      ON z1.level = z2.level AND z1.safe_m = z2.safe_m AND z1.boundary_id < z2.boundary_id
    WHERE extensions.ST_Intersects(z1.geom, z2.geom) AND NOT extensions.ST_Touches(z1.geom, z2.geom)
  ) THEN
    RAISE EXCEPTION 'certainty zones overlap';
  END IF;
  -- Interior-point distance invariant, measured in metres (EPSG:32735).
  IF EXISTS (
    SELECT 1 FROM public.boundary_certainty_zones z
    JOIN public.boundaries b ON b.id = z.boundary_id
    WHERE extensions.ST_Distance(
            extensions.ST_Transform(extensions.ST_PointOnSurface(z.geom), 32735),
            extensions.ST_Boundary(extensions.ST_Transform(b.geom, 32735))
          ) < z.safe_m - 0.5
  ) THEN
    RAISE EXCEPTION 'a zone point is closer to the border than its safety distance';
  END IF;
END
$geometry$;

BEGIN;
SET LOCAL ROLE anon;

DO $lookup$
DECLARE
  r jsonb;
  st text;
BEGIN
  -- Centre of village A, accuracy 10 m (needed 35 m): everything is confirmed.
  r := public.certainty_lookup_v1(30.1015, -1.9015, 10);
  IF (r->>'needed_m')::int <> 35 THEN RAISE EXCEPTION 'needed_m for 10 m must be 35, got %', r->>'needed_m'; END IF;
  IF r #>> '{levels,village,status}' <> 'confirmed' OR r #>> '{levels,village,scope_code}' <> 'RW-P1-D1-S1-C1-VA' THEN
    RAISE EXCEPTION 'village A must be confirmed at its centre: %', r; END IF;
  IF r #>> '{levels,cell,status}' <> 'confirmed' OR r #>> '{levels,sector,status}' <> 'confirmed'
     OR r #>> '{levels,district,status}' <> 'confirmed' OR r #>> '{levels,province,status}' <> 'confirmed' THEN
    RAISE EXCEPTION 'all parents must be confirmed at the centre with accuracy 10: %', r; END IF;

  -- 20 m and 30 m from the border: never named, both neighbours listed.
  r := public.certainty_lookup_v1(30.10282, -1.9015, 10);
  IF r #>> '{levels,village,status}' <> 'near_border' OR r #>> '{levels,village,scope_code}' IS NOT NULL THEN
    RAISE EXCEPTION '20 m from the border must be near_border: %', r; END IF;
  IF jsonb_array_length(r #> '{levels,village,candidates}') < 2
     OR r #>> '{levels,village,candidates,0,scope_code}' <> 'RW-P1-D1-S1-C1-VA'
     OR NOT (r #> '{levels,village,candidates}')::text LIKE '%RW-P1-D1-S1-C1-VB%' THEN
    RAISE EXCEPTION 'near_border must list A first and B: %', r #> '{levels,village,candidates}'; END IF;
  r := public.certainty_lookup_v1(30.10273, -1.9015, 10);
  IF r #>> '{levels,village,status}' <> 'near_border' THEN RAISE EXCEPTION '30 m from the border must be near_border: %', r; END IF;

  -- 40 m from the border at accuracy 10 (needs 35): confirmed A. Mirror side: confirmed B.
  r := public.certainty_lookup_v1(30.10264, -1.9015, 10);
  IF r #>> '{levels,village,scope_code}' <> 'RW-P1-D1-S1-C1-VA' THEN RAISE EXCEPTION '40 m inside A must confirm A: %', r; END IF;
  r := public.certainty_lookup_v1(30.10336, -1.9015, 10);
  IF r #>> '{levels,village,scope_code}' <> 'RW-P1-D1-S1-C1-VB' THEN RAISE EXCEPTION '40 m inside B must confirm B: %', r; END IF;

  -- The border line itself and a point just either side: never confirmed.
  FOREACH st IN ARRAY ARRAY['30.1030','30.10299','30.10301'] LOOP
    r := public.certainty_lookup_v1(st::double precision, -1.9015, 10);
    IF r #>> '{levels,village,status}' = 'confirmed' THEN RAISE EXCEPTION 'a point on the border must not be confirmed (%): %', st, r; END IF;
  END LOOP;

  -- Accuracy 40 (needs 110 -> 130 m): centre of A still confirmed.
  r := public.certainty_lookup_v1(30.1015, -1.9015, 40);
  IF (r->>'needed_m')::int <> 110 OR r #>> '{levels,village,scope_code}' <> 'RW-P1-D1-S1-C1-VA' THEN
    RAISE EXCEPTION 'accuracy 40 at the centre of A must confirm A: %', r; END IF;

  -- Accuracy 60 (needs 160): a village can no longer be named; the cell cannot keep a 300 m inset; sector and above can.
  r := public.certainty_lookup_v1(30.1015, -1.9015, 60);
  IF r #>> '{levels,village,status}' <> 'not_confirmable' THEN RAISE EXCEPTION 'accuracy 60 must make villages not_confirmable: %', r; END IF;
  IF r #>> '{levels,cell,status}' <> 'near_border' THEN RAISE EXCEPTION 'accuracy 60 must leave the small cell near_border: %', r; END IF;
  IF r #>> '{levels,sector,status}' <> 'confirmed' OR r #>> '{levels,district,status}' <> 'confirmed' THEN
    RAISE EXCEPTION 'accuracy 60 must still confirm sector and district: %', r; END IF;

  -- A very coarse fix (3 km, needs 7510 m): nothing below the maximum safety distance may be named.
  r := public.certainty_lookup_v1(30.1015, -1.9015, 3000);
  IF r #>> '{levels,village,status}' <> 'not_confirmable' OR r #>> '{levels,cell,status}' <> 'not_confirmable'
     OR r #>> '{levels,sector,status}' <> 'not_confirmable' OR r #>> '{levels,district,status}' <> 'not_confirmable' THEN
    RAISE EXCEPTION 'a 3 km fix must not name anything below province: %', r; END IF;

  -- Outside the fixture country: nothing is named.
  r := public.certainty_lookup_v1(29.5, -2.5, 10);
  IF r #>> '{levels,village,status}' <> 'not_confirmable' THEN RAISE EXCEPTION 'outside the covered area must not be named: %', r; END IF;
END
$lookup$;

DO $validation$
DECLARE
  bad record;
  rejected integer := 0;
BEGIN
  FOR bad IN SELECT * FROM (VALUES
    (40.0::double precision, -1.9::double precision, 10::double precision),
    (30.1, 5.0, 10),
    (30.1, -1.9, 0),
    (30.1, -1.9, 100001),
    ('NaN'::double precision, -1.9, 10),
    (30.1, -1.9, 'NaN'::double precision)
  ) AS t(lng, lat, acc) LOOP
    BEGIN
      PERFORM public.certainty_lookup_v1(bad.lng, bad.lat, bad.acc);
    EXCEPTION WHEN raise_exception THEN
      rejected := rejected + 1;
    END;
  END LOOP;
  IF rejected <> 6 THEN RAISE EXCEPTION 'all 6 invalid inputs must be rejected (got %)', rejected; END IF;
END
$validation$;

ROLLBACK;
