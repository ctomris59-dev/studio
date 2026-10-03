import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {StudioOperationError,validUUID,isZonedDate} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,["owner","manager","receptionist"],async(client,auth)=>{
   const tasks=await client.query(`
    SELECT t.id,t.title,t.due_at,t.category,t.priority,t.completed_at,t.outcome,
     p.full_name AS person_name
    FROM followup_tasks t JOIN people p ON p.id=t.person_id AND p.studio_id=t.studio_id
    WHERE t.studio_id=$1 AND t.completed_at IS NULL
    ORDER BY t.due_at,t.id LIMIT 100`,[auth.studioId]);
   return tasks.rows;
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({tasks:r.value});
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid task.");
 const personId=stringField(body,"personId",36),title=stringField(body,"title",240);
 const dueAt=stringField(body,"dueAt",40);
 const category=stringField(body,"category",30)||"General";
 const priority=stringField(body,"priority",20)||"Normal";
 if(!validUUID(personId)||!title||title.length<2||!isZonedDate(dueAt)||
 !["Call","Email","Renewal","Trial","General"].includes(category)||
 !["Low","Normal","High"].includes(priority))return errorResponse(400,"Check follow-up person, description, due date and type.");
 try{
  const r=await authenticated(request,["owner","manager","receptionist"],async(client,auth)=>{
   const parent=await client.query(`SELECT id FROM people WHERE id=$1 AND studio_id=$2`,[personId,auth.studioId]);
   if(!parent.rowCount)throw new StudioOperationError(404,"Person not found in this studio.");
   // Open duplicates are rejected by index; avoid repeated tasks from double-clicks.
   const found=await client.query<{id:string}>(`
    SELECT id FROM followup_tasks
    WHERE studio_id=$1 AND person_id=$2 AND title=$3 AND completed_at IS NULL
    LIMIT 1`,[auth.studioId,personId,title]);
   if(found.rowCount)throw new StudioOperationError(409,"An identical open follow-up already exists.");
   const result=await client.query(`
    INSERT INTO followup_tasks(studio_id,person_id,title,due_at,category,priority)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,title,due_at`,
    [auth.studioId,personId,title,dueAt,category,priority]);
   await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action)
     VALUES($1,$2,$3,'followup.created')`,[auth.studioId,personId,auth.userId]);
   return result.rows[0];
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({task:r.value},201);
 }catch(error){
  if((error as {code?:string}).code==="23505")return errorResponse(409,"An identical open follow-up already exists.");
  return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError();
 }
}
