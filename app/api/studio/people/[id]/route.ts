import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validUUID,StudioOperationError} from "@/lib/server/studio-booking";
import {normalizeEmail,emailIsValid} from "@/lib/auth-crypto";
export const runtime="nodejs";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const {id}=await params;if(!validUUID(id))return errorResponse(400,"Invalid contact identifier.");
 const data=await jsonObject(request);if(!data)return errorResponse(400,"Invalid update.");
 const fields=["name","email","phone","notes","stage","nextContact","source","consent","status","startDate","expiryDate"];
 if(!Object.keys(data).length||Object.keys(data).some(k=>!fields.includes(k)))return errorResponse(400,"Unsupported fields.");
 const name=data.name===undefined?undefined:stringField(data,"name",80);
 const email=data.email===undefined?undefined:stringField(data,"email",160);
 const phone=data.phone===undefined?undefined:stringField(data,"phone",30);
 const notes=data.notes===undefined?undefined:stringField(data,"notes",1600);
 const stage=data.stage===undefined?undefined:stringField(data,"stage",30);
 const source=data.source===undefined?undefined:stringField(data,"source",80);
 const status=data.status===undefined?undefined:stringField(data,"status",15);
 const nextContact=data.nextContact===undefined?undefined:stringField(data,"nextContact",10);
 const startDate=data.startDate===undefined?undefined:stringField(data,"startDate",10);
 const expiryDate=data.expiryDate===undefined?undefined:stringField(data,"expiryDate",10);
 const dateValid=(str:string|undefined|null)=>{
  if(str===undefined||str===null||str==="")return true;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(str))return false;
  const date=new Date(str+"T12:00:00Z");
  return Number.isFinite(date.getTime())&&date.toISOString().startsWith(str);
 };
 if(name===null||name!==undefined&&name.length<2||email===null||email!==undefined&&email!==""&&!emailIsValid(normalizeEmail(email))||
 phone===null||phone!==undefined&&phone!==""&&!/^\+?[0-9]{7,15}$/.test(phone.replace(/[\s().-]/g,""))||
 notes===null||stage===null||source===null||status===null||
 nextContact===null||startDate===null||expiryDate===null||!dateValid(nextContact)||!dateValid(startDate)||!dateValid(expiryDate)||
 (stage!==undefined&&!["New","Contacted","Trial booked","Trial attended","Won","Lost"].includes(stage))||
 (status!==undefined&&!["Active","Paused"].includes(status))||
 (data.consent!==undefined&&typeof data.consent!=="boolean"))
 return errorResponse(400,"Invalid contact fields.");
 try{
  const roles=status!==undefined||startDate!==undefined||expiryDate!==undefined?["owner","manager"] as const:["owner","manager","receptionist"] as const;
  const r=await authenticated(request,roles,async(client,auth)=>{
   const old=await client.query<{id:string;kind:string;email:string;phone:string}>(`
    SELECT id,kind,email,phone FROM people WHERE id=$1 AND studio_id=$2 AND archived_at IS NULL FOR UPDATE`,[id,auth.studioId]);
   if(!old.rowCount)throw new StudioOperationError(404,"Contact not found.");
   if(stage!==undefined&&old.rows[0].kind!=="lead"||status!==undefined&&old.rows[0].kind!=="member")
    throw new StudioOperationError(400,"Field is not applicable to this contact type.");
   const columns:string[]=[],values:unknown[]=[auth.studioId,id];
   const append=(key:string,value:unknown)=>{if(value!==undefined){values.push(value);columns.push(key+"=$"+values.length)}};
   append("full_name",name);append("email",email===undefined?undefined:normalizeEmail(email));
   append("phone",phone===undefined?undefined:phone.replace(/[\s().-]/g,""));
   append("notes",notes);append("lead_stage",stage);append("source",source);
   append("member_status",status);append("next_contact",nextContact===undefined?undefined:nextContact||null);
   append("start_date",startDate===undefined?undefined:startDate||null);
   append("expiry_date",expiryDate===undefined?undefined:expiryDate||null);
   append("email_consent",data.consent);
   if(!columns.length)throw new StudioOperationError(400,"No editable fields provided.");
   const changed=await client.query(`UPDATE people SET ${columns.join(",")},updated_at=now()
     WHERE studio_id=$1 AND id=$2 RETURNING id,kind,full_name,email,phone,notes,lead_stage,member_status,start_date,expiry_date`,values);
   await client.query("INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,'contact.updated',jsonb_build_object('fields',$4::text[]))",[auth.studioId,id,auth.userId,columns.map(x=>x.split("=")[0])]);
   return changed.rows[0];
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({contact:r.value});
 }catch(e){
  if((e as {code?:string}).code==="23505")return errorResponse(409,"Contact email or phone already exists.");
  if((e as {code?:string}).code==="23514")return errorResponse(400,"Date or contact fields violate validation rules.");
  return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError();
 }
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const {id}=await params;if(!validUUID(id))return errorResponse(400,"Invalid contact.");
 try{
  const r=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const person=await client.query<{kind:string;archived_at:Date|null}>(`
    SELECT kind,archived_at FROM people WHERE studio_id=$1 AND id=$2 FOR UPDATE`,[auth.studioId,id]);
   if(!person.rowCount)throw new StudioOperationError(404,"Contact not found.");
   if(person.rows[0].archived_at)return {id,alreadyArchived:true};
   const active=await client.query(`
    SELECT 1 FROM bookings WHERE studio_id=$1 AND member_id=$2 AND status IN('booked','waitlisted') LIMIT 1`,
    [auth.studioId,id]);
   if(active.rowCount)throw new StudioOperationError(409,"Cancel active bookings before archiving a member.");
   await client.query("UPDATE people SET archived_at=now(),updated_at=now(),lead_stage=CASE WHEN kind='lead' THEN 'Lost' ELSE lead_stage END,member_status=CASE WHEN kind='member' THEN 'Paused' ELSE member_status END WHERE studio_id=$1 AND id=$2",[auth.studioId,id]);
   await client.query("UPDATE followup_tasks SET completed_at=now(),outcome='Archived' WHERE studio_id=$1 AND person_id=$2 AND completed_at IS NULL",[auth.studioId,id]);
   await client.query("INSERT INTO activity_log(studio_id,person_id,actor_id,action) VALUES($1,$2,$3,'contact.archived')",[auth.studioId,id,auth.userId]);
   return {id,alreadyArchived:false};
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({archived:r.value,notice:"Archived for operational use; not permanently erased. Retention and lawful erasure require separate review."});
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
