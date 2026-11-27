-- Rollback: 20261120_01_boundary_certainty_zones.sql
-- Drops only the objects created by that migration. Does not touch public.boundaries or any pre-existing function.

BEGIN;

DROP FUNCTION IF EXISTS public.certainty_lookup_v1(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.build_boundary_certainty_zones_v1(text, integer);
DROP TABLE IF EXISTS public.boundary_certainty_zones;

COMMIT;
