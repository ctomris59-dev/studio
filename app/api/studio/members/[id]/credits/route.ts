import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validInteger,validUUID,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid adjustment.");
 const {id}=await context.params;
 const delta=body.delta,reason=stringField(body,"reason",200),requestKey=stringField(body,"requestKey",36);
 if(!validUUID(id)||!validInteger(delta,-1000,1000)||delta===0||!reason||reason.length<2||!validUUID(requestKey))
  return errorResponse(400,"Provide a member ID, adjustment of 1–1000 credits, reason and unique request UUID.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const m=await client.query<{kind:string;credits:number|null;package_status:string|null}>(`
     SELECT kind,credits,package_status FROM people
     WHERE studio_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE`,[auth.studioId,id]);
   if(!m.rowCount||m.rows[0].kind!=="member")throw new StudioOperationError(404,"Member not found.");
   const prior=await client.query<{id:string;member_id:string;delta:number;reason:string}>(`
     SELECT id,member_id,delta,reason FROM credit_ledger
     WHERE studio_id=$1 AND request_key=$2 LIMIT 1`,[auth.studioId,requestKey]);
   if(prior.rowCount){
    if(prior.rows[0].member_id!==id||prior.rows[0].delta!==delta||prior.rows[0].reason!==reason)
      throw new StudioOperationError(409,"This request key was already used for a different adjustment.");
    return {credits:m.rows[0].credits,alreadyApplied:true,entryId:prior.rows[0].id};
   }
   if(m.rows[0].package_status!=="Paid"||m.rows[0].credits===null)
    throw new StudioOperationError(409,"Only confirmed class packs with numeric credits can be adjusted.");
   const newCredits=m.rows[0].credits+delta;
   if(newCredits<0||newCredits>1000000)throw new StudioOperationError(409,"Adjustment exceeds available credits or limit.");
   const updated=await client.query<{credits:number}>(`
    UPDATE people SET credits=$3,updated_at=now()
    WHERE studio_id=$1 AND id=$2 RETURNING credits`,[auth.studioId,id,newCredits]);
   const ledger=await client.query<{id:string}>(`
    INSERT INTO credit_ledger(studio_id,member_id,delta,reason,request_key,created_by)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [auth.studioId,id,delta,reason,requestKey,auth.userId]);
   await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action)
    VALUES($1,$2,$3,'credits.adjusted')`,[auth.studioId,id,auth.userId]);
   return {credits:updated.rows[0].credits,alreadyApplied:false,entryId:ledger.rows[0].id};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({adjustment:result.value});
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
