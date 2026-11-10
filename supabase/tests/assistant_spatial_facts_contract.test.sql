-- Synthetic geometry contract tests only. No Rwanda geography is represented here.
do $$
declare
  parent_code text;
  child_count integer;
  area_value double precision;
  distance_value double precision;
  adjacent_count integer;
begin
  select p.scope_code into parent_code
  from assistant_spatial_fixture.get_parent('SYN-P1-D1') p;
  if parent_code is distinct from 'SYN-P1' then raise exception 'parent lookup failed: %', parent_code; end if;

  select count(*) into child_count
  from assistant_spatial_fixture.get_children('SYN-P1-D1');
  if child_count <> 2 then raise exception 'direct child count expected 2, got %', child_count; end if;

  select assistant_spatial_fixture.get_area_m2('SYN-P1-D1') into area_value;
  if area_value is null or area_value <= 0 then raise exception 'synthetic area invalid: %', area_value; end if;

  select assistant_spatial_fixture.distance_m('SYN-P1-D1', 'SYN-P1-D2') into distance_value;
  if distance_value is null or distance_value <= 0 then raise exception 'point distance invalid: %', distance_value; end if;

  select count(*) into adjacent_count
  from assistant_spatial_fixture.adjacent_scopes('SYN-P1-D1')
  where scope_code = 'SYN-P1-D2';
  if adjacent_count <> 1 then raise exception 'touching adjacency did not return SYN-P1-D2'; end if;
end
$$;
