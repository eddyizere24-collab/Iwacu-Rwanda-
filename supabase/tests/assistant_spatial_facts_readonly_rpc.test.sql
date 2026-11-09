-- Contract tests for the read-only live-geometry RPC, using synthetic CI polygons only.
do $$
declare
  v jsonb;
  distance_value double precision;
begin
  v := public.assistant_spatial_facts_v1('RW-P1-D12', null, true);
  if v->>'status' is distinct from 'ok' then
    raise exception 'expected ok area/adjacency response, got %', v;
  end if;
  if (v->>'area_m2')::double precision <= 0 then
    raise exception 'area must be positive';
  end if;
  if jsonb_array_length(v->'neighbors') <> 1
     or v->'neighbors'->0->>'scope_code' is distinct from 'RW-TST-D2' then
    raise exception 'touching polygon adjacency was not returned correctly: %', v->'neighbors';
  end if;

  v := public.assistant_spatial_facts_v1('RW-P1-D12', 'RW-TST-D3', false);
  if v->>'status' is distinct from 'ok'
     or v->>'distance_method' is distinct from 'point_on_surface_geography' then
    raise exception 'distance response contract failed: %', v;
  end if;
  distance_value := (v->>'distance_m')::double precision;
  if distance_value <= 0 then
    raise exception 'distance must be positive';
  end if;
  if v->>'destination' is null then
    raise exception 'destination metadata is required';
  end if;

  v := public.assistant_spatial_facts_v1('RW-TST-NOT-FOUND', null, false);
  if v->>'status' is distinct from 'missing' then
    raise exception 'unknown scope must return missing: %', v;
  end if;

  v := public.assistant_spatial_facts_v1('RW-P1-D12', 'RW-TST-NOT-FOUND', false);
  if v->>'status' is distinct from 'missing_destination' then
    raise exception 'unknown destination must return missing_destination: %', v;
  end if;
end
$$;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.assistant_spatial_facts_v1(text,text,boolean)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute the service-only spatial RPC';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.assistant_spatial_facts_v1(text,text,boolean)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not execute the service-only spatial RPC';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.assistant_spatial_facts_v1(text,text,boolean)',
    'EXECUTE'
  ) then
    raise exception 'service_role must execute the spatial RPC';
  end if;
end
$$;
