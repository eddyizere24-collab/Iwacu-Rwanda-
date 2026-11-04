import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ProfileSchema=z.object({
  appointment_id:z.string().uuid(),
  display_name:z.string().trim().max(180).nullable().optional(),
  biography:z.string().trim().max(4000).nullable().optional(),
  office_hours:z.string().trim().max(1000).nullable().optional(),
  service_priorities:z.string().trim().max(2000).nullable().optional(),
});
const PatchSchema=ProfileSchema.omit({appointment_id:true}).extend({
  appointment_id:z.string().uuid(),
  publication_status:z.enum(["draft","published","unpublished"]).optional(),
});
const selection="appointment_id,display_name,biography,office_hours,service_priorities,public_photo_object_key,public_photo_thumbnail_key,publication_status,published_by,published_at,updated_by,updated_at";

export async function GET(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const id=request.nextUrl.searchParams.get("appointment_id");
  if(!id||!z.string().uuid().safeParse(id).success)return registryJson({status:"error",message_kiny:"Appointment ID irakenewe."},400);
  const {data,error}=await auth.context.supabase.from("leader_public_profiles").select(selection).eq("appointment_id",id).maybeSingle();
  if(error)return registryDbError(error,"Public profile ntiyabonetse.");
  return registryJson({status:"success",profile:data});
}

export async function POST(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const body=await readJson(request);if(!body.ok)return body.response;
  const parsed=ProfileSchema.safeParse(body.value);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"Umwirondoro rusange ntiwujuje ibisabwa."},422);
  const {data,error}=await auth.context.supabase.from("leader_public_profiles")
    .insert({...parsed.data,publication_status:"draft"}).select(selection).single();
  if(error)return registryDbError(error,"Public profile ntiyabitswe.");
  return registryJson({status:"success",profile:data},201);
}

export async function PATCH(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const body=await readJson(request);if(!body.ok)return body.response;
  const parsed=PatchSchema.safeParse(body.value);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"Amakuru yo guhindura public profile ntiyemewe."},422);
  const {appointment_id,...changes}=parsed.data;

  if(changes.publication_status==="unpublished"){
    const {data:before,error:readError}=await auth.context.supabase.from("leader_public_profiles")
      .select("public_photo_object_key,public_photo_thumbnail_key")
      .eq("appointment_id",appointment_id).maybeSingle();
    if(readError)return registryDbError(readError,"Public profile ntiyabonetse.");
    const {data:unpublished,error:unpublishError}=await auth.context.supabase.from("leader_public_profiles")
      .update({publication_status:"unpublished",updated_by:auth.context.user.id})
      .eq("appointment_id",appointment_id).select(selection).maybeSingle();
    if(unpublishError)return registryDbError(unpublishError,"Gukuraho public profile ku rubuga byanze.");
    if(!unpublished)return registryJson({status:"error",code:"NOT_FOUND",message_kiny:"Public profile ntiyabonetse."},404);
    const keys=[before?.public_photo_thumbnail_key,before?.public_photo_object_key].filter((v):v is string=>Boolean(v));
    if(keys.length){
      const {error:storageError}=await auth.context.supabase.storage.from("leader-photos").remove(keys);
      if(storageError)return registryJson({status:"error",code:"PHOTO_CLEANUP_PENDING",profile:unpublished,message_kiny:"Profile ntikigaragara ku baturage, ariko gusiba amafoto muri Storage byanze. Saba admin kongera kugenzura."},503);
      const {data:cleaned,error:cleanError}=await auth.context.supabase.from("leader_public_profiles")
        .update({public_photo_object_key:null,public_photo_thumbnail_key:null,updated_by:auth.context.user.id})
        .eq("appointment_id",appointment_id).select(selection).single();
      if(cleanError)return registryDbError(cleanError,"Profile ntiyakuweho amafoto yose.");
      return registryJson({status:"success",profile:cleaned,message_kiny:"Public profile yahagaritswe, amafoto yakuwe muri Storage."});
    }
    return registryJson({status:"success",profile:unpublished,message_kiny:"Public profile yahagaritswe."});
  }

  const {data,error}=await auth.context.supabase.from("leader_public_profiles")
    .update({...changes,updated_by:auth.context.user.id})
    .eq("appointment_id",appointment_id).select(selection).maybeSingle();
  if(error)return registryDbError(error,"Guhindura cyangwa gusohora public profile byanze.");
  if(!data)return registryJson({status:"error",code:"NOT_FOUND",message_kiny:"Public profile ntiwabonetse."},404);
  return registryJson({status:"success",profile:data,message_kiny:data.publication_status==="draft"?"Umwirondoro wabitswe nka Draft. Ongera ugenzure mbere yo kuwusohora.":"Public profile yabitswe."});
}
