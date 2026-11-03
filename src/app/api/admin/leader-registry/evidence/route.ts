import { NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const maxBytes=5*1024*1024;
const allowed=new Set(["application/pdf","image/jpeg","image/png"]);
function matches(bytes:Uint8Array,mime:string){
  if(mime==="application/pdf")return bytes.length>=5&&String.fromCharCode(...bytes.slice(0,5))==="%PDF-";
  if(mime==="image/jpeg")return bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(mime==="image/png")return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  return false;
}
const uuid=(v:string)=>/^[0-9a-f-]{36}$/i.test(v);

export async function GET(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const evidenceId=request.nextUrl.searchParams.get("evidence_id");
  if(evidenceId){
    const {data,error}=await auth.context.supabase.from("leader_appointment_evidence").select("id,private_storage_key,mime_type").eq("id",evidenceId).maybeSingle();
    if(error)return registryDbError(error,"Evidence ntiyabonetse cyangwa nta burenganzira ufite.");
    if(!data?.private_storage_key)return registryJson({status:"error",message_kiny:"Nta file iri kuri iyi evidence."},404);
    const {data:signed,error:signedError}=await auth.context.supabase.storage.from("leader-dossier").createSignedUrl(data.private_storage_key,60);
    if(signedError)return registryDbError(signedError,"Signed URL ntiyabonetse.");
    return registryJson({status:"success",signed_url:signed.signedUrl,expires_in_seconds:60,mime_type:data.mime_type});
  }
  const caseId=request.nextUrl.searchParams.get("verification_case_id");
  if(!caseId||!uuid(caseId))return registryJson({status:"error",message_kiny:"Verification case ID irakenewe."},400);
  const {data,error}=await auth.context.supabase.from("leader_appointment_evidence")
    .select("id,appointment_id,verification_case_id,evidence_type,reference_number,issuer,issued_on,valid_until,mime_type,byte_size,sha256,uploaded_by,created_at")
    .eq("verification_case_id",caseId).order("created_at",{ascending:false});
  if(error)return registryDbError(error,"Evidence z'iyi dosiye ntizabonetse.");
  return registryJson({status:"success",evidence:data??[]});
}
export async function POST(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  let form:FormData;try{form=await request.formData();}catch{return registryJson({status:"error",message_kiny:"Evidence ntiyoherejwe neza."},400);}
  const appointmentId=String(form.get("appointment_id")??"");
  const caseId=String(form.get("verification_case_id")??"");
  const evidenceType=String(form.get("evidence_type")??"").trim();
  const referenceNumber=String(form.get("reference_number")??"").trim();
  const issuer=String(form.get("issuer")??"").trim();
  const issuedOn=String(form.get("issued_on")??"").trim();
  const validUntil=String(form.get("valid_until")??"").trim();
  const file=form.get("file");
  if(!uuid(appointmentId)||!uuid(caseId)||evidenceType.length<2||!referenceNumber||issuer.length<2||!(file instanceof File)){
    return registryJson({status:"error",message_kiny:"Appointment, case, evidence type, reference, issuer na file birakenewe."},422);
  }
  if(file.size<=0||file.size>maxBytes||!allowed.has(file.type))return registryJson({status:"error",message_kiny:"Evidence igomba kuba PDF, JPG cyangwa PNG kandi itarengeje 5 MB."},422);
  const {data:appointment,error:appointmentError}=await auth.context.supabase.from("leader_appointments")
    .select("id,person_id,administrative_unit_id").eq("id",appointmentId).maybeSingle();
  if(appointmentError)return registryDbError(appointmentError,"Appointment ntiyabonetse.");
  if(!appointment)return registryJson({status:"error",message_kiny:"Appointment ntiyabonetse."},404);
  const {data:caseRow,error:caseError}=await auth.context.supabase.from("leader_verification_cases")
    .select("id,appointment_id").eq("id",caseId).eq("appointment_id",appointmentId).maybeSingle();
  if(caseError)return registryDbError(caseError,"Verification case ntiyabonetse.");
  if(!caseRow)return registryJson({status:"error",message_kiny:"Verification case ntihuye na appointment."},422);
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!matches(bytes,file.type))return registryJson({status:"error",message_kiny:"File ntiyahuye na format yemewe."},422);
  const sha256=createHash("sha256").update(bytes).digest("hex");
  const ext=file.type==="application/pdf"?"pdf":file.type==="image/jpeg"?"jpg":"png";
  const key=appointment.person_id+"/evidence/"+randomUUID()+"."+ext;
  const storage=auth.context.supabase.storage.from("leader-dossier");
  const {error:uploadError}=await storage.upload(key,bytes,{contentType:file.type,cacheControl:"3600",upsert:false});
  if(uploadError)return registryDbError(uploadError,"Evidence ntiyoherejwe muri private Storage.");
  const {data,error}=await auth.context.supabase.from("leader_appointment_evidence").insert({
    appointment_id:appointmentId,verification_case_id:caseId,evidence_type:evidenceType,
    reference_number:referenceNumber,issuer,issued_on:issuedOn||null,valid_until:validUntil||null,
    private_storage_key:key,mime_type:file.type,byte_size:file.size,sha256,uploaded_by:auth.context.user.id,
  }).select("id,appointment_id,verification_case_id,evidence_type,reference_number,issuer,issued_on,valid_until,mime_type,byte_size,sha256,uploaded_by,created_at").single();
  if(error){await storage.remove([key]);return registryDbError(error,"Evidence file yabitswe ariko metadata ntiyabitswe.");}
  return registryJson({status:"success",evidence:data,file_uploaded:true,message_kiny:"Evidence yabitswe muri private Storage; signed URL imara amasegonda 60."},201);
}
