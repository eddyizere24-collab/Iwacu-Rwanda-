-- [CHATGPT] Leaders L1: versioned appointment end/archive operations with retained history and audit.
-- Additive only; the appointment table and all existing rows remain intact.
begin;

create or replace function public.change_leader_appointment_state_v2(
  p_appointment_id uuid,
  p_action text,
  p_effective_to date,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $state$
declare
  v_appointment public.leader_appointments%rowtype;
  v_updated public.leader_appointments%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  if p_action not in ('end','archive') then raise exception 'Unsupported appointment state action'; end if;
  if nullif(btrim(p_reason),'') is null or length(btrim(p_reason))<4 then
    raise exception 'A clear reason is required';
  end if;

  select * into v_appointment
  from public.leader_appointments
  where id=p_appointment_id
  for update;
  if not found then raise exception 'Appointment was not found' using errcode='P0002'; end if;
  if not private.leader_actor_can('edit',v_appointment.administrative_unit_id) then
    raise exception 'Administrator does not have appointment edit authority in this scope' using errcode='42501';
  end if;

  perform set_config('app.leader_change_reason',btrim(p_reason),true);

  if p_action='end' then
    if v_appointment.appointment_status not in ('pending','approved','active','suspended') then
      raise exception 'Only a pending or current appointment can be ended';
    end if;
    if p_effective_to is null or p_effective_to>current_date or p_effective_to<=v_appointment.effective_from then
      raise exception 'End date must be after appointment start and not in the future';
    end if;
    update public.leader_appointments
    set appointment_status='ended',effective_to=p_effective_to
    where id=p_appointment_id
    returning * into v_updated;
  else
    if v_appointment.appointment_status not in ('ended','rejected') then
      raise exception 'Only an ended or rejected appointment can be archived';
    end if;
    update public.leader_appointments
    set appointment_status='archived'
    where id=p_appointment_id
    returning * into v_updated;
  end if;

  perform set_config('app.leader_change_reason','',true);
  return jsonb_build_object(
    'appointment_id',v_updated.id,
    'person_id',v_updated.person_id,
    'appointment_status',v_updated.appointment_status,
    'effective_to',v_updated.effective_to,
    'version',v_updated.version
  );
end
$state$;

revoke all on function public.change_leader_appointment_state_v2(uuid,text,date,text) from public,anon;
grant execute on function public.change_leader_appointment_state_v2(uuid,text,date,text) to authenticated;

commit;
