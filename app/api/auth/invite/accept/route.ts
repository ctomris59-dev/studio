import {NextRequest} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validChallengeToken,tokenDigest} from "@/lib/server/challenges";
import {passwordHash,validatePassword} from "@/lib/auth-crypto";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid origin.");
 if(!dbIsReady())return errorResponse(503,"Database unavailable.");
 const body=await jsonObject(request),token=body?.token,password=body?.password;
 if(!validChallengeToken(token)||typeof password!=="string"||!validatePassword(password))
 return errorResponse(400,"Valid invitation and a new password (12–128 characters) required.");
 try{
  const secure=await passwordHash(password);
  const result=await inTransaction(async client=>{
   const challenge=await client.query<{id:string;studio_id:string;member_id:string;email:string}>(`
    SELECT id,studio_id,member_id,email FROM auth_challenges
    WHERE token_hash=$1 AND purpose='member_invitation' AND consumed_at IS NULL AND expires_at>now()
    FOR UPDATE`,[tokenDigest(token)]);
   if(!challenge.rowCount)return {error:"Invitation expired or already used.",status:400};
   const {id,studio_id,member_id,email}=challenge.rows[0];
   const user=await client.query<{id:string}>("SELECT id FROM app_users WHERE email=$1 LIMIT 1",[email]);
   if(user.rowCount)return {error:"An account already exists with this address. Contact the studio owner.",status:409};
   const member=await client.query<{id:string}>(`
    SELECT id FROM people WHERE studio_id=$1 AND id=$2 AND kind='member' AND email=$3
     AND archived_at IS NULL`,[studio_id,member_id,email]);
   if(!member.rowCount)return {error:"Member invitation is no longer valid.",status:409};
   const created=await client.query<{id:string}>(`
    INSERT INTO app_users(email,password_hash,email_verified_at)
    VALUES($1,$2,now()) RETURNING id`,[email,secure]);
   await client.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'member')",[studio_id,created.rows[0].id]);
   await client.query("SELECT set_config('app.studio_id',$1,true)",[studio_id]);
   await client.query("INSERT INTO member_identities(studio_id,person_id,user_id) VALUES($1,$2,$3)",[studio_id,member_id,created.rows[0].id]);
   await client.query("UPDATE auth_challenges SET consumed_at=now() WHERE id=$1",[id]);
   return {ok:true};
  });
  return "error" in result?errorResponse(result.status as number,result.error as string):
   successResponse({ok:true,notice:"Your member account is ready. Sign in to manage your bookings."});
 }catch(e){
  if((e as {code?:string}).code==="23505")return errorResponse(409,"Account or membership already exists.");
  return backendError();
 }
}
