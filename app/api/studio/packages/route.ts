import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,backendError,successResponse,jsonObject,sameOrigin,stringField} from "@/lib/server/responses";
import {validInteger,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,["owner","manager","receptionist"],async(client,auth)=>{
   const q=await client.query(`SELECT id,name,description,credits,valid_days,active,created_at
    FROM studio_packages WHERE studio_id=$1 ORDER BY active DESC,created_at ASC LIMIT 50`,[auth.studioId]);
   return q.rows;
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({packages:r.value});
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid origin.");
 const d=await jsonObject(request);
 if(!d)return errorResponse(400,"Invalid package.");
 const name=stringField(d,"name",70),description=stringField(d,"description",240)||"";
 if(!name||name.length<2||!validInteger(d.credits,1,100)||!validInteger(d.validDays,7,365))
  return errorResponse(400,"Provide package name, class count and valid days.");
 try{
  const r=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const count=await client.query<{n:number}>("SELECT count(*)::int n FROM studio_packages WHERE studio_id=$1",[auth.studioId]);
   if(count.rows[0].n>=50)throw new StudioOperationError(409,"Maximum 50 packages per studio.");
   const row=await client.query(`INSERT INTO studio_packages(studio_id,name,description,credits,valid_days,price_cents,currency)
    VALUES($1,$2,$3,$4,$5,NULL,NULL) RETURNING id,name,description,credits,valid_days,active,created_at`,
    [auth.studioId,name,description,d.credits,d.validDays]);
   return row.rows[0];
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({package:r.value},201);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
