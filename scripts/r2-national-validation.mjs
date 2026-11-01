import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REF="buexgewxypvkqmphvfec", URL_BASE="https://"+REF+".supabase.co";
const APP="http://127.0.0.1:3000", SEED=20261030, RADII=[0,100,500,2000], GAP=2100;
const LEVELS=["village","cell","sector","district","province"];
const D=[
["RW-P1-D11","Nyarugenge"],["RW-P1-D12","Gasabo"],["RW-P1-D13","Kicukiro"],
["RW-P2-D21","Nyanza"],["RW-P2-D22","Gisagara"],["RW-P2-D23","Nyaruguru"],["RW-P2-D24","Huye"],
["RW-P2-D25","Nyamagabe"],["RW-P2-D26","Ruhango"],["RW-P2-D27","Muhanga"],["RW-P2-D28","Kamonyi"],
["RW-P3-D31","Karongi"],["RW-P3-D32","Rutsiro"],["RW-P3-D33","Rubavu"],["RW-P3-D34","Nyabihu"],
["RW-P3-D35","Ngororero"],["RW-P3-D36","Rusizi"],["RW-P3-D37","Nyamasheke"],
["RW-P4-D41","Rulindo"],["RW-P4-D42","Gakenke"],["RW-P4-D43","Musanze"],["RW-P4-D44","Burera"],["RW-P4-D45","Gicumbi"],
["RW-P5-D51","Rwamagana"],["RW-P5-D52","Nyagatare"],["RW-P5-D53","Gatsibo"],["RW-P5-D54","Kayonza"],
["RW-P5-D55","Kirehe"],["RW-P5-D56","Ngoma"],["RW-P5-D57","Bugesera"]];
const B={1:D.slice(0,6),2:D.slice(6,12),3:D.slice(12,18),4:D.slice(18,24),5:D.slice(24,30)};
const PN={"RW-P1":"Kigali City","RW-P2":"Southern Province","RW-P3":"Western Province","RW-P4":"Northern Province","RW-P5":"Eastern Province"};
const INFO={0:["village"],100:["village","cell"],500:["village","cell","sector"],2000:["village","cell","sector","district"]};
const OUT=process.env.R2_OUTPUT_DIR||"r2-output";

