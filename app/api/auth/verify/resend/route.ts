import {publicAbuseGuard} from "@/lib/server/public-abuse";
import {NextRequest} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {sameOrigin,jsonObject,stringField,errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {normalizeEmail,emailIsValid} from "@/lib/auth-crypto";
import {newChallenge,queueMessage,publicMailOrigin} from "@/lib/server/challenges";
export const runtime="nodejs";
// Generic responses prevent account enumeration. Per-email budget limits accidental mail floods.
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(!dbIsReady())return errorResponse(503,"Account service unavailable.");
 const data=await jsonObject(request),raw=data?stringField(data,"email",160):null;
 if(!raw||!emailIsValid(normalizeEmail(raw)))return errorResponse(400,"Enter a valid email.");
 const budget=await publicAbuseGuard(request,"verify-resend",raw);
 if(budget)return budget;
 try{
  const email=normalizeEmail(raw),origin=publicMailOrigin();
  await inTransaction(async client=>{
   const users=await client.query<{id:string}>("SELECT id FROM app_users WHERE email=$1 AND email_verified_at IS NULL AND disabled_at IS NULL LIMIT 1",[email]);
   if(!users.rowCount)return;
   const id=users.rows[0].id;
   // Serialize requests for a given account to avoid double sends.
   await client.query("SELECT id FROM app_users WHERE id=$1 FOR UPDATE",[id]);
   const quota=await client.query<{recent:number;today:number}>(`
    SELECT count(*) FILTER(WHERE created_at>now()-interval '10 minutes')::int AS recent,
      count(*) FILTER(WHERE created_at>now()-interval '24 hours')::int AS today
    FROM auth_challenges WHERE user_id=$1 AND purpose='verify_email'`,[id]);
   if(quota.rows[0].recent>0||quota.rows[0].today>=5)return;
   const challenge=await newChallenge(client,{purpose:"verify_email",email,userId:id,hours:24});
   await queueMessage(client,email,"verify_email",{url:origin+"/workspace#verify="+encodeURIComponent(challenge.secret)});
  });
  return successResponse({ok:true,notice:"If this address belongs to an unverified account, a new verification link will be sent."});
 }catch{return backendError()}
}
