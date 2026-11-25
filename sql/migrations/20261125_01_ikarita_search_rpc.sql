-- Applied to production as ikarita_search_places_v1 on 2026-11-25.
-- Map page / Iwacu AI place search as owner: public.search_places takes ~27 s under the anon role (row-level policies)
-- and is cut off at the 3 s anon statement_timeout. Same public names and hierarchy only. Additive.
create or replace function public.get_ikarita_search_v1(p_query text, p_limit integer default 30)
returns table(scope_code text, level text, name_kiny text, name_eng text, full_path text, match_score real)
language sql
stable
security definer
set search_path to pg_catalog, public, extensions
as $ikarita_search$
  with q as (
    select lower(extensions.unaccent(btrim(coalesce(p_query, '')))) as needle
  ),
  ranked as (
    select p.id, p.scope_code, p.level, p.path, p.name_kiny, p.name_eng,
           case
             when pn.normalized_name = q.needle then 1.0::real
             when pn.normalized_name like q.needle || '%' then 0.9::real
             when pn.normalized_name like '%' || q.needle || '%' then 0.75::real
             else extensions.similarity(pn.normalized_name, q.needle)
           end as score,
           row_number() over (
             partition by p.id
             order by
               case
                 when pn.normalized_name = q.needle then 1
                 when pn.normalized_name like q.needle || '%' then 2
                 when pn.normalized_name like '%' || q.needle || '%' then 3
                 else 4
               end,
               extensions.similarity(pn.normalized_name, q.needle) desc
           ) as place_rank
    from public.places p
    join public.place_names pn on pn.place_id = p.id
    cross join q
    where p.valid_to is null
      and length(q.needle) between 2 and 80
      and (
        pn.normalized_name = q.needle
        or pn.normalized_name like q.needle || '%'
        or pn.normalized_name like '%' || q.needle || '%'
        or pn.normalized_name operator(extensions.%) q.needle
      )
  ),
  top as (
    select r.* from ranked r
    where r.place_rank = 1
    order by r.score desc,
      case r.level when 'district' then 1 when 'sector' then 2 when 'cell' then 3 when 'village' then 4 when 'province' then 5 else 6 end,
      r.name_kiny
    limit greatest(1, least(coalesce(p_limit, 30), 60))
  )
  select t.scope_code, t.level::text, t.name_kiny, t.name_eng,
         (select string_agg(a.name_kiny, ' / ' order by extensions.nlevel(a.path)) from public.places a where a.path @> t.path) as full_path,
         t.score
  from top t
  order by t.score desc,
    case t.level when 'district' then 1 when 'sector' then 2 when 'cell' then 3 when 'village' then 4 when 'province' then 5 else 6 end,
    t.name_kiny;
$ikarita_search$;

grant execute on function public.get_ikarita_search_v1(text, integer) to anon, authenticated;
