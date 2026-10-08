import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {analyzeCsvImport} from "@/lib/server/csv-import";
export const runtime="nodejs";
const MAX_CSV_BYTES=512000;
async function readCsvBounded(request:Request):Promise<string>{
 if(!request.body)throw new Error("CSV file is empty.");
 const reader=request.body.getReader();const parts:Uint8Array[]=[];let total=0;
 try{
  while(true){
   const part=await reader.read();if(part.done)break;
   total+=part.value.byteLength;
   if(total>MAX_CSV_BYTES){await reader.cancel();throw new Error("CSV file must be 500 KB or smaller.")}
   parts.push(part.value);
  }
 }finally{reader.releaseLock()}
 if(total===0)throw new Error("CSV file is empty.");
 const all=new Uint8Array(total);let offset=0;
 for(const p of parts){all.set(p,offset);offset+=p.byteLength}
 try{return new TextDecoder("utf-8",{fatal:true}).decode(all)}
 catch{return new TextDecoder("windows-1252").decode(all)}
}
const safeFilename=(value:string|null)=>{
 const clean=(value||"studio-import.csv").replace(/[^A-Za-z0-9._ -]/g,"_").slice(0,120);
 return clean||"studio-import.csv";
};
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const length=Number(request.headers.get("content-length")||0);
 if(length>MAX_CSV_BYTES)return errorResponse(413,"CSV file must be 500 KB or smaller.");
 const mode=request.nextUrl.searchParams.get("mode");
 if(mode!=="preview"&&mode!=="commit")return errorResponse(400,"Choose preview or commit.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const csv=await readCsvBounded(request);
   const analysis=await analyzeCsvImport(client,auth.studioId,csv);
   if(mode==="preview")return {mode,summary:analysis.summary,rows:analysis.rows.slice(0,30).map(x=>({
    row:x.row,kind:x.kind,name:x.name,email:x.email,phone:x.phone,ready:x.ready,issues:x.issues,warnings:x.warnings
   }))};
   let imported=0,conflicts=0;
   for(const row of analysis.rows.filter(x=>x.ready)){
    const insert=await client.query<{id:string}>(`
     INSERT INTO people(studio_id,kind,full_name,email,phone,notes,source,lead_stage,
       joined,start_date,expiry_date,member_status,plan,credits,initial_credits,package_status,email_consent)
     VALUES($1,$2,$3,$4,$5,$6,'CSV import',$7,
       CASE WHEN $2='member' THEN coalesce($8::date,current_date) ELSE NULL END,
       CASE WHEN $2='member' THEN coalesce($8::date,current_date) ELSE NULL END,
       CASE WHEN $2='member' THEN $9::date ELSE NULL END,$10,$11,$12,$12,$13,false)
     ON CONFLICT DO NOTHING RETURNING id`,
     [auth.studioId,row.kind,row.name,row.email,row.phone,row.notes,row.leadStage,row.startDate,row.expiryDate,
      row.memberStatus,row.plan,row.credits,row.packageStatus]);
    if(insert.rowCount){
     imported++;
     if(row.kind==="member"&&row.packageStatus==="Confirmed")await client.query(
      "INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,'import.member_entitlement',$4::jsonb)",
      [auth.studioId,insert.rows[0].id,auth.userId,JSON.stringify({credits:row.credits,plan:row.plan,expiryDate:row.expiryDate,source:"CSV migration entitlement"})]
     );
    }else conflicts++;
   }
   const skipped=analysis.rows.length-imported,filename=safeFilename(request.headers.get("x-studiotasker-filename"));
   const batch=await client.query<{id:string}>(`
    INSERT INTO import_batches(studio_id,actor_id,filename,row_count,imported_count,skipped_count)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [auth.studioId,auth.userId,filename,analysis.rows.length,imported,skipped]);
   await client.query(
    "INSERT INTO activity_log(studio_id,actor_id,action,details) VALUES($1,$2,'import.csv_committed',$3::jsonb)",
    [auth.studioId,auth.userId,JSON.stringify({batchId:batch.rows[0].id,filename,rows:analysis.rows.length,imported,skipped,conflicts})]);
   return {mode,batchId:batch.rows[0].id,summary:{rows:analysis.rows.length,imported,skipped,conflicts}};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value,mode==="commit"?201:200);
 }catch(e){
  const message=e instanceof Error?e.message:"";
  if(message==="CSV file must be 500 KB or smaller.")return errorResponse(413,message);
  if(message.startsWith("CSV ")||message.includes("CSV needs")||message.includes("Name or Full Name"))return errorResponse(400,message);
  return backendError();
 }
}
