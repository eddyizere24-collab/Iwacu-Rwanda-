-- Read-only spatial facts for Ishakiro.
-- This migration creates one SECURITY INVOKER function. It does not insert,
-- update, delete, replace, or ingest boundary records.
-- Only the server-side service_role may execute the function.

create or replace function public.assistant_spatial_facts_v1(
  p_scope_code text,
  p_to_scope_code text default null,
  p_include_neighbors boolean default false
)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'pg_catalog', 'public', 'extensions'
as $function$
declare
  v_origin public.boundaries%rowtype;
  v_destination public.boundaries%rowtype;
  v_area_m2 double precision;
  v_distance_m double precision;
  v_neighbors jsonb := '[]'::jsonb;
  v_data_date text;
begin
  if p_scope_code is null
     or p_scope_code !~ '^RW(-[A-Z0-9]{1,12}){0,5}$' then
    raise exception 'Invalid spatial scope code' using errcode = '22023';
  end if;

  if p_to_scope_code is not null
     and p_to_scope_code !~ '^RW(-[A-Z0-9]{1,12}){0,5}$' then
    raise exception 'Invalid destination scope code' using errcode = '22023';
  end if;

  select b.*
    into v_origin
  from public.boundaries b
  where b.scope_code = p_scope_code
    and b.valid_to is null
  limit 1;

  if not found then
    return jsonb_build_object(
      'status', 'missing',
      'source', 'public.boundaries',
      'scope_code', p_scope_code
    );
  end if;

  if v_origin.geom is null
     or ST_SRID(v_origin.geom) <> 4326
     or ST_IsEmpty(v_origin.geom)
     or not ST_IsValid(v_origin.geom) then
    return jsonb_build_object(
      'status', 'invalid_geometry',
      'source', 'public.boundaries',
      'scope_code', p_scope_code
    );
  end if;

  v_area_m2 := ST_Area(v_origin.geom::geography);
  v_data_date := to_char(v_origin.updated_at at time zone 'UTC', 'YYYY-MM-DD');

  if p_to_scope_code is not null then
    select b.*
      into v_destination
    from public.boundaries b
    where b.scope_code = p_to_scope_code
      and b.valid_to is null
    limit 1;

    if not found then
      return jsonb_build_object(
        'status', 'missing_destination',
        'source', 'public.boundaries',
        'scope_code', p_scope_code,
        'destination_scope_code', p_to_scope_code,
        'data_date', v_data_date
      );
    end if;

    if v_destination.geom is null
       or ST_SRID(v_destination.geom) <> 4326
       or ST_IsEmpty(v_destination.geom)
       or not ST_IsValid(v_destination.geom) then
      return jsonb_build_object(
        'status', 'invalid_geometry',
        'source', 'public.boundaries',
        'scope_code', p_scope_code,
        'destination_scope_code', p_to_scope_code,
        'data_date', v_data_date
      );
    end if;

    v_distance_m := ST_Distance(
      ST_PointOnSurface(v_origin.geom)::geography,
      ST_PointOnSurface(v_destination.geom)::geography
    );

    v_data_date := greatest(
      v_data_date,
      to_char(v_destination.updated_at at time zone 'UTC', 'YYYY-MM-DD')
    );
  end if;

  if coalesce(p_include_neighbors, false) then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'scope_code', n.scope_code,
          'name_kiny', n.name_kiny,
          'level', n.level::text
        )
        order by n.name_kiny, n.scope_code
      ),
      '[]'::jsonb
    )
    into v_neighbors
    from (
      select neighbor.scope_code, neighbor.name_kiny, neighbor.level
      from public.boundaries neighbor
      where neighbor.valid_to is null
        and neighbor.id <> v_origin.id
        and neighbor.level::text = v_origin.level::text
        and neighbor.geom is not null
        and ST_SRID(neighbor.geom) = 4326
        and not ST_IsEmpty(neighbor.geom)
        and ST_IsValid(neighbor.geom)
        and ST_Touches(v_origin.geom, neighbor.geom)
      order by neighbor.name_kiny, neighbor.scope_code
      limit 20
    ) n;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'source', 'public.boundaries',
    'geometry_srid', 4326,
    'origin', jsonb_build_object(
      'scope_code', v_origin.scope_code,
      'name_kiny', v_origin.name_kiny,
      'level', v_origin.level::text
    ),
    'area_m2', v_area_m2,
    'destination',
      case
        when p_to_scope_code is null then null
        else jsonb_build_object(
          'scope_code', v_destination.scope_code,
          'name_kiny', v_destination.name_kiny,
          'level', v_destination.level::text
        )
      end,
    'distance_m', v_distance_m,
    'distance_method',
      case when p_to_scope_code is null then null else 'point_on_surface_geography' end,
    'neighbors', v_neighbors,
    'data_date', v_data_date
  );
end;
$function$;

revoke all on function public.assistant_spatial_facts_v1(text, text, boolean) from public;
revoke execute on function public.assistant_spatial_facts_v1(text, text, boolean) from anon, authenticated;
grant select on table public.boundaries to service_role;
grant execute on function public.assistant_spatial_facts_v1(text, text, boolean) to service_role;
