-- CHANGED 2026-11-05 CLAUDE: contract for migration 20261105_01 (public verified_at + citizen feedback); see docs/HANDOFF.md
\set ON_ERROR_STOP on

-- Structure: verified_at is the LAST column of the public view; anon sees only the decision date of a verification case.
do $m2$
declare
  v_last text;
begin
  select a.attname into v_last
  from pg_attribute a
  where a.attrelid='public.leader_directory_public'::regclass and a.attnum>0 and not a.attisdropped
  order by a.attnum desc limit 1;
  if v_last is distinct from 'verified_at' then raise exception 'verified_at must be the last column of leader_directory_public, got %',v_last; end if;
  if not has_column_privilege('anon','public.leader_verification_cases','decision_at','select') then
    raise exception 'anon cannot read the verification decision date';
  end if;
  if has_column_privilege('anon','public.leader_verification_cases','decision_by','select')
     or has_column_privilege('anon','public.leader_verification_cases','decision_reason','select')
     or has_column_privilege('anon','public.leader_verification_cases','submitted_by','select')
     or has_column_privilege('anon','public.leader_verification_cases','assigned_reviewer','select')
     or has_table_privilege('anon','public.leader_verification_cases','select') then
    raise exception 'anon can read verification columns beyond status and decision date';
  end if;
  -- feedback privileges: insert of four columns only, nothing readable or changeable by the public.
  if has_table_privilege('anon','public.leader_public_feedback','select')
     or has_table_privilege('authenticated','public.leader_public_feedback','delete')
     or has_table_privilege('anon','public.leader_public_feedback','update')
     or has_table_privilege('anon','public.leader_public_feedback','delete')
     or has_table_privilege('anon','public.leader_public_feedback','truncate')
     or has_table_privilege('authenticated','public.leader_public_feedback','truncate')
     or has_any_column_privilege('anon','public.leader_public_feedback','select')
     or has_any_column_privilege('anon','public.leader_public_feedback','update') then
    raise exception 'public feedback privileges are too wide';
  end if;
  if not (has_column_privilege('anon','public.leader_public_feedback','message','insert')
      and has_column_privilege('anon','public.leader_public_feedback','category','insert')
      and has_column_privilege('anon','public.leader_public_feedback','appointment_id','insert')
      and has_column_privilege('anon','public.leader_public_feedback','administrative_unit_id','insert')) then
    raise exception 'anon cannot insert feedback';
  end if;
  if has_column_privilege('anon','public.leader_public_feedback','status','insert')
     or has_column_privilege('anon','public.leader_public_feedback','id','insert')
     or has_column_privilege('anon','public.leader_public_feedback','created_at','insert') then
    raise exception 'anon can set server-owned feedback columns';
  end if;
end
$m2$;

-- Public candidate RPC returns verified_at for exact-place and shared leaders and still leaks nothing private.
begin;
set local role anon;
set local request.jwt.claim.sub='';
do $m2_public$
declare
  v_one jsonb;
  v_leader jsonb;
begin
  v_one:=public.get_leader_candidates_v2(array['RW-01-01-01-01']);
  for v_leader in select value from jsonb_array_elements(v_one->'shared_leaders') loop
    if not (v_leader->'appointment') ? 'verified_at' then raise exception 'shared leader is missing appointment.verified_at'; end if;
    if (v_leader->'appointment'->>'verified_at') is null then raise exception 'published leader has no verified_at'; end if;
  end loop;
  if jsonb_array_length(v_one->'shared_leaders')=0 then raise exception 'fixture lost: expected at least one shared leader'; end if;
  if (v_one::text ~* 'decision_by|decision_reason|submitted_by|assigned_reviewer|private_storage_key|admin_dossier|internal_notes') then
    raise exception 'private verification field leaked into the public candidate response';
  end if;
end
$m2_public$;
rollback;

-- Citizen feedback behaviour as anon: a valid row is accepted, bad rows are rejected, the row cannot be read back.
begin;
set local role anon;
set local request.jwt.claim.sub='';
do $m2_feedback$
declare
  v_unit uuid;
  v_state text;
  v_count int;
begin
  select id into v_unit from public.boundaries where scope_code='RW-01-01-01-01' and valid_to is null;
  if v_unit is null then raise exception 'fixture lost: cell RW-01-01-01-01'; end if;
  insert into public.leader_public_feedback(administrative_unit_id,category,message) values (v_unit,'wrong_leader','Umuyobozi yahindutse');

  begin insert into public.leader_public_feedback(administrative_unit_id,category,message) values (v_unit,'spam','x'); exception when check_violation then v_state:='ok'; end;
  if v_state is distinct from 'ok' then raise exception 'invalid category accepted'; end if; v_state:=null;
  begin insert into public.leader_public_feedback(administrative_unit_id,category,message) values (v_unit,'other','   '); exception when check_violation then v_state:='ok'; end;
  if v_state is distinct from 'ok' then raise exception 'blank message accepted'; end if; v_state:=null;
  begin insert into public.leader_public_feedback(administrative_unit_id,category,message) values (v_unit,'other',repeat('a',501)); exception when check_violation then v_state:='ok'; end;
  if v_state is distinct from 'ok' then raise exception '501 character message accepted'; end if; v_state:=null;
  begin insert into public.leader_public_feedback(category,message) values ('other','no target'); exception when check_violation then v_state:='ok'; end;
  if v_state is distinct from 'ok' then raise exception 'feedback without any target accepted'; end if; v_state:=null;
  begin insert into public.leader_public_feedback(administrative_unit_id,category,message,status) values (v_unit,'other','x','resolved'); exception when insufficient_privilege then v_state:='ok'; end;
  if v_state is distinct from 'ok' then raise exception 'anon could set status'; end if; v_state:=null;
  begin select count(*) into v_count from public.leader_public_feedback; exception when insufficient_privilege then v_state:='ok'; end;
  if v_state is distinct from 'ok' then raise exception 'anon could read feedback back'; end if;
end
$m2_feedback$;
rollback;
