import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validUUID,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid origin.");
 const {id}=await params;
 if(!validUUID(id))return errorResponse(400,"Invalid person identifier.");
 const body=await jsonObject(request);
 if(body?.confirm!=="ANONYMIZE")return errorResponse(400,"Explicit confirmation required.");
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const record=await client.query<{archived_at:Date|null;anonymized_at:Date|null}>(
    "SELECT archived_at,anonymized_at FROM people WHERE studio_id=$1 AND id=$2 FOR UPDATE",[auth.studioId,id]);
   if(!record.rowCount)throw new StudioOperationError(404,"Contact not found.");
   if(record.rows[0].anonymized_at)return {id,alreadyApplied:true};
   if(!record.rows[0].archived_at)throw new StudioOperationError(409,"Archive the contact first.");
   const pending=await client.query("SELECT 1 FROM bookings WHERE studio_id=$1 AND member_id=$2 AND status IN('booked','waitlisted') LIMIT 1",[auth.studioId,id]);
   if(pending.rowCount)throw new StudioOperationError(409,"Cancel all active bookings first.");
   // Non-deliverable address fulfills the legacy people email-or-phone constraint.
   await client.query(`UPDATE people SET full_name='Anonymized person',email=$3,phone='',
    notes='',source='',preferred_service='',preferred_channel=NULL,interest_plan='',plan=NULL,
    tags=ARRAY[]::text[],email_consent=false,next_contact=NULL,
    related_contact_name='',related_contact_role='',related_contact_email='',related_contact_phone='',
    updated_at=now(),anonymized_at=now()
    WHERE studio_id=$1 AND id=$2`,[auth.studioId,id,"erased-"+id+"@invalid.example"]);
   await client.query(`UPDATE followup_tasks SET title='Anonymized follow-up',notes='',outcome=NULL,
    completed_at=coalesce(completed_at,now()) WHERE studio_id=$1 AND person_id=$2`,[auth.studioId,id]);
   await client.query("UPDATE activity_log SET details='{}'::jsonb WHERE studio_id=$1 AND person_id=$2",[auth.studioId,id]);
   await client.query("INSERT INTO activity_log(studio_id,person_id,actor_id,action) VALUES($1,$2,$3,'privacy.person_anonymized')",[auth.studioId,id,auth.userId]);
   return {id,alreadyApplied:false};
  });
  return result.access.ok?successResponse({contact:result.value}):errorResponse(result.access.status,result.access.message);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
