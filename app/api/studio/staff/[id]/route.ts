import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,jsonObject,stringField,sameOrigin} from "@/lib/server/responses";
import {validUUID} from "@/lib/server/studio-booking";
export const runtime="nodejs";
const roles=["Instructor","Coach","Front desk","Manager","Other"];

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const {id}=await params;if(!validUUID(id))return errorResponse(400,"Invalid staff identifier.");
 const body=await jsonObject(request);if(!body)return errorResponse(400,"Invalid staff update.");
 const allowed=["displayName","role","availabilityNotes","active"];
 if(!Object.keys(body).length||Object.keys(body).some(k=>!allowed.includes(k)))return errorResponse(400,"Unsupported staff fields.");
 const displayName=body.displayName===undefined?undefined:stringField(body,"displayName",80);
 const role=body.role===undefined?undefined:stringField(body,"role",30);
 const availabilityNotes=body.availabilityNotes===undefined?undefined:stringField(body,"availabilityNotes",500);
 const active=body.active;
 if(displayName===null||displayName!==undefined&&displayName.length<2||role===null||role!==undefined&&!roles.includes(role)||availabilityNotes===null||active!==undefined&&typeof active!=="boolean")
  return errorResponse(400,"Invalid staff fields.");
 try{
  const r=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const values:unknown[]=[auth.studioId,id],sets:string[]=[];
   const add=(column:string,value:unknown)=>{if(value!==undefined){values.push(value);sets.push(column+"=$"+values.length)}};
   add("display_name",displayName);add("role",role);add("availability_notes",availabilityNotes);add("active",active);
   if(!sets.length)return {missingUpdate:true};
   const row=await client.query("UPDATE studio_staff SET "+sets.join(",")+",updated_at=now() WHERE studio_id=$1 AND id=$2 RETURNING id,display_name,role,availability_notes,active",values);
   if(!row.rowCount)return {missing:true};
   await client.query("INSERT INTO activity_log(studio_id,actor_id,action,details) VALUES($1,$2,'staff.updated',jsonb_build_object('staffId',$3::text))",[auth.studioId,auth.userId,id]);
   return {staff:row.rows[0]};
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  if("missing" in r.value)return errorResponse(404,"Staff record not found.");
  if("missingUpdate" in r.value)return errorResponse(400,"No editable staff fields supplied.");
  return successResponse(r.value);
 }catch{return backendError()}
}
