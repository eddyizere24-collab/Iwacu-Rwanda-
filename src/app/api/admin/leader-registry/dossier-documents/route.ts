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

export async function GET(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const documentId=request.nextUrl.searchParams.get("document_id");
  if(documentId){
    const {data,error}=await auth.context.supabase.from("leader_dossier_documents")
      .select("id,private_storage_key,mime_type").eq("id",documentId).maybeSingle();
    if(error)return registryDbError(error,"Inyandiko ntiyabonetse cyangwa nta burenganzira ufite.");
    if(!data)return registryJson({status:"error",message_kiny:"Inyandiko ntibonetse."},404);
    const {data:signed,error:signedError}=await auth.context.supabase.storage.from("leader-dossier").createSignedUrl(data.private_storage_key,60);
    if(signedError)return registryDbError(signedError,"Signed URL ntiyabonetse.");
    return registryJson({status:"success",signed_url:signed.signedUrl,expires_in_seconds:60,mime_type:data.mime_type});
  }
  const personId=request.nextUrl.searchParams.get("person_id");
  if(!personId||!zUuid(personId))return registryJson({status:"error",message_kiny:"Person ID irakenewe."},400);
  const {data,error}=await auth.context.supabase.from("leader_dossier_documents")
    .select("id,person_id,document_type,reference_number,mime_type,byte_size,sha256,uploaded_by,uploaded_at,archived_at")
    .eq("person_id",personId).is("archived_at",null).order("uploaded_at",{ascending:false});
  if(error)return registryDbError(error,"Inyandiko z'ibanga ntizabonetse.");
  return registryJson({status:"success",documents:data??[]});
}
function zUuid(value:string){return /^[0-9a-f-]{36}$/i.test(value);}

export async function POST(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  let form:FormData;try{form=await request.formData();}catch{return registryJson({status:"error",message_kiny:"File ntiyoherejwe neza."},400);}
  const personId=String(form.get("person_id")??"");
  const documentType=String(form.get("document_type")??"").trim();
  const referenceNumber=String(form.get("reference_number")??"").trim();
  const file=form.get("file");
  if(!zUuid(personId)||!documentType||!referenceNumber||!(file instanceof File))return registryJson({status:"error",message_kiny:"Person, ubwoko bw'inyandiko, reference na file birakenewe."},422);
  if(file.size<=0||file.size>maxBytes||!allowed.has(file.type))return registryJson({status:"error",message_kiny:"Inyandiko igomba kuba PDF, JPG cyangwa PNG kandi itarengeje 5 MB."},422);
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!matches(bytes,file.type))return registryJson({status:"error",message_kiny:"File ntiyahuye na format yemewe."},422);
  const sha256=createHash("sha256").update(bytes).digest("hex");
  const ext=file.type==="application/pdf"?"pdf":file.type==="image/jpeg"?"jpg":"png";
  const key=personId+"/"+randomUUID()+"."+ext;
  const storage=auth.context.supabase.storage.from("leader-dossier");
  const {error:uploadError}=await storage.upload(key,bytes,{contentType:file.type,cacheControl:"3600",upsert:false});
  if(uploadError)return registryDbError(uploadError,"Inyandiko ntiyoherejwe mu private Storage.");
  const {data,error}=await auth.context.supabase.from("leader_dossier_documents").insert({
    person_id:personId,document_type:documentType,reference_number:referenceNumber,
    private_storage_key:key,mime_type:file.type,byte_size:file.size,sha256,uploaded_by:auth.context.user.id,
  }).select("id,person_id,document_type,reference_number,mime_type,byte_size,sha256,uploaded_at").single();
  if(error){await storage.remove([key]);return registryDbError(error,"File yabitswe ariko metadata ntiyabitswe.");}
  return registryJson({status:"success",document:data,message_kiny:"Inyandiko yabitswe muri private Storage."},201);
}

export async function PATCH(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  let body:unknown;try{body=await request.json();}catch{return registryJson({status:"error",message_kiny:"Amakuru yoherejwe ntabwo ari JSON yemewe."},400);}
  if(!body||typeof body!=="object"||!("id" in body)||!("action" in body)||(body as {action?:unknown}).action!=="archive"||!zUuid(String((body as {id:unknown}).id))){
    return registryJson({status:"error",message_kiny:"Document ID ntiyemewe."},422);
  }
  const id=String((body as {id:unknown}).id);
  const {data,error}=await auth.context.supabase.from("leader_dossier_documents")
    .update({archived_at:new Date().toISOString()}).eq("id",id).is("archived_at",null)
    .select("id,person_id,archived_at").maybeSingle();
  if(error)return registryDbError(error,"Kubika inyandiko mu mateka byanze.");
  if(!data)return registryJson({status:"error",code:"NOT_FOUND",message_kiny:"Document ntibonetse."},404);
  return registryJson({status:"success",document:data,message_kiny:"Inyandiko yabitswe mu mateka; file ntiyasibwe."});
}
