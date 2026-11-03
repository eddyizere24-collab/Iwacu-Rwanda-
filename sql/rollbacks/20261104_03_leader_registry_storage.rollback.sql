-- Roll back L1 Storage setup only before files have been uploaded.
begin;
do $storage_rollback$
begin
  if exists(select 1 from storage.objects where bucket_id in ('leader-photos','leader-dossier')) then
    raise exception 'Rollback refused: L1 Storage buckets contain objects; retain/export them before rollback.';
  end if;
end
$storage_rollback$;
drop policy if exists leader_photos_upload_scoped on storage.objects;
drop policy if exists leader_photos_delete_scoped on storage.objects;
drop policy if exists leader_evidence_upload_scoped on storage.objects;
drop policy if exists leader_dossier_upload_scoped on storage.objects;
drop policy if exists leader_dossier_read_scoped on storage.objects;
drop policy if exists leader_dossier_update_scoped on storage.objects;
drop policy if exists leader_dossier_delete_scoped on storage.objects;
delete from storage.buckets where id in ('leader-photos','leader-dossier');
commit;
