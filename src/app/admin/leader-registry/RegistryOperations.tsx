"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Loader2, ShieldPlus, UserCheck } from "lucide-react";

type Unit = { id: string; scope_code: string; name_kiny: string; level: string; parent_id?: string | null };
type Assignment = { id: string; role_code: string; administrative_unit_id: string; valid_until: string | null; boundary: Unit | null };
type ManagedAssignment = { id: string; user_id: string; role_code: string; administrative_unit_id: string; assignment_status: string; grant_reason: string | null; valid_until: string | null };
type ManagedDelegation = { id: string; grantee_user_id: string; capability: string; administrative_unit_id: string; valid_until: string; reason: string; delegation_status: string };
type Appointment = {
  id: string; person_id: string; person: { first_name: string; last_name: string } | null;
  position_id: string; appointment_status: string; effective_from: string;
  position: { title_kiny: string; required_boundary_level: string } | null;
  boundary: Unit | null;
};
type Position = { id: string; title_kiny: string; code: string; required_boundary_level: string; position_status: string };
type Props = { assignments: Assignment[]; appointments: Appointment[]; positions: Position[]; onUpdated: () => void };

async function requestJson(url: string, init?: RequestInit) {
  const response=await fetch(url,{cache:"no-store",...init});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.status!=="success")throw new Error(payload?.message_kiny||"Ntibyashobotse kurangiza iki gikorwa.");
  return payload;
}

const childRole: Record<string,{role:string;level:string;label:string}> = {
  national_super_admin:{role:"district_admin",level:"district",label:"Akarere"},
  district_admin:{role:"sector_admin",level:"sector",label:"Umurenge"},
  sector_admin:{role:"cell_admin",level:"cell",label:"Akagari"},
};

