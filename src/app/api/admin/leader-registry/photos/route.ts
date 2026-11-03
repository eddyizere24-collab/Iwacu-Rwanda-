import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWebp(file: File | null): file is File {
  return Boolean(file && file.type === "image/webp" && file.size > 0);
}

function dimensions(bytes: Uint8Array): {width:number;height:number}|null {
  if(bytes.length<25||String.fromCharCode(...bytes.slice(0,4))!=="RIFF"||String.fromCharCode(...bytes.slice(8,12))!=="WEBP")return null;
  const kind=String.fromCharCode(...bytes.slice(12,16));
  if(kind==="VP8X"&&bytes.length>=30){
    return {width:1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),height:1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)};
  }
  if(kind==="VP8 "&&bytes.length>=30&&bytes[23]===0x9d&&bytes[24]===0x01&&bytes[25]===0x2a){
    return {width:(bytes[26]|(bytes[27]<<8))&0x3fff,height:(bytes[28]|(bytes[29]<<8))&0x3fff};
  }
  if(kind==="VP8L"&&bytes.length>=25&&bytes[20]===0x2f){
    const b1=bytes[21],b2=bytes[22],b3=bytes[23],b4=bytes[24];
    return {width:1+b1+((b2&0x3f)<<8),height:1+((b2>>6)|(b3<<2)|((b4&0x0f)<<10))};
  }
  return null;
}

export async function POST(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  let form:FormData;
  try{form=await request.formData();}catch{return registryJson({status:"error",message_kiny:"Amafoto ntiyoherejwe neza."},400);}
  const appointmentId=String(form.get("appointment_id")??"");
  const thumbnail=form.get("thumbnail");
  const modal=form.get("modal");
  if(!/^[0-9a-f-]{36}$/i.test(appointmentId)||!(thumbnail instanceof File)||!(modal instanceof File)){
    return registryJson({status:"error",message_kiny:"Hitamo appointment n'amafoto abiri."},422);
  }
  if(!isWebp(thumbnail)||thumbnail.size>40*1024)return registryJson({status:"error",message_kiny:"Thumbnail igomba kuba WebP kandi itarengeje 40 KB."},422);
  if(!isWebp(modal)||modal.size>150*1024)return registryJson({status:"error",message_kiny:"Ifoto nini igomba kuba WebP kandi itarengeje 150 KB."},422);

  const thumbBytes=new Uint8Array(await thumbnail.arrayBuffer());
  const modalBytes=new Uint8Array(await modal.arrayBuffer());
  const thumbSize=dimensions(thumbBytes),modalSize=dimensions(modalBytes);
  if(!thumbSize||thumbSize.width>256||thumbSize.height>256)return registryJson({status:"error",message_kiny:"Thumbnail igomba kuba ifite impande zitarenze 256 px."},422);
  if(!modalSize||modalSize.width>800||modalSize.height>800)return registryJson({status:"error",message_kiny:"Ifoto nini igomba kuba ifite impande zitarenze 800 px."},422);

  const {data:appointment,error:appointmentError}=await auth.context.supabase.from("leader_appointments")
    .select("id,administrative_unit_id")
    .eq("id",appointmentId).maybeSingle();
  if(appointmentError)return registryDbError(appointmentError,"Appointment ntiyabonetse.");
  if(!appointment)return registryJson({status:"error",message_kiny:"Appointment ntiyabonetse."},404);

  const {data:profile,error:profileError}=await auth.context.supabase.from("leader_public_profiles")
    .select("appointment_id,publication_status")
    .eq("appointment_id",appointmentId).maybeSingle();
  if(profileError)return registryDbError(profileError,"Public profile ntiyabonetse.");
  if(!profile)return registryJson({status:"error",code:"PROFILE_REQUIRED",message_kiny:"Banza ubike public profile."},409);
  if(profile.publication_status!=="published"){
    return registryJson({status:"error",code:"PUBLISH_BEFORE_PHOTO",message_kiny:"Ifoto ishobora koherezwa gusa kuri appointment yemejwe na public profile yasohowe."},409);
  }

  const bucket=auth.context.supabase.storage.from("leader-photos");
  const thumbKey=appointmentId+"/"+randomUUID()+"-thumb.webp";
  const modalKey=appointmentId+"/"+randomUUID()+"-profile.webp";
  const thumbUpload=await bucket.upload(thumbKey,thumbBytes,{contentType:"image/webp",cacheControl:"3600",upsert:false});
  if(thumbUpload.error)return registryDbError(thumbUpload.error,"Thumbnail ntiyoherejwe.");
  const modalUpload=await bucket.upload(modalKey,modalBytes,{contentType:"image/webp",cacheControl:"3600",upsert:false});
  if(modalUpload.error){await bucket.remove([thumbKey]);return registryDbError(modalUpload.error,"Ifoto nini ntiyoherejwe.");}

  const {data,error}=await auth.context.supabase.from("leader_public_profiles")
    .update({public_photo_object_key:modalKey,public_photo_thumbnail_key:thumbKey,updated_by:auth.context.user.id})
    .eq("appointment_id",appointmentId)
    .select("appointment_id,public_photo_object_key,public_photo_thumbnail_key,publication_status")
    .single();
  if(error){await bucket.remove([thumbKey,modalKey]);return registryDbError(error,"Amafoto ntiyabitswe ku public profile.");}
  return registryJson({
    status:"success",
    profile:data,
    message_kiny:"Amafoto yabitswe. Kubera ko ifoto ari amakuru agomba kongera kwemezwa, profile yahindutse Draft; saba reviewer kongera kuyisuzuma no kuyisohora.",
  },201);
}
