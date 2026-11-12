-- Roll back only the additive v2 map overlay RPC.
-- Restore the application route to get_location_map_overlay before dropping this function.
REVOKE ALL ON FUNCTION public.get_location_map_overlay_v2(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_location_map_overlay_v2(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
);
