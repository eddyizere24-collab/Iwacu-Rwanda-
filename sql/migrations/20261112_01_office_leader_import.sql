-- IWACU RWANDA — Bulk leader import (M8). Additive.
-- One server-only function that puts many leader cards in at once from a list (JSON), so leaders never have to be typed one by one.
-- Rules: districts, sectors and cells only; a card that already exists is NEVER overwritten (what an office typed by hand wins);
-- every imported card starts UNCONFIRMED (verified_at stays empty) so the public site shows it as not yet confirmed;
-- a bad row is skipped and counted, it never stops the others. Nothing here is readable or callable by signed-in users.
begin;

create or replace function public.office_import_leaders_v1(p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; v_unit uuid; v_level text; v_name text; v_phone text; v_title text;
  v_ins integer := 0; v_exist integer := 0; v_unknown integer := 0; v_bad integer := 0; v_nophone integer := 0;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Expected a list' using errcode = '22023'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'At most 2000 rows per call' using errcode = '22023'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    v_name := btrim(coalesce(r ->> 'display_name', ''));
    v_title := nullif(btrim(coalesce(r ->> 'job_title', '')), '');
    v_phone := nullif(btrim(coalesce(r ->> 'phone', '')), '');
    if char_length(v_name) < 2 or char_length(v_name) > 120 or (v_title is not null and char_length(v_title) > 120) then
      v_bad := v_bad + 1; continue;
    end if;
    if v_phone is not null and v_phone !~ '^\+?[0-9 ]{7,16}$' then v_phone := null; v_nophone := v_nophone + 1; end if;
    select b.id, b.level::text into v_unit, v_level
    from public.boundaries b
    where b.scope_code = r ->> 'scope_code' and b.valid_to is null and b.level::text in ('district','sector','cell');
    if v_unit is null then v_unknown := v_unknown + 1; continue; end if;
    insert into public.office_unit_leaders(unit_id, display_name, job_title, phone, is_public, show_phone)
    values (v_unit, v_name, v_title, v_phone, true, v_phone is not null)
    on conflict (unit_id) do nothing;
    if found then v_ins := v_ins + 1; else v_exist := v_exist + 1; end if;
  end loop;
  return jsonb_build_object('inserted', v_ins, 'skipped_existing', v_exist, 'unknown_place', v_unknown,
                            'invalid', v_bad, 'phone_dropped', v_nophone);
end $$;

revoke all on function public.office_import_leaders_v1(jsonb) from public, anon, authenticated;
grant execute on function public.office_import_leaders_v1(jsonb) to service_role;

commit;
