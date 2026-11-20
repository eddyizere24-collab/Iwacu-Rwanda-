-- ===========================================================================
-- Verification Checks: sql/tests/boundary_certainty_zones_checks.sql
--
-- IMPORTANT: Run Check (a) BEFORE running the migration.
-- If the distinct `level` values in public.boundaries differ from
-- ('province', 'district', 'sector', 'cell', 'village') or geom SRID != 4326,
-- you MUST adjust 20261120_01_boundary_certainty_zones.sql before applying it.
--
-- Run Checks (b) through (e) AFTER building all certainty zone slices and
-- running ANALYZE public.boundary_certainty_zones. All checks are read-only.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Check (a): PRE-MIGRATION schema & geometry verification on public.boundaries
-- PASS: Exactly 5 levels ('province', 'district', 'sector', 'cell', 'village'),
--       SRID = 4326, geometry type is ST_MultiPolygon (or ST_Polygon),
--       no NULL geometries, counts roughly match (~5, 30, 416, 2148, ~14837).
-- ---------------------------------------------------------------------------
SELECT
  b.level::text AS level,
  extensions.ST_SRID(b.geom) AS srid,
  extensions.ST_GeometryType(b.geom) AS geom_type,
  COUNT(*) AS unit_count,
  COUNT(*) FILTER (WHERE b.geom IS NULL) AS null_geom_count,
  COUNT(*) FILTER (WHERE NOT extensions.ST_IsValid(b.geom)) AS invalid_geom_count
FROM public.boundaries b
WHERE b.valid_to IS NULL
GROUP BY b.level::text, extensions.ST_SRID(b.geom), extensions.ST_GeometryType(b.geom)
ORDER BY unit_count ASC;


-- ---------------------------------------------------------------------------
-- Check (b): Every certainty zone is fully covered by its original polygon
-- PASS: 0 rows returned.
-- ---------------------------------------------------------------------------
SELECT
  z.id AS zone_id,
  z.boundary_id,
  z.scope_code,
  z.level,
  z.safe_m,
  (b.id IS NULL) AS missing_or_expired_parent
FROM public.boundary_certainty_zones z
LEFT JOIN public.boundaries b
  ON b.id = z.boundary_id
 AND b.valid_to IS NULL
WHERE b.id IS NULL
   OR NOT extensions.ST_Covers(b.geom, z.geom);


-- ---------------------------------------------------------------------------
-- Check (c): No overlapping zones between different units at same (level, safe_m)
--            (touching along a shared edge/point is allowed; interior
--            intersection/overlap/containment is forbidden).
-- PASS: 0 rows returned.
-- ---------------------------------------------------------------------------
SELECT
  z1.level,
  z1.safe_m,
  z1.scope_code AS unit_a,
  z2.scope_code AS unit_b,
  extensions.ST_Area(
    extensions.ST_Transform(
      extensions.ST_Intersection(z1.geom, z2.geom),
      32735
    )
  ) AS overlap_area_m2
FROM public.boundary_certainty_zones z1
JOIN public.boundary_certainty_zones z2
  ON z1.level = z2.level
 AND z1.safe_m = z2.safe_m
 AND z1.boundary_id < z2.boundary_id
 AND z1.geom OPERATOR(extensions.&&) z2.geom
WHERE extensions.ST_Intersects(z1.geom, z2.geom)
  AND NOT extensions.ST_Touches(z1.geom, z2.geom);


-- ---------------------------------------------------------------------------
-- Check (d): Interior point distance invariant
--            For every certainty zone at safe_m = D, ST_PointOnSurface(z.geom)
--            must be >= (D - 0.5) metres from its parent polygon's boundary
--            measured in EPSG:32735.
-- PASS: 0 rows returned.
-- ---------------------------------------------------------------------------
WITH sampled AS (
  SELECT
    z.id AS zone_id,
    z.scope_code,
    z.level,
    z.safe_m,
    extensions.ST_Distance(
      extensions.ST_Transform(extensions.ST_PointOnSurface(z.geom), 32735),
      extensions.ST_Boundary(extensions.ST_Transform(b.geom, 32735))
    ) AS dist_to_border_m
  FROM public.boundary_certainty_zones z
  JOIN public.boundaries b
    ON b.id = z.boundary_id
   AND b.valid_to IS NULL
)
SELECT
  s.zone_id,
  s.scope_code,
  s.level,
  s.safe_m,
  ROUND(s.dist_to_border_m::numeric, 3) AS dist_to_border_m
FROM sampled s
WHERE s.dist_to_border_m < (s.safe_m::double precision - 0.5);


