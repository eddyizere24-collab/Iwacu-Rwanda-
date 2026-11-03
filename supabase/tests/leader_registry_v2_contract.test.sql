-- Run only in an isolated Supabase test database after the foundation migration.
-- This is a schema/grant contract test, not a substitute for seeded multi-user RLS E2E tests.
begin;
select plan(22);
select has_table('public','admin_role_assignments','role assignments exist');
select has_table('public','admin_delegations','delegation records exist');
select has_table('public','leader_people','person registry exists');
select has_table('public','leader_positions','position catalogue exists');
select has_table('public','leader_appointments','appointment registry exists');
select has_table('public','leader_verification_cases','verification workflow exists');
select has_table('public','leader_appointment_evidence','evidence registry exists');
select has_table('public','leader_verification_decisions','decision history exists');
select has_table('public','leader_public_profiles','public profile projection exists');
select has_table('public','leader_contacts','contact visibility registry exists');
select has_table('public','leader_dossiers','confidential dossier exists');
select has_table('public','leader_dossier_documents','confidential document registry exists');
select has_table('public','leader_appointment_events','appointment history exists');
select has_table('public','leader_audit_events','leader audit exists');
select has_view('public','leader_directory_public','public directory view exists');
select has_column('public','leader_appointments','administrative_unit_id','appointments reference canonical boundary UUIDs');
select has_column('public','leader_verification_cases','decision_by','verification decision has reviewer identity');
select has_column('public','leader_contacts','public_approved_at','public contacts require explicit publication approval');
select has_column('public','leader_dossier_documents','private_storage_key','dossier documents use private object keys');
select ok((select relrowsecurity from pg_class where oid='public.leader_dossiers'::regclass),'dossier RLS is enabled');
select ok(not has_table_privilege('anon','public.leader_dossiers','select'),'anonymous users cannot select confidential dossier');
select ok(has_table_privilege('anon','public.leader_directory_public','select'),'anonymous users can query only the public directory view');
select * from finish();
rollback;
