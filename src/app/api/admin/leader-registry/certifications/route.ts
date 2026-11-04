import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const Entry=z.object({
  person_id:z.string().uuid(),
  certification_name:z.string().trim().min(2).max(240),
  issuer:z.string().trim().max(240).nullable().optional(),
  issued_on:z.string().date().nullable().optional(),
  valid_until:z.string().date().nullable().optional(),
  evidence_reference:z.string().trim().max(500).nullable().optional(),
});
const Archive=z.object({id:z.string().uuid(),action:z.literal("archive")});

export async function GET(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const id=request.nextUrl.searchParams.get("person_id");
  if(!id||!z.string().uuid().safeParse(id).success)return registryJson({status:"error",message_kiny:"Person ID irakenewe."},400);
  const {data,error}=await auth.context.supabase.from("leader_certifications")
    .select("id,person_id,certification_name,issuer,issued_on,valid_until,evidence_reference,created_at,archived_at")
    .eq("person_id",id).is("archived_at",null).order("issued_on",{ascending:false});
  if(error)return registryDbError(error,"Impamyabumenyi ntizabonetse.");
  return registryJson({status:"success",certifications:data??[]});
}
export async function POST(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const body=await readJson(request);if(!body.ok)return body.response;
  const parsed=Entry.safeParse(body.value);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"Amakuru y'impamyabumenyi ntiyuzuye."},422);
  const {data,error}=await auth.context.supabase.from("leader_certifications")
    .insert({...parsed.data,recorded_by:auth.context.user.id})
    .select("id,person_id,certification_name,issuer,issued_on,valid_until,evidence_reference,created_at").single();
  if(error)return registryDbError(error,"Impamyabumenyi ntiyabitswe.");
  return registryJson({status:"success",certification:data,message_kiny:"Impamyabumenyi yabitswe."},201);
}
export async function PATCH(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const body=await readJson(request);if(!body.ok)return body.response;
  const parsed=Archive.safeParse(body.value);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"ID y'impamyabumenyi ntiyemewe."},422);
  const {data,error}=await auth.context.supabase.from("leader_certifications")
    .update({archived_at:new Date().toISOString()}).eq("id",parsed.data.id).is("archived_at",null)
    .select("id,archived_at").maybeSingle();
  if(error)return registryDbError(error,"Kubika impamyabumenyi mu archive byanze.");
  if(!data)return registryJson({status:"error",message_kiny:"Impamyabumenyi ntibonetse."},404);
  return registryJson({status:"success",certification:data,message_kiny:"Impamyabumenyi yabitswe; ntiyasibwe."});
}
