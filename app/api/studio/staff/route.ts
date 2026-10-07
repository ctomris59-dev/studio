import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,jsonObject,stringField,sameOrigin} from "@/lib/server/responses";
export const runtime="nodejs";

const roles=["Instructor","Coach","Front desk","Manager","Other"];
export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,["owner","manager","receptionist","instructor"],async(client,auth)=>{
   const rows=await client.query("SELECT id,display_name,role,availability_notes,active FROM studio_staff WHERE studio_id=$1 ORDER BY active DESC,display_name ASC",[auth.studioId]);
   return rows.rows;
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({staff:r.value});
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);if(!body)return errorResponse(400,"Invalid staff record.");
 const displayName=stringField(body,"displayName",80),role=stringField(body,"role",30),availabilityNotes=stringField(body,"availabilityNotes",500)??"";
 if(!displayName||displayName.length<2||!role||!roles.includes(role)||availabilityNotes===null)return errorResponse(400,"Check staff name, role and availability.");
 try{
  const r=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const row=await client.query("INSERT INTO studio_staff(studio_id,display_name,role,availability_notes) VALUES($1,$2,$3,$4) RETURNING id,display_name,role,availability_notes,active",[auth.studioId,displayName,role,availabilityNotes]);
   await client.query("INSERT INTO activity_log(studio_id,actor_id,action,details) VALUES($1,$2,'staff.created',jsonb_build_object('staffId',$3::text))",[auth.studioId,auth.userId,row.rows[0].id]);
   return row.rows[0];
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({staff:r.value},201);
 }catch{return backendError()}
}
