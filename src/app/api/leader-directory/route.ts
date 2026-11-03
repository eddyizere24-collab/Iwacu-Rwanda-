import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";
import { sanitizePublicDirectory } from "@/lib/leaders/public-directory";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const ScopeCode=z.string().regex(/^RW(?:-[A-Z0-9]{1,12}){0,5}$/).max(80);
const CandidateInput=z.object({
  scope_code:ScopeCode,
  supported_probability:z.number().min(0).max(1).optional(),
});
const RequestSchema=z.object({candidates:z.array(CandidateInput).min(1).max(3)});

function unavailable(message="Urutonde rw'abayobozi ntiruboneka ubu. Ongera ugerageze."){
  return NextResponse.json({
    status:"success",unavailable:true,candidates:[],shared_leaders:[],message_kiny:message,
  },{status:200,headers:{"Cache-Control":"no-store","Pragma":"no-cache"}});
}

async function queryDirectory(candidates:Array<z.infer<typeof CandidateInput>>){
  if(!isSupabasePublicConfigured())return unavailable();
  const supabase=createSupabasePublicClient();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),2000);
  try{
    const {data,error}=await supabase.rpc("get_leader_candidates_v2",{
      p_scope_codes:candidates.map(item=>item.scope_code),
    }).abortSignal(controller.signal);

    if(controller.signal.aborted||error?.name==="AbortError"||/abort|timeout/i.test(error?.message??"")){
      return unavailable("Urutonde rw'abayobozi rwatinze gusubiza. Ongera ugerageze.");
    }
    if(error){
      console.error("[leader-directory] bounded query failed",{code:error.code});
      return unavailable();
    }
    const probabilities=new Map(candidates.map(item=>[item.scope_code,item.supported_probability]));
    const payload=sanitizePublicDirectory(data,probabilities);
    return NextResponse.json({
      ...payload,
      unavailable:false,
      message_kiny:payload.candidates.length?null:"Amakuru y'umuyobozi ntaruzuzwa",
    },{status:200,headers:{"Cache-Control":"public, max-age=30, stale-while-revalidate=60"}});
  }catch(error){
    if(controller.signal.aborted||(error instanceof Error&&/abort|timeout/i.test(error.name+" "+error.message))){
      return unavailable("Urutonde rw'abayobozi rwatinze gusubiza. Ongera ugerageze.");
    }
    console.error("[leader-directory] unexpected query failure");
    return unavailable();
  }finally{clearTimeout(timer);}
}

export async function POST(request:NextRequest){
  let body:unknown;
  try{body=await request.json();}catch{
    return NextResponse.json({status:"error",message_kiny:"Amakuru y'ahantu ntabwo yoherejwe neza.",candidates:[],shared_leaders:[]},
      {status:400,headers:{"Cache-Control":"no-store"}});
  }
  const parsed=RequestSchema.safeParse(body);
  if(!parsed.success){
    return NextResponse.json({status:"error",message_kiny:"Ohereza ahantu 1 kugeza kuri 3 ukoresheje scope_code yemewe.",candidates:[],shared_leaders:[]},
      {status:422,headers:{"Cache-Control":"no-store"}});
  }
  return queryDirectory(parsed.data.candidates);
}

export async function GET(request:NextRequest){
  const scope=ScopeCode.safeParse(request.nextUrl.searchParams.get("scope_code"));
  if(!scope.success)return unavailable("Aho ushaka kureba abayobozi ntihabonetse neza.");
  return queryDirectory([{scope_code:scope.data}]);
}
