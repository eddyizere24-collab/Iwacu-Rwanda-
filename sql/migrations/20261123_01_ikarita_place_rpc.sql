-- IWACU RWANDA map page: one public place (any level) with its simplified outline and its direct children.
-- SECURITY DEFINER is deliberately narrow: only active administrative boundaries and their public names.
-- It never reads leaders, contacts or private fields. Additive migration.

create or replace function public.get_ikarita_place_v1(p_scope_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path to pg_catalog, extensions
as $ikarita_place$
declare
  v_row record;
  v_tol double precision;
  v_bbox jsonb;
  v_center jsonb;
  v_geom jsonb;
  v_children jsonb;
  v_ancestors jsonb;
  v_parts text[];
  v_prefixes text[];
begin
  if p_scope_code is null or p_scope_code !~ '^RW(-[A-Z0-9]{1,12}){0,5}$' or length(p_scope_code) > 80 then
    return jsonb_build_object('found', false);
  end if;

  select b.id, b.scope_code, b.name_kiny, b.name_eng, b.level::text as level, b.path::text as path, b.geom
    into v_row
  from public.boundaries b
  where b.scope_code = p_scope_code and b.valid_to is null
  limit 1;

  if v_row.id is null then
    return jsonb_build_object('found', false);
  end if;

  v_tol := case v_row.level
    when 'country' then 0.01
    when 'province' then 0.003
    when 'district' then 0.0008
    when 'sector' then 0.0003
    when 'cell' then 0.0001
    else 0.000015
  end;

  v_bbox := jsonb_build_array(
    extensions.ST_XMin(v_row.geom), extensions.ST_YMin(v_row.geom),
    extensions.ST_XMax(v_row.geom), extensions.ST_YMax(v_row.geom)
  );
  v_center := jsonb_build_array(
    extensions.ST_X(extensions.ST_PointOnSurface(v_row.geom)),
    extensions.ST_Y(extensions.ST_PointOnSurface(v_row.geom))
  );
  v_geom := extensions.ST_AsGeoJSON(
    extensions.ST_SimplifyPreserveTopology(v_row.geom, v_tol), 6, 0
  )::jsonb;

  select coalesce(jsonb_agg(jsonb_build_object(
           'scope_code', c.scope_code,
           'name_kiny', c.name_kiny,
           'name_eng', c.name_eng,
           'level', c.level::text,
           'center', jsonb_build_array(
             extensions.ST_X(extensions.ST_PointOnSurface(c.geom)),
             extensions.ST_Y(extensions.ST_PointOnSurface(c.geom))
           )
         ) order by c.name_kiny), '[]'::jsonb)
    into v_children
  from public.boundaries c
  where c.parent_id = v_row.id and c.valid_to is null and v_row.level <> 'village';

  -- Higher levels (province, district, sector, cell) found from the scope code prefixes.
  v_parts := string_to_array(v_row.scope_code, '-');
  v_prefixes := array(
    select array_to_string(v_parts[1:i], '-')
    from generate_series(1, coalesce(array_length(v_parts, 1), 1) - 1) as i
  );
  select coalesce(jsonb_agg(jsonb_build_object(
           'scope_code', a.scope_code,
           'name_kiny', a.name_kiny,
           'name_eng', a.name_eng,
           'level', a.level::text
         ) order by length(a.scope_code)), '[]'::jsonb)
    into v_ancestors
  from public.boundaries a
  where a.scope_code = any(v_prefixes) and a.valid_to is null;

  return jsonb_build_object(
    'found', true,
    'scope_code', v_row.scope_code,
    'name_kiny', v_row.name_kiny,
    'name_eng', v_row.name_eng,
    'level', v_row.level,
    'path', v_row.path,
    'bbox', v_bbox,
    'center', v_center,
    'geometry', v_geom,
    'children', v_children,
    'ancestors', v_ancestors
  );
end;
$ikarita_place$;

revoke all on function public.get_ikarita_place_v1(text) from public, anon, authenticated;
grant execute on function public.get_ikarita_place_v1(text) to anon, authenticated, service_role;
