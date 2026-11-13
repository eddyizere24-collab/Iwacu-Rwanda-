-- IWACU RWANDA — make the public place list fast (replaces list_entry_places_v1, same signature, same output).
-- Why: the old version compared level::text and used LIKE on scope_code, so every call read all 17,423 boundary rows
-- (about 8,000 pages for districts, about 45,000 for sectors). Under load the 3-second public limit cancelled it (code 57014).
-- Now: districts use the (level, name) index; sectors and cells use the (parent, name) index. Nothing else changes.
begin;

create or replace function public.list_entry_places_v1(
  p_level text, p_parent_scope text default null, p_q text default null, p_limit integer default 40)
returns table(scope_code text, level text, name text, parent_name text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := nullif(replace(replace(btrim(coalesce(p_q, '')), '%', ''), '_', ''), '');
  v_lim integer := least(greatest(coalesce(p_limit, 40), 1), 60);
  v_parent_id uuid;
begin
  if p_level not in ('district','sector','cell') then raise exception 'Unknown level' using errcode = '22023'; end if;
  -- Literal level values (not casts) so the planner can use the level indexes whatever the column type is.
  if p_level = 'district' then
    return query
    select b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng), coalesce(pb.name_kiny, pb.name_eng)
    from public.boundaries b
    left join public.boundaries pb on pb.id = b.parent_id
    where b.level = 'district' and b.valid_to is null
      and (v_q is null or b.name_kiny ilike '%' || v_q || '%' or b.name_eng ilike '%' || v_q || '%')
    order by coalesce(b.name_kiny, b.name_eng), b.scope_code
    limit v_lim;
    return;
  end if;
  if p_parent_scope is not null then
    if p_level = 'sector' then
      select b.id into v_parent_id from public.boundaries b where b.scope_code = p_parent_scope and b.level = 'district' and b.valid_to is null;
    else
      select b.id into v_parent_id from public.boundaries b where b.scope_code = p_parent_scope and b.level = 'sector' and b.valid_to is null;
    end if;
  end if;
  if v_parent_id is null then raise exception 'Choose the place above first' using errcode = '22023'; end if;
  if p_level = 'sector' then
    return query
    select b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng), coalesce(pb.name_kiny, pb.name_eng)
    from public.boundaries b
    left join public.boundaries pb on pb.id = b.parent_id
    where b.parent_id = v_parent_id and b.level = 'sector' and b.valid_to is null
      and (v_q is null or b.name_kiny ilike '%' || v_q || '%' or b.name_eng ilike '%' || v_q || '%')
    order by coalesce(b.name_kiny, b.name_eng), b.scope_code
    limit v_lim;
  else
    return query
    select b.scope_code, b.level::text, coalesce(b.name_kiny, b.name_eng), coalesce(pb.name_kiny, pb.name_eng)
    from public.boundaries b
    left join public.boundaries pb on pb.id = b.parent_id
    where b.parent_id = v_parent_id and b.level = 'cell' and b.valid_to is null
      and (v_q is null or b.name_kiny ilike '%' || v_q || '%' or b.name_eng ilike '%' || v_q || '%')
    order by coalesce(b.name_kiny, b.name_eng), b.scope_code
    limit v_lim;
  end if;
end $$;

revoke all on function public.list_entry_places_v1(text, text, text, integer) from public;
grant execute on function public.list_entry_places_v1(text, text, text, integer) to anon, authenticated;

commit;