-- ---------------------------------------------------------------------------
-- Check (e): Border-offset test (500+ random border points moved inward by
--            5 m, 20 m, 40 m, 80 m, 150 m)
--            Note: The prompt specification for item (e) was truncated at
--            "moved inward by 5 m, 2". Below we test 5 offsets (5, 20, 40,
--            80, 150 m) across >= 500 sampled unit border locations using
--            normal rays into the polygon interior, verifying:
--            1. ZERO false confirmations (confirmed scope_code != true unit).
--            2. At 5 m and 20 m inward (with accuracy_m = 10 -> needed_m = 35),
--               village status is NEVER 'confirmed' (must be 'near_border').
--            3. At 40 m+ inward (accuracy_m = 10 -> needed_m = 35), units whose
--               zones exist confirm cleanly without returning a wrong unit.
-- PASS: false_confirmations = 0 AND unsafe_near_border_confirmations = 0.
-- ---------------------------------------------------------------------------
WITH random_units AS (
  SELECT
    b.id,
    b.scope_code,
    b.level::text AS level,
    extensions.ST_Transform(b.geom, 32735) AS geom_32735
  FROM public.boundaries b
  WHERE b.valid_to IS NULL
    AND b.level::text IN ('village', 'cell', 'sector')
  ORDER BY pg_catalog.random()
  LIMIT 120
),
border_samples AS (
  -- Sample 5 random fractions along each selected unit's exterior ring (~600 border points)
  SELECT
    ru.id,
    ru.scope_code,
    ru.level,
    ru.geom_32735,
    extensions.ST_Boundary(ru.geom_32735) AS bnd_32735,
    extensions.ST_ExteriorRing(extensions.ST_GeometryN(ru.geom_32735, 1)) AS ring_32735,
    gs.f AS frac
  FROM random_units ru
  CROSS JOIN (VALUES (0.11), (0.29), (0.47), (0.68), (0.86)) AS gs(f)
  WHERE extensions.ST_NumGeometries(ru.geom_32735) >= 1
),
ray_candidates AS (
  SELECT
    bs.id,
    bs.scope_code,
    bs.level,
    bs.geom_32735,
    bs.bnd_32735,
    offs.offset_m,
    extensions.ST_LineInterpolatePoint(bs.ring_32735, bs.frac) AS p0,
    extensions.ST_LineInterpolatePoint(
      bs.ring_32735,
      LEAST(1.0, bs.frac + 0.0005)
    ) AS p1
  FROM border_samples bs
  CROSS JOIN (VALUES (5.0), (20.0), (40.0), (80.0), (150.0)) AS offs(offset_m)
  WHERE bs.ring_32735 IS NOT NULL
),
inward_points AS (
  -- Try both left-hand and right-hand unit normals from tangent (p1 - p0);
  -- keep the point that actually lands inside geom_32735 at ~offset_m from border.
  SELECT
    rc.scope_code AS true_scope_code,
    rc.level,
    rc.offset_m,
    cand.pt_32735,
    extensions.ST_Distance(cand.pt_32735, rc.bnd_32735) AS actual_border_dist_m
  FROM ray_candidates rc
  CROSS JOIN LATERAL (
    SELECT
      extensions.ST_X(rc.p1) - extensions.ST_X(rc.p0) AS dx,
      extensions.ST_Y(rc.p1) - extensions.ST_Y(rc.p0) AS dy
  ) vec
  CROSS JOIN LATERAL (VALUES (-1.0), (1.0)) AS sgn(s)
  CROSS JOIN LATERAL (
    SELECT extensions.ST_SetSRID(
      extensions.ST_MakePoint(
        extensions.ST_X(rc.p0) + sgn.s * (-vec.dy / NULLIF(SQRT(vec.dx * vec.dx + vec.dy * vec.dy), 0.0)) * rc.offset_m,
        extensions.ST_Y(rc.p0) + sgn.s * ( vec.dx / NULLIF(SQRT(vec.dx * vec.dx + vec.dy * vec.dy), 0.0)) * rc.offset_m
      ),
      32735
    ) AS pt_32735
  ) cand
  WHERE extensions.ST_Covers(rc.geom_32735, cand.pt_32735)
    AND extensions.ST_Distance(cand.pt_32735, rc.bnd_32735) >= (rc.offset_m - 0.5)
),
evaluated AS (
  SELECT
    ip.true_scope_code,
    ip.level,
    ip.offset_m,
    ip.actual_border_dist_m,
    extensions.ST_X(extensions.ST_Transform(ip.pt_32735, 4326)) AS lng,
    extensions.ST_Y(extensions.ST_Transform(ip.pt_32735, 4326)) AS lat,
    public.certainty_lookup_v1(
      extensions.ST_X(extensions.ST_Transform(ip.pt_32735, 4326)),
      extensions.ST_Y(extensions.ST_Transform(ip.pt_32735, 4326)),
      10.0 -- needed_m = ceil(2.5*10 + 10) = 35 m
    ) AS lookup_res
  FROM inward_points ip
  WHERE extensions.ST_X(extensions.ST_Transform(ip.pt_32735, 4326)) BETWEEN 28.7 AND 31.1
    AND extensions.ST_Y(extensions.ST_Transform(ip.pt_32735, 4326)) BETWEEN -3.0 AND -0.8
  LIMIT 1000
)
SELECT
  COUNT(*) AS total_tested_points,
  COUNT(*) FILTER (
    WHERE (e.lookup_res #>> ARRAY['levels', e.level, 'status']) = 'confirmed'
      AND (e.lookup_res #>> ARRAY['levels', e.level, 'scope_code']) IS DISTINCT FROM e.true_scope_code
  ) AS false_confirmations,
  COUNT(*) FILTER (
    WHERE e.offset_m IN (5.0, 20.0)
      AND (e.lookup_res #>> ARRAY['levels', e.level, 'status']) = 'confirmed'
  ) AS unsafe_near_border_confirmations,
  COUNT(*) FILTER (
    WHERE e.offset_m >= 40.0
      AND (e.lookup_res #>> ARRAY['levels', e.level, 'status']) = 'confirmed'
      AND (e.lookup_res #>> ARRAY['levels', e.level, 'scope_code']) = e.true_scope_code
  ) AS correct_deep_confirmations,
  COUNT(*) FILTER (
    WHERE (e.lookup_res #>> ARRAY['levels', e.level, 'status']) = 'near_border'
  ) AS near_border_count
FROM evaluated e;