import {NextRequest} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validChallengeToken,tokenDigest} from "@/lib/server/challenges";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(!dbIsReady())return errorResponse(503,"Database unavailable.");
 const data=await jsonObject(request),token=data?.token;
 if(!validChallengeToken(token))return errorResponse(400,"Invalid verification token.");
 try{
  const result=await inTransaction(async client=>{
   const record=await client.query<{id:string;user_id:string}>(`
   SELECT id,user_id FROM auth_challenges
   WHERE token_hash=$1 AND purpose='verify_email' AND consumed_at IS NULL AND expires_at>now()
   FOR UPDATE`,[tokenDigest(token)]);
   if(!record.rowCount)return false;
   await client.query("UPDATE app_users SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1",[record.rows[0].user_id]);
   await client.query("UPDATE auth_challenges SET consumed_at=now() WHERE id=$1",[record.rows[0].id]);
   return true;
  });
  return result?successResponse({ok:true,notice:"Email verified. You can sign in."}):errorResponse(400,"Token expired or already used.");
 }catch{return backendError()}
}
