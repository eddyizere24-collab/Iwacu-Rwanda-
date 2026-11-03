import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson, registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const Schema=z.object({
  old_appointment_id:z.string().uuid(),
  new_position_id:z.string().uuid(),
  new_administrative_unit_id:z.string().uuid(),
  effective_on:z.string().date(),
  transfer_reason:z.string().trim().min(4).max(2000),
  evidence_type:z.string().trim().min(2).max(80),
  reference_number:z.string().trim().min(1).max(160),
  issuer:z.string().trim().min(2).max(200),
  issued_on:z.string().date().nullable().optional(),
  valid_until:z.string().date().nullable().optional(),
});

export async function POST(request:NextRequest){
  const auth=await requireLeaderAdmin();if(!auth.ok)return auth.response;
  const body=await readJson(request);if(!body.ok)return body.response;
  const parsed=Schema.safeParse(body.value);
  if(!parsed.success)return registryJson({status:"error",message_kiny:"Amakuru yo kwimura appointment ntiyuzuye neza."},422);
  const {data,error}=await auth.context.supabase.rpc("transfer_leader_appointment_v2",{
    p_old_appointment_id:parsed.data.old_appointment_id,
    p_new_position_id:parsed.data.new_position_id,
    p_new_administrative_unit_id:parsed.data.new_administrative_unit_id,
    p_effective_on:parsed.data.effective_on,
    p_transfer_reason:parsed.data.transfer_reason,
    p_evidence_type:parsed.data.evidence_type,
    p_reference_number:parsed.data.reference_number,
    p_issuer:parsed.data.issuer,
    p_issued_on:parsed.data.issued_on??null,
    p_valid_until:parsed.data.valid_until??null,
  });
  if(error)return registryDbError(error,"Kwimura appointment byanze. Reba uburenganzira, umwanya n'ibimenyetso.");
  return registryJson({status:"success",transfer:data,message_kiny:"Transfer yabitswe. Appointment nshya yoherejwe ngo isuzumwe."},201);
}
