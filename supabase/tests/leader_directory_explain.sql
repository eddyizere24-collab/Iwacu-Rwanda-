-- Query plan for the same bounded relational lookup used by get_leader_candidates_v2.
-- This deliberately selects no geom column and follows parent_id only.
\set ON_ERROR_STOP on
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
WITH RECURSIVE
requested AS MATERIALIZED (
  SELECT id, scope_code
  FROM public.boundaries
  WHERE scope_code IN ('RW-01-01-01-01-01','RW-01-01-01-02-01')
    AND valid_to IS NULL
  ORDER BY scope_code
  LIMIT 3
),
lineage AS (
  SELECT id AS candidate_id, id AS unit_id, 0 AS depth
  FROM requested
  UNION ALL
  SELECT l.candidate_id, parent.id, l.depth + 1
  FROM lineage l
  JOIN public.boundaries child ON child.id = l.unit_id AND child.valid_to IS NULL
  JOIN public.boundaries parent ON parent.id = child.parent_id AND parent.valid_to IS NULL
  WHERE l.depth < 5
),
matched AS MATERIALIZED (
  SELECT l.candidate_id, l.depth,
         v.appointment_id, v.administrative_unit_id, v.scope_code
  FROM lineage l
  JOIN public.leader_directory_public v
    ON v.administrative_unit_id = l.unit_id
  ORDER BY l.depth, v.scope_code, v.appointment_id
  LIMIT 300
)
SELECT candidate_id, depth, appointment_id, administrative_unit_id, scope_code
FROM matched
ORDER BY candidate_id, depth, appointment_id
LIMIT 300;
