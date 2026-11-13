begin;
drop function if exists public.office_import_leaders_v1(jsonb);
-- Imported cards are not removed here. To undo an import, delete from public.office_unit_leaders the rows whose
-- verified_at is null and whose updated_by is null and created_at falls inside the import window.
commit;
