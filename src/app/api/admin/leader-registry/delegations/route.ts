import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const Capability=z.enum(["leader_read","leader_edit","leader_review","leader_dossier_read","leader_dossier_write","leader_audit_read"]);
const CreateSchema=z.object({
  grantee_user_id:z.string().uuid(),
  administrative_unit_id:z.string().uuid(),
  capability:Capability,
  valid_until:z.string().datetime(),
  reason:z.string().trim().min(4).max(2000),
});
const RevokeSchema=z.object({id:z.string().uuid(),action:z.literal("revoke")});

export async function GET(){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const {data,error}=await auth.context.supabase.from("admin_delegations")
    .select("id,grantor_user_id,grantee_user_id,administrative_unit_id,capability,valid_from,valid_until,reason,delegation_status,revoked_by,revoked_at,created_at")
    .order("created_at",{ascending:false}).limit(200);
  if(error)return registryDbError(error,"Delegations ntizabonetse.");
  return registryJson({status:"success",delegations:data??[]});
}

export async function POST(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const body=await readJson(request);if(!body.ok)return body.response;
  const parsed=CreateSchema.safeParse(body.value);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"User UUID, capability, scope, igihe n'impamvu birakenewe."},422);
  if(new Date(parsed.data.valid_until).getTime()<=Date.now())return registryJson({status:"error",message_kiny:"Igihe delegation irangiriraho kigomba kuba kiri imbere."},422);
  const {data:unit,error:unitError}=await auth.context.supabase.from("boundaries")
    .select("id,scope_code,level").eq("id",parsed.data.administrative_unit_id).is("valid_to",null).maybeSingle();
  if(unitError||!unit)return registryJson({status:"error",message_kiny:"Agace ka delegation ntikabonetse."},403);

  const {data,error}=await auth.context.supabase.from("admin_delegations").insert({
    grantor_user_id:auth.context.user.id,
    grantee_user_id:parsed.data.grantee_user_id,
    administrative_unit_id:unit.id,
    capability:parsed.data.capability,
    valid_from:new Date().toISOString(),
    valid_until:parsed.data.valid_until,
    reason:parsed.data.reason,
    delegation_status:"active",
  }).select("id,grantor_user_id,grantee_user_id,administrative_unit_id,capability,valid_from,valid_until,reason,delegation_status").single();
  if(error)return registryDbError(error,"Delegation ntiyabitswe. Database igenzura scope n'ububasha bw'uyitanga.");
  return registryJson({status:"success",delegation:data,message_kiny:"Delegation yabitswe kandi ifite igihe izarangiriraho."},201);
}

export async function PATCH(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const body=await readJson(request);if(!body.ok)return body.response;
  const parsed=RevokeSchema.safeParse(body.value);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"Delegation ID ntiyemewe."},422);
  const {data,error}=await auth.context.supabase.from("admin_delegations")
    .update({delegation_status:"revoked"}).eq("id",parsed.data.id).eq("delegation_status","active")
    .select("id,grantee_user_id,capability,delegation_status,revoked_by,revoked_at").maybeSingle();
  if(error)return registryDbError(error,"Gukuraho delegation byanze.");
  if(!data)return registryJson({status:"error",code:"NOT_FOUND",message_kiny:"Delegation ntibonetse cyangwa yamaze guhagarikwa."},404);
  return registryJson({status:"success",delegation:data,message_kiny:"Delegation yahagaritswe; amateka yayo aragumaho."});
}
