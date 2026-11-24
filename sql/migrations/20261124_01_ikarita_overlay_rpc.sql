-- IWACU RWANDA map page: public administrative outlines inside a small box, for one level at a time
-- (village, cell, sector, district), pre-simplified to the requested tolerance and written with 5 decimals.
-- Used by the map page tiles and by the build step that prepares the Kigali static pack.
-- SECURITY DEFINER is deliberately narrow: only active boundaries and their public names. Additive migration.

create or replace function public.get_ikarita_overlay_v1(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_level text,
  p_tolerance double precision default 0.00003,
  p_limit integer default 1500
)
returns jsonb
language plpgsql
stable
security definer
set search_path to pg_catalog, extensions
as $ikarita_overlay$
declare
  v_bounds extensions.geometry;
  v_limit integer := least(greatest(coalesce(p_limit, 1500), 1), 2500);
  v_tol double precision := least(greatest(coalesce(p_tolerance, 0.00003), 0.00001), 0.002);
  v_features jsonb;
  v_count integer;
begin
  if p_level is null or p_level not in ('village', 'cell', 'sector', 'district') then
    raise exception 'Unsupported level' using errcode = '22023';
  end if;
  if p_west is null or p_south is null or p_east is null or p_north is null
     or p_west = 'NaN'::double precision or p_south = 'NaN'::double precision
     or p_east = 'NaN'::double precision or p_north = 'NaN'::double precision
     or p_west < 28.7 or p_east > 31.1 or p_south < -3.0 or p_north > -0.8
     or p_west >= p_east or p_south >= p_north
     or (p_east - p_west) > 0.5 or (p_north - p_south) > 0.5 then
    raise exception 'Map bounds are outside the supported Rwanda map window' using errcode = '22023';
  end if;

  v_bounds := extensions.ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326);

  with picked as (
    select b.scope_code, b.name_kiny, b.name_eng, b.geom
    from public.boundaries b
    where b.valid_to is null
      and b.level::text = p_level
      and b.geom && v_bounds
      and extensions.ST_Intersects(b.geom, v_bounds)
    order by b.scope_code
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'type', 'Feature',
           'id', p.scope_code,
           'geometry', extensions.ST_AsGeoJSON(extensions.ST_SimplifyPreserveTopology(p.geom, v_tol), 5, 0)::jsonb,
           'properties', jsonb_build_object(
             'scope_code', p.scope_code,
             'name_kiny', p.name_kiny,
             'name_eng', p.name_eng,
             'level', p_level
           )
         ) order by p.scope_code), '[]'::jsonb),
         count(*)
    into v_features, v_count
  from picked p;

  return jsonb_build_object(
    'type', 'FeatureCollection',
    'features', v_features,
    'feature_count', v_count,
    'truncated', v_count >= v_limit
  );
end;
$ikarita_overlay$;

revoke all on function public.get_ikarita_overlay_v1(double precision, double precision, double precision, double precision, text, double precision, integer) from public, anon, authenticated;
grant execute on function public.get_ikarita_overlay_v1(double precision, double precision, double precision, double precision, text, double precision, integer) to anon, authenticated, service_role;
