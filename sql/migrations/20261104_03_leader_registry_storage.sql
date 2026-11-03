-- [CHATGPT] Leaders L1: create public-photo and private-dossier Storage buckets.
-- All object transfers use Supabase Storage APIs. Never write storage.objects directly.
begin;

do $buckets$
begin
  if exists (select 1 from storage.buckets where id in ('leader-photos','leader-dossier')) then
    raise exception 'L1 stopped: a reserved leader Storage bucket already exists; inspect it before migration';
  end if;
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values ('leader-photos','leader-photos',true,153600,array['image/webp','image/jpeg','image/png']::text[]);
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values ('leader-dossier','leader-dossier',false,5242880,array['application/pdf','image/jpeg','image/png']::text[]);
end
$buckets$;

-- Uploading a photo is limited to an appointment inside the authenticated admin's scope.
drop policy if exists leader_photos_upload_scoped on storage.objects;
create policy leader_photos_upload_scoped
on storage.objects for insert to authenticated
with check (
  bucket_id='leader-photos'
  and cardinality(storage.foldername(name))>=1
  and exists (
    select 1 from public.leader_appointments a
    where a.id=(storage.foldername(name))[1]::uuid
      and private.leader_actor_can('edit',a.administrative_unit_id)
      and private.leader_appointment_is_public(a.id)
  )
);

drop policy if exists leader_photos_delete_scoped on storage.objects;
create policy leader_photos_delete_scoped
on storage.objects for delete to authenticated
using (
  bucket_id='leader-photos'
  and cardinality(storage.foldername(name))>=1
  and exists (
    select 1 from public.leader_appointments a
    where a.id=(storage.foldername(name))[1]::uuid
      and private.leader_actor_can('edit',a.administrative_unit_id)
  )
);

-- Public bucket reads are deliberately public by design. Do not create a
-- SELECT/list policy: the directory view only publishes keys for approved profiles.

-- Appointment evidence may be uploaded by an in-scope leader editor; only the
-- higher-scope dossier readers can download it through a short-lived signed URL.
drop policy if exists leader_evidence_upload_scoped on storage.objects;
create policy leader_evidence_upload_scoped
on storage.objects for insert to authenticated
with check (
  bucket_id='leader-dossier'
  and cardinality(storage.foldername(name))>=2
  and (storage.foldername(name))[2]='evidence'
  and exists (
    select 1 from public.leader_appointments a
    where a.person_id=(storage.foldername(name))[1]::uuid
      and private.leader_actor_can('edit',a.administrative_unit_id)
  )
);

drop policy if exists leader_dossier_upload_scoped on storage.objects;
create policy leader_dossier_upload_scoped
on storage.objects for insert to authenticated
with check (
  bucket_id='leader-dossier'
  and cardinality(storage.foldername(name))>=1
  and exists (
    select 1 from public.leader_appointments a
    where a.person_id=(storage.foldername(name))[1]::uuid
      and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
  )
);

drop policy if exists leader_dossier_read_scoped on storage.objects;
create policy leader_dossier_read_scoped
on storage.objects for select to authenticated
using (
  bucket_id='leader-dossier'
  and cardinality(storage.foldername(name))>=1
  and exists (
    select 1 from public.leader_appointments a
    where a.person_id=(storage.foldername(name))[1]::uuid
      and (
        private.leader_actor_can('view_dossier',a.administrative_unit_id)
        or (
          (storage.foldername(name))[2]='evidence'
          and private.leader_actor_can('approve',a.administrative_unit_id)
        )
        or (
          exists (
            select 1 from public.leader_appointment_evidence e
            where e.private_storage_key=storage.objects.name
              and e.uploaded_by=auth.uid()
          )
          and private.leader_actor_can('edit',a.administrative_unit_id)
        )
      )
  )
);

drop policy if exists leader_dossier_update_scoped on storage.objects;
create policy leader_dossier_update_scoped
on storage.objects for update to authenticated
using (
  bucket_id='leader-dossier'
  and cardinality(storage.foldername(name))>=1
  and exists (
    select 1 from public.leader_appointments a
    where a.person_id=(storage.foldername(name))[1]::uuid
      and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
  )
)
with check (
  bucket_id='leader-dossier'
  and cardinality(storage.foldername(name))>=1
  and exists (
    select 1 from public.leader_appointments a
    where a.person_id=(storage.foldername(name))[1]::uuid
      and private.leader_actor_can('edit_dossier',a.administrative_unit_id)
  )
);

-- Permit scoped compensation cleanup if metadata inserts fail. Evidence is
-- removable by an in-scope editor; dossier files by a dossier editor only.
drop policy if exists leader_dossier_delete_scoped on storage.objects;
create policy leader_dossier_delete_scoped
on storage.objects for delete to authenticated
using (
  bucket_id='leader-dossier'
  and cardinality(storage.foldername(name))>=1
  and exists (
    select 1 from public.leader_appointments a
    where a.person_id=(storage.foldername(name))[1]::uuid
      and (
        ((storage.foldername(name))[2]='evidence'
          and private.leader_actor_can('edit',a.administrative_unit_id))
        or
        ((storage.foldername(name))[2] is distinct from 'evidence'
          and private.leader_actor_can('edit_dossier',a.administrative_unit_id))
      )
  )
);

commit;