// CHANGED 2026-11-01 CHATGPT: add a V2-only, strictly serial national truth runner with confidence capture; see docs/HANDOFF.md.
function envCheck(){if((process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/+$/,"")!==URL_BASE||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)throw Error("Refusing: only the allow-listed public Supabase project is permitted.");if(process.env.LOCATE_CONFIDENCE_RPC!=="v2")throw Error("Refusing: LOCATE_CONFIDENCE_RPC must be v2.");}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const n=x=>{if(x===null||x===undefined||x==="")return null;const v=Number(x);return Number.isFinite(v)?v:null;};
const finite=x=>typeof x==="number"&&Number.isFinite(x);
async function save(file,data){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(data,null,2)+"\n");}
function truthPrefixes(code){const p=String(code||"").split("-");if(p.length!==6)throw Error("Invalid truth village scope code.");return{province:p.slice(0,2).join("-"),district:p.slice(0,3).join("-"),sector:p.slice(0,4).join("-"),cell:p.slice(0,5).join("-"),village:p.join("-")};}
async function restGet(table,params){const u=new URL("/rest/v1/"+table,URL_BASE);for(const[k,v]of Object.entries(params))u.searchParams.set(k,String(v));const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;const r=await fetch(u,{headers:{apikey:key,Authorization:"Bearer "+key,Accept:"application/json"},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error("Truth REST HTTP "+r.status);const j=await r.json();if(!Array.isArray(j))throw Error("Truth REST response was not an array.");return j;}
async function spacedTruthGet(state,table,params){
  if(state.prev)await pause(Math.max(0,state.prev+GAP-Date.now()));
  const now=Date.now();
  if(state.prev){const gap=now-state.prev;state.minGap=state.minGap===null?gap:Math.min(state.minGap,gap);}
  state.prev=now;
  return restGet(table,params);
}
async function rpc(name,body){const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;const r=await fetch(URL_BASE+"/rest/v1/rpc/"+name,{method:"POST",headers:{"content-type":"application/json",apikey:key,Authorization:"Bearer "+key},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error("RPC "+name+" HTTP "+r.status);return r.json();}
async function start(){const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p","3000"],{env:{...process.env,HOSTNAME:"127.0.0.1",PORT:"3000",LOCATE_CONFIDENCE_RPC:"v2",NEXT_TELEMETRY_DISABLED:"1"},stdio:"ignore"});for(let i=0;i<90;i++){if(child.exitCode!==null)throw Error("Local Next.js exited before health check.");try{if((await fetch(APP+"/api/health",{signal:AbortSignal.timeout(2000)})).status===200)return child;}catch{}await pause(1000);}child.kill("SIGTERM");throw Error("Local Next.js health check timed out.");}
async function stop(child){if(!child||child.exitCode!==null)return;child.kill("SIGTERM");await Promise.race([new Promise(r=>child.once("exit",r)),pause(5000)]);if(child.exitCode===null)child.kill("SIGKILL");}
function coord(row,r){if(!r)return{latitude:+row.lat,longitude:+row.lng};const s=row.district_scope_code+":"+row.idx+":"+r+":"+SEED;let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;const a=h/4294967296*Math.PI*2,e=6371008.8,lat1=+row.lat*Math.PI/180,lon1=+row.lng*Math.PI/180,d=r/e,lat2=Math.asin(Math.sin(lat1)*Math.cos(d)+Math.cos(lat1)*Math.sin(d)*Math.cos(a)),lon2=lon1+Math.atan2(Math.sin(a)*Math.sin(d)*Math.cos(lat1),Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));return{latitude:lat2*180/Math.PI,longitude:((lon2*180/Math.PI+540)%360)-180};}
// CHANGED 2026-11-01 CHATGPT: treat outside as a valid, non-empty classification; report it incorrect for inside truth; see docs/HANDOFF.md.
function observation(ctx,body,status,ms,transport=null){
  const responseStatus=body?.status;
  const success=responseStatus==="success";
  const validOutside=responseStatus==="outside"&&body?.outside_rwanda===true;
  const level=success&&LEVELS.includes(body.level)?body.level:null;
  const coll=body?.per_level_candidates||body?.hierarchyCandidates||{};
  const list=level&&Array.isArray(coll[level])?coll[level]:[];
  const hier=level?body?.hierarchy?.[level]:null;
  const scope=hier?.scope_code||list[0]?.scope_code||null;
  const cand=list.find(x=>x?.scope_code===scope)||hier||list[0]||null;
  const raw=n(cand?.raw_score),cal=n(cand?.calibrated_probability),direct=n(cand?.confidence);
  const confidence=direct!==null?direct:raw!==null?raw*100:null;
  const flags=Array.isArray(body?.flags)?body.flags.filter(x=>typeof x==="string"):[];
  const degraded=!!body?.degraded||flags.includes("degraded");
  const unavailable=flags.some(x=>["classifier_unavailable","rwanda_classifier_unavailable"].includes(x)||x.startsWith("classifier_error_code="));
  const knownStatus=success||responseStatus==="outside";
  const error=!!transport||status!==200||!knownStatus||degraded||unavailable;
  const truth=ctx.truth?truthPrefixes(ctx.truth):null;
  const isOutside=responseStatus==="outside"||body?.outside_rwanda===true||flags.includes("outside_rwanda");
  const empty=!knownStatus||responseStatus==="error"||(success&&(!level||!scope));
  const correct=ctx.outsideExpected?validOutside:!!(scope&&truth&&level&&scope===truth[level]);
  return{
    dataset:ctx.dataset,district:ctx.district||null,district_code:ctx.districtCode||null,
    province_code:ctx.provinceCode||null,province:ctx.province||null,sample_kind:ctx.kind,
    sample_index:ctx.index,seed:ctx.seed??SEED,radius_m:ctx.radius,latitude:ctx.lat,longitude:ctx.lng,
    true_village_scope_code:ctx.truth||null,true_prefixes:truth,expected_outside:!!ctx.outsideExpected,
    status:responseStatus||"transport_error",
    chosen_level:level||(responseStatus==="outside"?"outside":"empty"),chosen_scope_code:scope,
    chosen_level_confidence:confidence,
    chosen_level_confidence_source:direct!==null?"candidate.confidence":raw!==null?"raw_score_x_100_fallback":null,
    chosen_level_raw_score:raw,chosen_level_calibrated_probability:cal,
    confidence_recorded:confidence!==null,chosen_level_correct:correct,
    informative:!!(!ctx.outsideExpected&&INFO[ctx.radius]?.includes(level)),
    empty,error,degraded,classifier_unavailable:unavailable,outside_rwanda:isOutside,
    false_outside_flag:!ctx.outsideExpected&&isOutside,
    outside_flagged_correctly:ctx.outsideExpected?validOutside:null,
    flags,http_status:status,latency_ms:ms,source:body?.source||null,
    calibration_version:body?.calibration_version||null,response_commit_sha:body?.commit_sha||null,
    transport_error:transport
  };
}
async function locate(point,accuracy,ctx){const t=Date.now();let body=null,status=0,err=null;try{const r=await fetch(APP+"/api/locate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({latitude:point.latitude,longitude:point.longitude,accuracy,method:"gps"}),signal:AbortSignal.timeout(15000)});status=r.status;const raw=await r.text();try{body=raw?JSON.parse(raw):null;}catch{err="invalid_json_response";}}catch(e){err=e instanceof Error?e.message:String(e);}return observation({...ctx,lat:point.latitude,lng:point.longitude},body,status,Date.now()-t,err);}
async function paced(state,point,accuracy,ctx){if(state.prev)await pause(Math.max(0,state.prev+GAP-Date.now()));const now=Date.now();if(state.prev){const gap=now-state.prev;state.minGap=state.minGap===null?gap:Math.min(state.minGap,gap);}state.prev=now;const row=await locate(point,accuracy,ctx);state.rows.push(row);if(row.error){state.errors++;state.stop="hard_stop_on_first_API_error";return false;}return true;}
async function batch(id){const districts=B[id],file=path.join(OUT,"batch-"+id+".json"),state={rows:[],errors:0,prev:0,minGap:null,stop:null},started=new Date().toISOString();let app=null,setup=null;try{
  if(!districts)throw Error("R2_BATCH must be 1 to 5.");
  const truth=[];
  // Query per district: PostgREST max_rows can truncate a six-district request below 150 rows.
  for(const[code,name]of districts){
    const selected=await spacedTruthGet(state,"w2_truth_samples",{
      select:"district_scope_code,seed,idx,lng,lat,true_village_scope_code,kind",
      district_scope_code:"eq."+code,seed:"eq."+SEED,kind:"eq.interior",order:"idx.asc",limit:25
    });
    if(selected.length!==25||selected.some(row=>row.district_scope_code!==code||Number(row.seed)!==SEED||row.kind!=="interior"))
      throw Error(name+" truth page must contain exactly 25 interior rows for the requested district.");
    truth.push(...selected);
  }
  if(truth.length!==150)throw Error("Expected exactly 150 truth rows in batch.");
  app=await start();let stopNow=false;for(const[code,name]of districts){for(const row of truth.filter(x=>x.district_scope_code===code)){const p=truthPrefixes(row.true_village_scope_code);for(const radius of RADII){if(stopNow)break;const ctx={dataset:"national_30_district",district:name,districtCode:code,provinceCode:p.province,province:PN[p.province],kind:row.kind,index:+row.idx,seed:+row.seed,radius,truth:row.true_village_scope_code};if(!(await paced(state,coord(row,radius),radius,ctx)))stopNow=true;}if(stopNow)break;}if(stopNow)break;}}catch(e){setup=e instanceof Error?e.message:String(e);state.stop=state.stop||"setup_or_runner_error";}finally{await stop(app);const result={type:"r2_national_batch",batch_id:+id,district_codes:districts?.map(x=>x[0])||[],district_names:districts?.map(x=>x[1])||[],seed:SEED,truth_points_per_district:25,radii_m:RADII,requests_planned:600,requests_completed:state.rows.length,total_errors:state.errors,minimum_request_start_gap_ms:state.minGap,outcome:!setup&&state.rows.length===600&&state.errors===0?"COMPLETED":"INCOMPLETE",started_at:started,completed_at:new Date().toISOString(),setup_error:setup,stop_reason:state.stop,rows:state.rows};await save(file,result);console.log(JSON.stringify({batch:+id,planned:600,completed:result.requests_completed,errors:result.total_errors,min_gap_ms:result.minimum_request_start_gap_ms,outcome:result.outcome,artifact:file}));if(result.outcome!=="COMPLETED")process.exitCode=1;}}
function outsidePoints(){const a=[];for(let i=0;i<=12;i++)a.push({country:"DRC",lat:-2.75+i*.13,lng:28.3});for(let i=0;i<=12;i++)a.push({country:"Burundi",lat:-3.2,lng:29+i*.15});for(let i=0;i<=11;i++)a.push({country:"Tanzania",lat:-2.65+i*.13,lng:31.15});for(let i=0;i<=11;i++)a.push({country:"Uganda",lat:-.65,lng:29+i*.15});return a.map((x,i)=>({...x,index:i+1,kind:"verified_outside_"+x.country}));}
async function special(){const file=path.join(OUT,"special.json"),state={rows:[],errors:0,prev:0,minGap:null,stop:null},started=new Date().toISOString();let app=null,setup=null,kivuN=0;try{state.prev=Date.now(); // CHANGED 2026-11-01 CHATGPT: pace first Kivu /api/locate call after sampler RPC; see docs/HANDOFF.md.
const all=await rpc("w2_sample_kivu_lakeshore_truth",{p_seed:SEED});if(!Array.isArray(all)||all.length<50)throw Error("Kivu truth sampler returned fewer than 50 rows.");const kivu=all.slice(0,50);kivuN=kivu.length;for(const x of kivu)if(+x.distance_to_union_edge_m>100||+x.longitude<28.85||+x.longitude>29.35||+x.latitude< -2.85||+x.latitude> -1.65)throw Error("Kivu point outside validated 100m lakeshore strip.");const outside=outsidePoints();if(outside.length!==50)throw Error("Outside set must contain 50 points.");app=await start();let stopNow=false;for(const x of kivu){if(stopNow)break;const p=truthPrefixes(x.true_village_scope_code),ctx={dataset:"kivu_lakeshore",district:"Kivu lakeshore sample",districtCode:p.district,provinceCode:p.province,province:PN[p.province],kind:x.sample_kind,index:+x.sample_index,seed:+x.seed,radius:0,truth:x.true_village_scope_code};if(!(await paced(state,{latitude:+x.latitude,longitude:+x.longitude},0,ctx)))stopNow=true;}for(const x of outside){if(stopNow)break;const ctx={dataset:"outside_rwanda",district:x.country,districtCode:"OUTSIDE-"+x.country.toUpperCase(),kind:x.kind,index:x.index,seed:SEED,radius:0,outsideExpected:true};if(!(await paced(state,{latitude:x.lat,longitude:x.lng},0,ctx)))stopNow=true;const last=state.rows[state.rows.length-1];if(last)last.outside_country_zone=x.country;}}catch(e){setup=e instanceof Error?e.message:String(e);state.stop=state.stop||"setup_or_runner_error";}finally{await stop(app);const k=state.rows.filter(x=>x.dataset==="kivu_lakeshore"),o=state.rows.filter(x=>x.dataset==="outside_rwanda"),result={type:"r2_special_validation",seed:SEED,kivu_truth_points_available:kivuN,kivu_points_planned:50,kivu_requests_completed:k.length,outside_points_planned:50,outside_requests_completed:o.length,outside_truth_precheck:{project_ref:REF,method:"read-only ST_Covers and ST_Distance against public.rwanda_national_geom",points_verified_outside:50,inside_points:0,minimum_border_distance_m:28427,zones:["DRC","Burundi","Tanzania","Uganda"]},total_requests_planned:100,requests_completed:state.rows.length,total_errors:state.errors,minimum_request_start_gap_ms:state.minGap,kivu_false_outside_flags:k.filter(x=>x.false_outside_flag).length,outside_flagged_correctly:o.filter(x=>x.outside_flagged_correctly).length,outcome:!setup&&state.rows.length===100&&state.errors===0?"COMPLETED":"INCOMPLETE",started_at:started,completed_at:new Date().toISOString(),setup_error:setup,stop_reason:state.stop,rows:state.rows};await save(file,result);console.log(JSON.stringify({kivu_planned:50,kivu_done:k.length,kivu_false_outside:result.kivu_false_outside_flags,outside_planned:50,outside_done:o.length,outside_flagged:result.outside_flagged_correctly,errors:result.total_errors,min_gap_ms:result.minimum_request_start_gap_ms,outcome:result.outcome,artifact:file}));if(result.outcome!=="COMPLETED")process.exitCode=1;}}
function pct(rows,fn){return rows.length?+((100*rows.filter(fn).length/rows.length).toFixed(2)):null;}
function quantile(a,p){if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.max(0,Math.ceil(p*s.length)-1)];}
function metrics(rows){const out={};for(const r of RADII){const a=rows.filter(x=>x.radius_m===r),t=a.map(x=>n(x.latency_ms)).filter(x=>x!==null);out[r]={requests:a.length,correctness_pct:pct(a,x=>x.chosen_level_correct===true),informativeness_pct:pct(a,x=>x.informative===true),empty:a.filter(x=>x.empty).length,errors:a.filter(x=>x.error).length,degraded:a.filter(x=>x.degraded).length,p50_ms:quantile(t,.5),p95_ms:quantile(t,.95),chosen_confidence_recorded:a.filter(x=>finite(x.chosen_level_confidence)).length,confidence_missing_with_scope:a.filter(x=>x.chosen_scope_code&&!finite(x.chosen_level_confidence)).length};}return out;}
function csv(headers,rows){const c=v=>'"'+(v===null||v===undefined?"":typeof v==="object"?JSON.stringify(v):String(v)).replaceAll('"','""')+'"';return[headers.join(","),...rows.map(r=>headers.map(h=>c(r[h])).join(","))].join("\n")+"\n";}
async function aggregate(){const input=process.env.R2_INPUT_DIR||"r2-input",sp=process.env.R2_SPECIAL_INPUT_DIR||"r2-special-input",dir=process.env.R2_REPORT_DIR||"r2-report",b=[];for(let i=1;i<=5;i++){try{b.push(JSON.parse(await readFile(path.join(input,"batch-"+i+".json"),"utf8")));}catch{b.push({batch_id:i,outcome:"MISSING_ARTIFACT",requests_planned:600,requests_completed:0,total_errors:0,rows:[]});}}let s=null;try{s=JSON.parse(await readFile(path.join(sp,"special.json"),"utf8"));}catch{}const rows=b.flatMap(x=>Array.isArray(x.rows)?x.rows:[]),byD={},byP={};for(const[code,name]of D){const p=code.split("-").slice(0,2).join("-"),a=rows.filter(x=>x.district_code===code);byD[code]={district:name,district_code:code,province_code:p,province:PN[p],metrics:metrics(a)};}for(const[p,name]of Object.entries(PN)){const a=rows.filter(x=>x.province_code===p);byP[p]={province:name,province_code:p,district_count:D.filter(x=>x[0].startsWith(p+"-")).length,metrics:metrics(a)};}const national=metrics(rows),sr=Array.isArray(s?.rows)?s.rows:[],k=sr.filter(x=>x.dataset==="kivu_lakeshore"),o=sr.filter(x=>x.dataset==="outside_rwanda"),flagged=o.filter(x=>x.outside_flagged_correctly).length,kfp=k.filter(x=>x.false_outside_flag).length;const complete=b.length===5&&b.every(x=>x.outcome==="COMPLETED"&&x.requests_planned===600&&x.requests_completed===600&&x.total_errors===0),dcounts=D.every(([code])=>rows.filter(x=>x.district_code===code&&x.radius_m===0).length===25),emptyZero=rows.length===3000&&rows.every(x=>!x.empty),fields=[...rows,...sr].every(x=>Object.hasOwn(x,"chosen_level_confidence")),conf=[...rows,...k].every(x=>!x.chosen_scope_code||finite(x.chosen_level_confidence)),districtGate=[0,100,500].every(r=>D.every(([c])=>byD[c].metrics[r].requests===25&&byD[c].metrics[r].correctness_pct!==null&&byD[c].metrics[r].correctness_pct>=85)),nationalGate=[0,100,500].every(r=>national[r].requests===750&&national[r].correctness_pct!==null&&national[r].correctness_pct>=90),outsideGate=o.length===50&&flagged===50&&o.every(x=>x.status==="outside"&&x.outside_rwanda===true),kivuGate=k.length===50&&kfp===0&&k.every(x=>x.status==="success"),insideFP=rows.filter(x=>x.radius_m===0&&x.false_outside_flag).length===0&&kfp===0;const gates={five_sequential_batches_600_each:complete,all_30_districts_25_truth_points:dcounts,exactly_3000_national_requests:rows.length===3000,district_correctness_ge_85_pct_at_0_100_500m:districtGate,national_correctness_ge_90_pct_at_0_100_500m:nationalGate,national_empty_zero:emptyZero,confidence_field_in_every_raw_row:fields,chosen_confidence_numeric_when_scope_present:conf,all_50_outside_flagged_outside:outsideGate,all_50_kivu_tested_no_false_outside:kivuGate,no_false_outside_on_original_inside_points:insideFP,zero_national_API_errors:rows.every(x=>x.error===false)};const report={title:"IWACU RWANDA 2 Release 2 V2 National Validation",generated_at:new Date().toISOString(),project_ref:REF,source_commit:process.env.GITHUB_SHA||null,classifier:"classify_rwanda_coordinate_v2",confidence_rpc:"calculate_location_confidence_v2",seed:SEED,truth_design:{district_count:30,truth_points_per_district:25,kind:"interior",radii_m:RADII,requests_planned:3000,min_start_gap_ms:GAP,ordering:"serial; matrix max-parallel 1; fail-fast false"},national,by_province:byP,by_district:byD,special:{kivu_points:50,kivu_tested:k.length,kivu_false_outside_flags:kfp,kivu_correctness_pct:pct(k,x=>x.chosen_level_correct===true),outside_points:50,outside_tested:o.length,outside_flagged:flagged,outside_false_negative:o.length-flagged,outside_truth_precheck:s?.outside_truth_precheck||null,errors:s?.total_errors??null,outcome:s?.outcome||"MISSING"},batches:b.map(x=>({batch_id:x.batch_id,codes:x.district_codes||[],outcome:x.outcome,planned:x.requests_planned,completed:x.requests_completed,errors:x.total_errors,min_start_gap_ms:x.minimum_request_start_gap_ms??null,setup_error:x.setup_error||null})),gates,all_gates_pass:Object.values(gates).every(Boolean)};await mkdir(dir,{recursive:true});await save(path.join(dir,"national-summary.json"),report);await save(path.join(dir,"national-by-district.json"),byD);await save(path.join(dir,"national-by-province.json"),byP);await save(path.join(dir,"national-gates.json"),gates);const dr=[];for(const[c,x]of Object.entries(byD))for(const[r,m]of Object.entries(x.metrics))dr.push({district_code:c,district:x.district,province_code:x.province_code,province:x.province,radius_m:r,...m});await writeFile(path.join(dir,"national-by-district.csv"),csv(["district_code","district","province_code","province","radius_m","requests","correctness_pct","informativeness_pct","empty","errors","degraded","p50_ms","p95_ms","chosen_confidence_recorded","confidence_missing_with_scope"],dr));const pr=[];for(const[c,x]of Object.entries(byP))for(const[r,m]of Object.entries(x.metrics))pr.push({province_code:c,province:x.province,radius_m:r,...m});await writeFile(path.join(dir,"national-by-province.csv"),csv(["province_code","province","radius_m","requests","correctness_pct","informativeness_pct","empty","errors","degraded","p50_ms","p95_ms","chosen_confidence_recorded","confidence_missing_with_scope"],pr));console.log(JSON.stringify({requests:rows.length,kivu:k.length,outside:o.length,national,gates,all_gates_pass:report.all_gates_pass,output:dir},null,2));if(!report.all_gates_pass)process.exitCode=1;}
function selfTest(){
  const code="RW-P1-D11-S01-C01-V001";
  const inside={dataset:"self_test",district:"test",districtCode:"RW-P1-D11",provinceCode:"RW-P1",province:"Kigali City",kind:"interior",index:1,seed:SEED,radius:0,truth:code};
  const candidate={scope_code:code,confidence:88,raw_score:0.88,calibrated_probability:null};
  const success={status:"success",level:"village",hierarchy:{village:{scope_code:code}},per_level_candidates:{village:[candidate]},flags:[]};
  const exact=observation(inside,success,200,37);
  if(!exact.chosen_level_correct||exact.error||exact.empty||exact.chosen_level_confidence!==88||exact.chosen_level_calibrated_probability!==null)
    throw Error("self-test failed: exact inside / confidence capture");
  const falseOutside=observation({...inside,radius:2000},{status:"outside",outside_rwanda:true,flags:["outside_rwanda"]},200,41);
  if(falseOutside.error||falseOutside.empty||falseOutside.chosen_level_correct||!falseOutside.false_outside_flag||falseOutside.chosen_level!=="outside")
    throw Error("self-test failed: outside classification for inside truth");
  const trueOutside=observation({dataset:"self_test",kind:"outside",index:1,radius:0,expectedOutside:true},
    {status:"outside",outside_rwanda:true,flags:["outside_rwanda"]},200,29);
  if(trueOutside.error||trueOutside.empty||!trueOutside.chosen_level_correct||!trueOutside.outside_flagged_correctly)
    throw Error("self-test failed: correctly flagged outside point");
  const missedOutside=observation({dataset:"self_test",kind:"outside",index:2,radius:0,expectedOutside:true},
    {status:"success",level:"district",hierarchy:{district:{scope_code:"RW-P1-D11"}},flags:[]},200,31);
  if(missedOutside.error||missedOutside.empty||missedOutside.chosen_level_correct||missedOutside.outside_flagged_correctly)
    throw Error("self-test failed: false-negative outside classification");
  const failed=observation(inside,null,0,15000,"simulated transport failure");
  if(!failed.error||!failed.empty)throw Error("self-test failed: transport error counting");
  console.log("R2 offline self-tests PASS: inside, outside, false-outside, outside false-negative, confidence null handling, transport error.");
}
async function main(){const action=process.env.R2_ACTION;if(action==="self-test"){selfTest();return;}if(action!=="aggregate")envCheck();await mkdir(OUT,{recursive:true});if(action==="batch")await batch(String(process.env.R2_BATCH||""));else if(action==="special")await special();else if(action==="aggregate")await aggregate();else throw Error("R2_ACTION must be batch, special or aggregate.");}
main().catch(async e=>{const action=process.env.R2_ACTION||"unknown",f=action==="batch"?path.join(OUT,"batch-"+(process.env.R2_BATCH||"unknown")+".json"):path.join(OUT,"special.json");await save(f,{type:action==="batch"?"r2_national_batch":"r2_special_validation",outcome:"FAILED_BEFORE_COMPLETION",setup_error:e instanceof Error?e.message:String(e),rows:[],requests_completed:0,total_errors:1});console.error(JSON.stringify({action,error:e instanceof Error?e.message:String(e)}));process.exitCode=1;});
