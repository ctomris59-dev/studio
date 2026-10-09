import {verifyPublicChallenge} from "@/lib/server/turnstile";
import {publicAbuseGuard} from "@/lib/server/public-abuse";
import {NextRequest} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail} from "@/lib/auth-crypto";
import {newChallenge,queueMessage,publicMailOrigin} from "@/lib/server/challenges";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(!dbIsReady())return errorResponse(503,"Database unavailable.");
 const data=await jsonObject(request),email=data?stringField(data,"email",160):null;
 if(!email||!emailIsValid(normalizeEmail(email)))return errorResponse(400,"Enter a valid email.");
 const budget=await publicAbuseGuard(request,"password-reset",email);
 if(budget)return budget;
 const verification=await verifyPublicChallenge(request,data||{});
 if(verification)return verification;
 try{
  const origin=publicMailOrigin();
  await inTransaction(async client=>{
   const u=await client.query<{id:string}>(`
    SELECT id FROM app_users WHERE email=$1 AND email_verified_at IS NOT NULL AND disabled_at IS NULL
    LIMIT 1`,[normalizeEmail(email)]);
   if(!u.rowCount)return;
   const recent=await client.query(`
    SELECT 1 FROM auth_challenges WHERE user_id=$1 AND purpose='password_reset'
      AND created_at>now()-interval '5 minutes' LIMIT 1`,[u.rows[0].id]);
   if(recent.rowCount)return;
   const challenge=await newChallenge(client,{purpose:"password_reset",email,userId:u.rows[0].id,hours:1});
   await queueMessage(client,email,"password_reset",{url:origin+"/workspace#reset="+encodeURIComponent(challenge.secret)});
  });
  return successResponse({ok:true,notice:"If this address belongs to a verified account, reset instructions will be sent."});
 }catch{return backendError()}
}
