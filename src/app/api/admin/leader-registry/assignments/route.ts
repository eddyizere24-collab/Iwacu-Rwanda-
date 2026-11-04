import { NextRequest } from "next/server";
import { z } from "zod";
import { registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema=z.object({
  assignment_id:z.string().uuid(),
  user_id:z.string().uuid(),
  role_code:z.enum(["district_admin","sector_admin","cell_admin"]),
  administrative_unit_id:z.string().uuid(),
  grant_reason:z.string().trim().min(4).max(1000),
  valid_until:z.string().datetime().nullable().optional(),
});
const RevokeSchema=z.object({id:z.string().uuid(),action:z.literal("revoke")});
const nextRole:Record<string,{role:string;level:string}>={
  national_super_admin:{role:"district_admin",level:"district"},
  district_admin:{role:"sector_admin",level:"sector"},
  sector_admin:{role:"cell_admin",level:"cell"},
};

export async function GET(){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const {data,error}=await auth.context.supabase.from("admin_role_assignments")
    .select("id,user_id,role_code,administrative_unit_id,assignment_status,valid_from,valid_until,grant_reason,granted_by,revoked_at")
    .order("created_at",{ascending:false}).limit(200);
  if(error)return registryDbError(error,"Urutonde rw'abandi admin ntirubonetse.");
  return registryJson({status:"success",assignments:data??[]});
}

export async function POST(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  let body:unknown;
  try{body=await request.json();}catch{return registryJson({status:"error",message_kiny:"Amakuru yoherejwe ntabwo ari JSON yemewe."},400);}
  const parsed=CreateSchema.safeParse(body);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"User UUID, inshingano, ahantu n'impamvu birakenewe."},422);

  const parentAssignment=auth.context.assignments.find(item=>item.id===parsed.data.assignment_id);
  const allowed=parentAssignment?nextRole[parentAssignment.role_code]:undefined;
  if(!parentAssignment||!allowed||parsed.data.role_code!==allowed.role){
    return registryJson({status:"error",code:"ROLE_HIERARCHY",message_kiny:"Ushobora gutanga gusa konti y'urwego rukurikira urwo ucunga."},403);
  }
  const {data:parent,error:parentError}=await auth.context.supabase.from("boundaries")
    .select("id,scope_code,level").eq("id",parentAssignment.administrative_unit_id).is("valid_to",null).maybeSingle();
  if(parentError||!parent)return registryJson({status:"error",message_kiny:"Agace ucunga ntikabonetse."},403);
  const {data:target,error:targetError}=await auth.context.supabase.from("boundaries")
    .select("id,scope_code,level,parent_id").eq("id",parsed.data.administrative_unit_id).is("valid_to",null).maybeSingle();
  if(targetError||!target||target.level!==allowed.level||
     !(target.scope_code===parent.scope_code||target.scope_code.startsWith(parent.scope_code+"-"))){
    return registryJson({status:"error",code:"TARGET_SCOPE_INVALID",message_kiny:"Ahantu wahisemo ntikari mu gace ucunga."},403);
  }
  if(parentAssignment.role_code!=="national_super_admin"&&target.parent_id!==parent.id){
    return registryJson({status:"error",code:"NOT_DIRECT_CHILD",message_kiny:"Ushobora gutanga konti ku mwana w'ahantu ucunga gusa."},403);
  }

  const {data,error}=await auth.context.supabase.from("admin_role_assignments").insert({
    user_id:parsed.data.user_id,
    role_code:parsed.data.role_code,
    administrative_unit_id:target.id,
    assignment_status:"active",
    grant_reason:parsed.data.grant_reason,
    valid_until:parsed.data.valid_until??null,
  }).select("id,user_id,role_code,administrative_unit_id,assignment_status,valid_from,valid_until,grant_reason").single();
  if(error)return registryDbError(error,"Kugenera uyu muntu inshingano byanze. User agomba kuba asanzwe afite konti muri Supabase Auth.");
  return registryJson({status:"success",assignment:data,message_kiny:"Admin assignment yabitswe."},201);
}

export async function PATCH(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  let body:unknown;
  try{body=await request.json();}catch{return registryJson({status:"error",message_kiny:"Amakuru yoherejwe ntabwo ari JSON yemewe."},400);}
  const parsed=RevokeSchema.safeParse(body);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"Assignment ID ntiyemewe."},422);
  const {data,error}=await auth.context.supabase.from("admin_role_assignments")
    .update({assignment_status:"revoked"}).eq("id",parsed.data.id).eq("assignment_status","active")
    .select("id,user_id,role_code,administrative_unit_id,assignment_status,revoked_at").maybeSingle();
  if(error)return registryDbError(error,"Guhagarika Admin assignment byanze.");
  if(!data)return registryJson({status:"error",code:"NOT_FOUND",message_kiny:"Assignment ntibonetse cyangwa yamaze guhagarikwa."},404);
  return registryJson({status:"success",assignment:data,message_kiny:"Uburenganzira bwahagaritswe; amateka yabwo aragumaho."});
}
