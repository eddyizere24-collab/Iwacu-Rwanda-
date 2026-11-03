import { NextRequest } from "next/server";
import { z } from "zod";
import { registryDbError, registryJson, requireLeaderAdmin } from "@/lib/leaders/registry-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Level = z.enum(["district","sector","cell","village"]);
const depth: Record<string,number> = { country:0, province:1, district:2, sector:3, cell:4, village:5 };

export async function GET(request: NextRequest) {
  const auth=await requireLeaderAdmin();
  if(!auth.ok)return auth.response;

  const assignmentId=request.nextUrl.searchParams.get("assignment_id");
  const level=Level.safeParse(request.nextUrl.searchParams.get("level"));
  const purpose=request.nextUrl.searchParams.get("purpose")??"hierarchy";
  const parentId=request.nextUrl.searchParams.get("parent_id");
  if(!assignmentId||!z.string().uuid().safeParse(assignmentId).success||!level.success){
    return registryJson({status:"error",message_kiny:"Hitamo assignment n'urwego rw'ahantu."},400);
  }
  const assignment=auth.context.assignments.find(item=>item.id===assignmentId);
  if(!assignment)return registryJson({status:"error",message_kiny:"Nta burenganzira ufite kuri aka gace."},403);

  const {data:root,error:rootError}=await auth.context.supabase
    .from("boundaries").select("id,scope_code,level,parent_id")
    .eq("id",assignment.administrative_unit_id).is("valid_to",null).maybeSingle();
  if(rootError||!root)return registryJson({status:"error",message_kiny:"Agace ucunga ntikabonetse."},403);

  let query=auth.context.supabase.from("boundaries")
    .select("id,scope_code,name_kiny,name_eng,level,parent_id")
    .eq("level",level.data).is("valid_to",null).order("scope_code").limit(1200);

  if(purpose==="assignment"){
    const childRole:Record<string,string>={
      national_super_admin:"district",
      district_admin:"sector",
      sector_admin:"cell",
    };
    if(childRole[assignment.role_code]!==level.data){
      return registryJson({status:"error",message_kiny:"Uru rwego ntirwemerewe kuri iyi konti."},403);
    }
    if(assignment.role_code==="national_super_admin"){
      query=query.like("scope_code",root.scope_code+"-%");
    }else{
      query=query.eq("parent_id",root.id);
    }
  }else if(purpose==="transfer"){
    if(depth[level.data] < depth[root.level]){
      return registryJson({status:"error",message_kiny:"Transfer igomba kuguma mu rwego ucunga cyangwa munsi yarwo."},403);
    }
    query=query.like("scope_code",root.scope_code+"%");
  }else{
    const selectedParentId=parentId&&z.string().uuid().safeParse(parentId).success?parentId:root.id;
    const {data:parent,error:parentError}=await auth.context.supabase.from("boundaries")
      .select("id,scope_code,level,parent_id").eq("id",selectedParentId).is("valid_to",null).maybeSingle();
    if(parentError||!parent||!(parent.scope_code===root.scope_code||parent.scope_code.startsWith(root.scope_code+"-"))){
      return registryJson({status:"error",message_kiny:"Agace watoranyije ntikari mu bubasha bwa konti yawe."},403);
    }
    const childLevel=Object.entries(depth).find(([,rank])=>rank===depth[parent.level]+1)?.[0];
    if(level.data!==childLevel)return registryJson({status:"error",message_kiny:"Hitamo urwego rukurikira urwo wahisemo."},422);
    query=query.eq("parent_id",parent.id);
  }

  const {data,error}=await query;
  if(error)return registryDbError(error,"Urutonde rw'ahantu ntirubonetse.");
  const scoped=(data??[]).filter(unit=>unit.scope_code===root.scope_code||unit.scope_code.startsWith(root.scope_code+"-"));
  return registryJson({status:"success",units:scoped});
}