export function RegistryOperations({assignments,appointments,positions,onUpdated}:Props){
  const [assignmentId,setAssignmentId]=useState(assignments[0]?.id??"");
  const [userId,setUserId]=useState("");
  const [unitId,setUnitId]=useState("");
  const [grantReason,setGrantReason]=useState("");
  const [validUntil,setValidUntil]=useState("");
  const [units,setUnits]=useState<Unit[]>([]);
  const [managedAssignments,setManagedAssignments]=useState<ManagedAssignment[]>([]);
  const [managedDelegations,setManagedDelegations]=useState<ManagedDelegation[]>([]);
  const [delegateUserId,setDelegateUserId]=useState("");
  const [delegateUnitId,setDelegateUnitId]=useState("");
  const [delegateCapability,setDelegateCapability]=useState("leader_read");
  const [delegateUntil,setDelegateUntil]=useState("");
  const [delegateReason,setDelegateReason]=useState("");
  const [delegationBusy,setDelegationBusy]=useState(false);
  const [revokingId,setRevokingId]=useState<string|null>(null);
  const [assignmentsBusy,setAssignmentsBusy]=useState(false);
  const [transferBusy,setTransferBusy]=useState(false);
  const [saveBusy,setSaveBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);

  const selectedAssignment=useMemo(()=>assignments.find(x=>x.id===assignmentId)??assignments[0]??null,[assignments,assignmentId]);
  const next=selectedAssignment?childRole[selectedAssignment.role_code]:undefined;
  const activeAppointments=appointments.filter(x=>["approved","active"].includes(x.appointment_status));
  const [oldAppointmentId,setOldAppointmentId]=useState("");
  const [newPositionId,setNewPositionId]=useState("");
  const [newUnitId,setNewUnitId]=useState("");
  const [transferUnits,setTransferUnits]=useState<Unit[]>([]);
  const [effectiveOn,setEffectiveOn]=useState(new Date().toISOString().slice(0,10));
  const [transferReason,setTransferReason]=useState("");
  const [evidenceType,setEvidenceType]=useState("appointment_letter");
  const [referenceNumber,setReferenceNumber]=useState("");
  const [issuer,setIssuer]=useState("");
  const selectedOld=activeAppointments.find(x=>x.id===oldAppointmentId);
  const unitDepth:Record<string,number>={country:0,province:1,district:2,sector:3,cell:4,village:5};
  const transferMinDepth=unitDepth[selectedAssignment?.boundary?.level??"country"]??0;
  const selectedPosition=positions.find(x=>x.id===newPositionId&&x.position_status==="approved");

  useEffect(()=>{
    if(!assignments.some(x=>x.id===assignmentId))setAssignmentId(assignments[0]?.id??"");
  },[assignments,assignmentId]);

  useEffect(()=>{
    let cancelled=false;
    async function loadUnits(){
      if(!selectedAssignment||!next){setUnits([]);return;}
      setAssignmentsBusy(true);setUnitId("");
      try{
        const params=new URLSearchParams({assignment_id:selectedAssignment.id,level:next.level,purpose:"assignment"});
        const payload=await requestJson("/api/admin/leader-registry/units?"+params.toString());
        if(!cancelled)setUnits((payload.units??[]) as Unit[]);
      }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:"Ahantu ntihabonetse.");}
      finally{if(!cancelled)setAssignmentsBusy(false);}
    }
    void loadUnits();
    return()=>{cancelled=true;};
  },[selectedAssignment?.id,next?.level]);

  useEffect(()=>{
    let cancelled=false;
    async function loadTransferUnits(){
      if(!selectedAssignment||!selectedPosition){setTransferUnits([]);return;}
      const params=new URLSearchParams({assignment_id:selectedAssignment.id,level:selectedPosition.required_boundary_level,purpose:"transfer"});
      try{
        const payload=await requestJson("/api/admin/leader-registry/units?"+params.toString());
        if(!cancelled)setTransferUnits((payload.units??[]) as Unit[]);
      }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:"Ahantu ho kwimurira ntihabonetse.");}
    }
    void loadTransferUnits();
    return()=>{cancelled=true;};
  },[selectedAssignment?.id,selectedPosition?.required_boundary_level]);

  useEffect(()=>{
    let cancelled=false;
    async function loadAssignments(){
      try{
        const [assignmentPayload,delegationPayload]=await Promise.all([
          requestJson("/api/admin/leader-registry/assignments"),
          requestJson("/api/admin/leader-registry/delegations"),
        ]);
        if(!cancelled){
          setManagedAssignments((assignmentPayload.assignments??[]) as ManagedAssignment[]);
          setManagedDelegations((delegationPayload.delegations??[]) as ManagedDelegation[]);
        }
      }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:"Assignments cyangwa delegations ntizabonetse.");}
    }
    void loadAssignments();
    return()=>{cancelled=true;};
  },[assignments.length]);

  async function createDelegation(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setDelegationBusy(true);setError(null);setNotice(null);
    try{
      const payload=await requestJson("/api/admin/leader-registry/delegations",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          grantee_user_id:delegateUserId.trim(),
          administrative_unit_id:delegateUnitId,
          capability:delegateCapability,
          valid_until:new Date(delegateUntil+"T23:59:59.000Z").toISOString(),
          reason:delegateReason,
        }),
      });
      setNotice("Delegation yabitswe: "+payload.delegation.capability+" · "+payload.delegation.grantee_user_id.slice(0,8));
      setDelegateUserId("");setDelegateUntil("");setDelegateReason("");
      const refreshed=await requestJson("/api/admin/leader-registry/delegations");
      setManagedDelegations((refreshed.delegations??[]) as ManagedDelegation[]);
      onUpdated();
    }catch(cause){setError(cause instanceof Error?cause.message:"Delegation ntiyabitswe.");}
    finally{setDelegationBusy(false);}
  }

  async function revokeDelegation(id:string){
    setRevokingId(id);setError(null);setNotice(null);
    try{
      await requestJson("/api/admin/leader-registry/delegations",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id,action:"revoke"}),
      });
      const refreshed=await requestJson("/api/admin/leader-registry/delegations");
      setManagedDelegations((refreshed.delegations??[]) as ManagedDelegation[]);
      setNotice("Delegation yahagaritswe; amateka yayo aragumaho.");
      onUpdated();
    }catch(cause){setError(cause instanceof Error?cause.message:"Guhagarika delegation byanze.");}
    finally{setRevokingId(null);}
  }

  async function revokeAssignment(id:string){
    setRevokingId(id);setError(null);setNotice(null);
    try{
      await requestJson("/api/admin/leader-registry/assignments",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id,action:"revoke"}),
      });
      setManagedAssignments(current=>current.filter(item=>item.id!==id));
      setNotice("Admin assignment yahagaritswe; amateka yayo aragumaho.");
      onUpdated();
    }catch(cause){setError(cause instanceof Error?cause.message:"Kuvanaho uburenganzira byanze.");}
    finally{setRevokingId(null);}
  }

  async function createAssignment(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSaveBusy(true);setError(null);setNotice(null);
    if(!selectedAssignment||!next){setError("Konti yawe ntifite ububasha bwo gutanga indi admin.");setSaveBusy(false);return;}
    try{
      const payload=await requestJson("/api/admin/leader-registry/assignments",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          assignment_id:selectedAssignment.id,user_id:userId.trim(),role_code:next.role,
          administrative_unit_id:unitId,grant_reason:grantReason,
          valid_until:validUntil?new Date(validUntil+"T23:59:59.000Z").toISOString():null,
        }),
      });
      setNotice("Admin assignment yabitswe: "+payload.assignment.role_code+" · "+(units.find(x=>x.id===unitId)?.name_kiny??""));
      setUserId("");setGrantReason("");setValidUntil("");setUnitId("");
      const refresh=await requestJson("/api/admin/leader-registry/assignments");
      setManagedAssignments((refresh.assignments??[]) as ManagedAssignment[]);
      onUpdated();
    }catch(cause){setError(cause instanceof Error?cause.message:"Ntibyashobotse gutanga assignment.");}
    finally{setSaveBusy(false);}
  }

  async function transfer(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setTransferBusy(true);setError(null);setNotice(null);
    if(!selectedOld||!selectedPosition){setError("Hitamo appointment ishaje n'umwanya mushya.");setTransferBusy(false);return;}
    try{
      const payload=await requestJson("/api/admin/leader-registry/transfers",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          old_appointment_id:oldAppointmentId,new_position_id:newPositionId,
          new_administrative_unit_id:newUnitId,effective_on:effectiveOn,
          transfer_reason:transferReason,evidence_type:evidenceType,
          reference_number:referenceNumber,issuer,
        }),
      });
      setNotice("Transfer yabitswe. Appointment nshya iri Pending: "+payload.transfer.new_appointment_id);
      setOldAppointmentId("");setNewPositionId("");setNewUnitId("");setTransferReason("");setReferenceNumber("");setIssuer("");
      onUpdated();
    }catch(cause){setError(cause instanceof Error?cause.message:"Transfer ntiyabitswe.");}
    finally{setTransferBusy(false);}
  }

  return(
    <section className="space-y-4">
      {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p>}

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2"><ShieldPlus className="h-5 w-5 text-[#20603D]"/><h2 className="font-bold">Gutanga uburenganzira bwa Admin</h2></div>
        <p className="text-xs text-muted-foreground">Iyi form yakira Supabase Auth User UUID y'umuntu wamaze gutumirwa no kwemeza konti. Ntabwo ihimba cyangwa ngo yohereze invitation.</p>
        {assignments.length>1&&<label className="block text-xs font-semibold">Assignment ukoresha<select value={assignmentId} onChange={e=>setAssignmentId(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs">{assignments.map(x=><option key={x.id} value={x.id}>{x.role_code} · {x.boundary?.name_kiny??x.id}</option>)}</select></label>}
        {!next?<p className="text-xs text-amber-700">Iyi role ntishobora gutanga indi admin. Cell accounts ntizitanga village accounts muri iyi version.</p>:(
          <form onSubmit={createAssignment} className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold sm:col-span-2">Supabase Auth User UUID<input required value={userId} onChange={e=>setUserId(e.target.value)} placeholder="UUID y'uwamaze kwinjizwa muri Auth" className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
            <label className="text-xs font-semibold">Inshingano<select disabled className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-muted px-2 text-xs"><option>{next.role} · {next.label}</option></select></label>
            <label className="text-xs font-semibold">Ahantu<select required value={unitId} onChange={e=>setUnitId(e.target.value)} disabled={assignmentsBusy} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"><option value="">-- Hitamo --</option>{units.map(x=><option key={x.id} value={x.id}>{x.name_kiny} · {x.scope_code}</option>)}</select></label>
            <label className="text-xs font-semibold sm:col-span-2">Impamvu yo gutanga uburenganzira<input required minLength={4} value={grantReason} onChange={e=>setGrantReason(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
            <label className="text-xs font-semibold">Uburenganzira burangira (optional)<input type="date" value={validUntil} onChange={e=>setValidUntil(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
            <button type="submit" disabled={saveBusy||!unitId||!userId.trim()} className="min-h-[42px] self-end rounded-lg bg-[#20603D] px-3 text-xs font-bold text-white disabled:opacity-50">{saveBusy?"Turabika...":"Tanga assignment"}</button>
          </form>
        )}
        <div className="border-t border-border pt-3">
          <h3 className="mb-2 text-xs font-bold">Admin assignments zigaragara muri scope yawe</h3>
          {managedAssignments.length===0?<p className="text-[11px] text-muted-foreground">Nta assignment y'abandi admin ubonera muri uru rwego.</p>:managedAssignments.map(item=>(
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0">
              <div className="min-w-0"><p className="text-xs font-semibold">{item.role_code} · {item.user_id.slice(0,8)}…</p><p className="text-[10px] text-muted-foreground">{item.grant_reason??"Uburenganzira bwatanzwe"} · {item.valid_until??"Nta tariki yo kurangira"}</p></div>
              {!assignments.some(own=>own.id===item.id)&&item.assignment_status==="active"&&<button type="button" disabled={revokingId===item.id} onClick={()=>void revokeAssignment(item.id)} className="min-h-[36px] rounded-lg border border-red-200 px-2 text-[10px] font-semibold text-red-700 disabled:opacity-50">{revokingId===item.id?"Birahagarikwa...":"Hagarika access"}</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-[#00A3E0]"/><h2 className="font-bold">Delegation y'ububasha</h2></div>
        <p className="text-xs text-muted-foreground">Delegation igira scope, capability, impamvu n'itariki izarangiriraho. DB RLS ni yo yemeza niba ufite ububasha bwo kuyitanga.</p>
        <form onSubmit={createDelegation} className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold sm:col-span-2">Supabase Auth User UUID<input required value={delegateUserId} onChange={e=>setDelegateUserId(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
          <label className="text-xs font-semibold">Capability<select value={delegateCapability} onChange={e=>setDelegateCapability(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs">
            <option value="leader_read">Kureba Leaders</option><option value="leader_edit">Guhindura Leaders</option><option value="leader_review">Gusuzuma / kwemeza</option><option value="leader_dossier_read">Kureba dossier y'ibanga</option><option value="leader_dossier_write">Guhindura dossier y'ibanga</option><option value="leader_audit_read">Kureba audit</option>
          </select></label>
          <label className="text-xs font-semibold">Agace (scope)<select required value={delegateUnitId} onChange={e=>setDelegateUnitId(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"><option value="">-- Hitamo --</option>{units.map(x=><option key={x.id} value={x.id}>{x.name_kiny} · {x.scope_code}</option>)}</select></label>
          <label className="text-xs font-semibold">Igihe izarangiriraho<input required type="date" min={new Date().toISOString().slice(0,10)} value={delegateUntil} onChange={e=>setDelegateUntil(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
          <label className="text-xs font-semibold">Impamvu<input required minLength={4} value={delegateReason} onChange={e=>setDelegateReason(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
          <button type="submit" disabled={delegationBusy||!delegateUnitId||!delegateUserId.trim()||!delegateUntil} className="min-h-[42px] self-end rounded-lg bg-[#00A3E0] px-3 text-xs font-bold text-white disabled:opacity-50">{delegationBusy?"Turabika...":"Tanga delegation"}</button>
        </form>
        <div className="border-t border-border pt-2">
          {managedDelegations.length===0?<p className="text-[11px] text-muted-foreground">Nta delegation igaragara muri scope yawe.</p>:managedDelegations.map(item=>(
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0">
              <div className="min-w-0"><p className="text-xs font-semibold">{item.capability} · {item.grantee_user_id.slice(0,8)}…</p><p className="text-[10px] text-muted-foreground">Expires {item.valid_until} · {item.reason}</p></div>
              {item.delegation_status==="active"&&<button type="button" disabled={revokingId===item.id} onClick={()=>void revokeDelegation(item.id)} className="min-h-[36px] rounded-lg border border-red-200 px-2 text-[10px] font-semibold text-red-700 disabled:opacity-50">Hagarika</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-[#00A3E0]"/><h2 className="font-bold">Transfer y'umuyobozi</h2></div>
        <p className="text-xs text-muted-foreground">Imyanya ishaje ntisibwa. DB function irayirangiza, igakora appointment nshya ya person umwe ikajya muri Pending.</p>
        <form onSubmit={transfer} className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold sm:col-span-2">Appointment iriho<select required value={oldAppointmentId} onChange={e=>setOldAppointmentId(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"><option value="">-- Hitamo --</option>{activeAppointments.map(x=><option key={x.id} value={x.id}>{x.person?.first_name} {x.person?.last_name} · {x.position?.title_kiny} · {x.boundary?.name_kiny}</option>)}</select></label>
          <label className="text-xs font-semibold">Umwanya mushya<select required value={newPositionId} onChange={e=>{setNewPositionId(e.target.value);setNewUnitId("");}} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"><option value="">-- Hitamo --</option>{positions.filter(x=>x.position_status==="approved"&&(unitDepth[x.required_boundary_level]??99)>=transferMinDepth).map(x=><option key={x.id} value={x.id}>{x.title_kiny} · {x.required_boundary_level}</option>)}</select></label>
          <label className="text-xs font-semibold">Ahantu hashya<select required value={newUnitId} onChange={e=>setNewUnitId(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"><option value="">-- Hitamo --</option>{transferUnits.map(x=><option key={x.id} value={x.id}>{x.name_kiny}</option>)}</select></label>
          <label className="text-xs font-semibold">Itariki transfer itangirira<input type="date" required value={effectiveOn} onChange={e=>setEffectiveOn(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
          <label className="text-xs font-semibold">Evidence type<input required value={evidenceType} onChange={e=>setEvidenceType(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
          <label className="text-xs font-semibold">Evidence reference<input required value={referenceNumber} onChange={e=>setReferenceNumber(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
          <label className="text-xs font-semibold">Issuer<input required value={issuer} onChange={e=>setIssuer(e.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-input bg-background px-2 text-xs"/></label>
          <label className="text-xs font-semibold sm:col-span-2">Impamvu ya transfer<textarea required minLength={4} value={transferReason} onChange={e=>setTransferReason(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-xs"/></label>
          <button type="submit" disabled={transferBusy||!oldAppointmentId||!newPositionId||!newUnitId} className="min-h-[42px] rounded-lg bg-[#00A3E0] px-3 text-xs font-bold text-white disabled:opacity-50">{transferBusy?"Turabika...":"Kora transfer"}</button>
        </form>
        {selectedOld&&<p className="text-[11px] text-muted-foreground">Uwo kwimura: {selectedOld.person?.first_name} {selectedOld.person?.last_name} · {selectedOld.appointment_status}</p>}
      </div>
    </section>
  );
}
