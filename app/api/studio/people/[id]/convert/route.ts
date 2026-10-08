import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {validUUID,StudioOperationError} from "@/lib/server/studio-booking";
import {sameOrigin,errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const {id}=await params;if(!validUUID(id))return errorResponse(400,"Invalid contact ID.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const prior=await client.query<{kind:string}>(`
    SELECT kind FROM people WHERE studio_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE`,[auth.studioId,id]);
   if(!prior.rowCount)throw new StudioOperationError(404,"Lead not found.");
   if(prior.rows[0].kind==="member")return {id,alreadyConverted:true};
   if(prior.rows[0].kind!=="lead")throw new StudioOperationError(409,"Only leads can be converted.");
   await client.query(`UPDATE people SET kind='member',lead_stage='Won',member_status='Active',
    package_status='Pending',credits=0,initial_credits=0,updated_at=now()
    WHERE studio_id=$1 AND id=$2`,[auth.studioId,id]);
   await client.query("INSERT INTO activity_log(studio_id,person_id,actor_id,action) VALUES($1,$2,$3,'lead.converted_to_member')",
    [auth.studioId,id,auth.userId]);
   return {id,alreadyConverted:false};
  });
  return result.access.ok?successResponse({contact:result.value}):errorResponse(result.access.status,result.access.message);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
