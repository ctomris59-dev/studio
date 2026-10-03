import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validInteger,validUUID,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid package details.");
 const plan=stringField(body,"plan",50),credits=body.credits;
 if(!["5 Class Pack","10 Class Pack","Unlimited Monthly"].includes(plan||"")||
 !validInteger(credits,0,1000))return errorResponse(400,"Select a package and confirmed credit allocation.");
 const {id}=await context.params;
 if(!validUUID(id))return errorResponse(400,"Invalid member identifier.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const m=await client.query<{kind:string;package_status:string|null}>(`
    SELECT kind,package_status FROM people WHERE studio_id=$1 AND id=$2 FOR UPDATE`,
    [auth.studioId,id]);
   if(!m.rowCount||m.rows[0].kind!=="member")throw new StudioOperationError(404,"Member not found.");
   if(m.rows[0].package_status!=="Pending")throw new StudioOperationError(409,"Package is not awaiting confirmation.");
   const finalCredits=plan==="Unlimited Monthly"?null:credits;
   const updated=await client.query(`
     UPDATE people SET package_status='Paid',plan=$3,credits=$4,initial_credits=$5,updated_at=now()
     WHERE studio_id=$1 AND id=$2
     RETURNING id,plan,credits,package_status`,
     [auth.studioId,id,plan,finalCredits,credits]);
   if(finalCredits&&finalCredits>0)await client.query(`
     INSERT INTO credit_ledger(studio_id,member_id,delta,reason,created_by)
     VALUES($1,$2,$3,'package_activation',$4)`,[auth.studioId,id,finalCredits,auth.userId]);
   await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action)
     VALUES($1,$2,$3,'package.manually_confirmed')`,[auth.studioId,id,auth.userId]);
   return updated.rows[0];
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({member:result.value,note:"Manually recorded package confirmation; no payment was verified or collected."});
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
