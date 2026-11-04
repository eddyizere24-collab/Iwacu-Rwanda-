-- Roll back L1 appointment-state RPC before removing its UI.
begin;
revoke all on function public.change_leader_appointment_state_v2(uuid,text,date,text) from public,anon,authenticated;
drop function if exists public.change_leader_appointment_state_v2(uuid,text,date,text);
commit;
