import {NextRequest} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validChallengeToken,tokenDigest} from "@/lib/server/challenges";
import {passwordHash,validatePassword,loginKey} from "@/lib/auth-crypto";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(!dbIsReady())return errorResponse(503,"Database unavailable.");
 const data=await jsonObject(request),token=data?.token,password=data?.password;
 if(!validChallengeToken(token)||typeof password!=="string"||!validatePassword(password))
 return errorResponse(400,"Invalid token or password (12–128 characters).");
 try{
  const secured=await passwordHash(password);
  const changed=await inTransaction(async client=>{
   const challenge=await client.query<{id:string;user_id:string}>(`
    SELECT id,user_id FROM auth_challenges
    WHERE token_hash=$1 AND purpose='password_reset' AND consumed_at IS NULL AND expires_at>now()
    FOR UPDATE`,[tokenDigest(token)]);
   if(!challenge.rowCount)return false;
   const id=challenge.rows[0].user_id;
   await client.query("UPDATE app_users SET password_hash=$2,password_changed_at=now() WHERE id=$1",[id,secured]);
   await client.query("UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[id]);
   await client.query("DELETE FROM auth_trusted_devices WHERE user_id=$1",[id]);
   const identity=await client.query<{email:string}>("SELECT email FROM app_users WHERE id=$1",[id]);
   if(identity.rowCount)await client.query("UPDATE login_attempts SET attempts=0,window_started_at=now() WHERE email_hash=$1",[loginKey(identity.rows[0].email)]);
   await client.query("UPDATE auth_challenges SET consumed_at=now() WHERE id=$1",[challenge.rows[0].id]);
   return true;
  });
  return changed?successResponse({ok:true,notice:"Password updated. All previous sessions have been signed out."}):errorResponse(400,"Token expired or already used.");
 }catch{return backendError()}
}
