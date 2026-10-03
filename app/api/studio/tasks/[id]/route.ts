import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {StudioOperationError,validUUID} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const data=await jsonObject(request);
 if(!data)return errorResponse(400,"Invalid task update.");
 const outcome=stringField(data,"outcome",32),{id}=await context.params;
 if(!validUUID(id)||!["Contacted","No answer","Reschedule","Converted","Completed"].includes(outcome||""))
  return errorResponse(400,"Choose a valid task and completion outcome.");
 try{
  const r=await authenticated(request,["owner","manager","receptionist"],async(client,auth)=>{
   const record=await client.query<{id:string;person_id:string;completed_at:Date|null}>(`
    SELECT id,person_id,completed_at FROM followup_tasks
    WHERE studio_id=$1 AND id=$2 FOR UPDATE`,[auth.studioId,id]);
   if(!record.rowCount)throw new StudioOperationError(404,"Follow-up task not found.");
   if(record.rows[0].completed_at)return {alreadyCompleted:true,id};
   // Outcomes are recorded, not guessed. Conversion requires the separate membership workflow.
   const updated=await client.query(`
    UPDATE followup_tasks SET completed_at=now(),outcome=$3
    WHERE studio_id=$1 AND id=$2 RETURNING id,outcome,completed_at`,[auth.studioId,id,outcome]);
   await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action,details)
    VALUES($1,$2,$3,'followup.completed',jsonb_build_object('outcome',$4::text))`,
    [auth.studioId,record.rows[0].person_id,auth.userId,outcome]);
   return {...updated.rows[0],alreadyCompleted:false};
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({task:r.value});
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
