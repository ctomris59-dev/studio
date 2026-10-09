import {NextRequest,NextResponse} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {sameOrigin,jsonObject,stringField,errorResponse,backendError} from "@/lib/server/responses";
import {validChallengeToken,tokenDigest} from "@/lib/server/challenges";
import {validUUID} from "@/lib/server/studio-booking";
import {emailIsValid,normalizeEmail,passwordHash,validatePassword,newSessionToken,tokenHash,SESSION_COOKIE} from "@/lib/auth-crypto";
import {sessionCookieConfig} from "@/lib/server/auth";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(!dbIsReady())return errorResponse(503,"Account service unavailable.");
 const body=await jsonObject(request);
 const token=body?.token,studio=body?stringField(body,"studio",40):null,password=body?.password;
 if(!validChallengeToken(token)||!studio||!validUUID(studio)||typeof password!=="string"||!validatePassword(password))
  return errorResponse(400,"The invitation or password is invalid.");
 try{
  // Validate the one-time token with a short transaction before expensive scrypt.
  // Acceptance still rechecks and locks the invitation below to prevent replay.
  const valid=await inTransaction(async client=>{
   await client.query("SELECT set_config('app.studio_id',$1,true)",[studio]);
   const found=await client.query(`SELECT 1 FROM staff_invitations
     WHERE studio_id=$1 AND token_hash=$2 AND accepted_at IS NULL
       AND revoked_at IS NULL AND expires_at>now() LIMIT 1`,[studio,tokenDigest(token)]);
   return Boolean(found.rowCount);
  });
  if(!valid)return errorResponse(400,"Invitation expired or already used.");
  const secured=await passwordHash(password),session=newSessionToken();
  const result=await inTransaction(async client=>{
   // RLS is deliberately scoped to the studio supplied by the signed link;
   // a random 256-bit secret must ALSO match before the invitation can be used.
   await client.query("SELECT set_config('app.studio_id',$1,true)",[studio]);
   const invitation=await client.query<{id:string;email:string;role:string}>(`
    SELECT id,email,role FROM staff_invitations WHERE studio_id=$1 AND token_hash=$2
    AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`,[studio,tokenDigest(token)]);
   if(!invitation.rowCount)return {invalid:true as const};
   const invite=invitation.rows[0];
   const exists=await client.query("SELECT id FROM app_users WHERE email=$1",[invite.email]);
   if(exists.rowCount)return {existing:true as const};
   const user=await client.query<{id:string}>(`
    INSERT INTO app_users(email,password_hash,email_verified_at) VALUES($1,$2,now()) RETURNING id`,[invite.email,secured]);
   await client.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,$3)",[studio,user.rows[0].id,invite.role]);
   await client.query("UPDATE staff_invitations SET accepted_at=now() WHERE id=$1",[invite.id]);
   await client.query("INSERT INTO auth_sessions(token_hash,user_id,studio_id,expires_at) VALUES($1,$2,$3,now()+interval '14 days')",
    [tokenHash(session),user.rows[0].id,studio]);
   return {role:invite.role};
  });
  if(result.invalid)return errorResponse(400,"Invitation expired or already used.");
  if(result.existing)return errorResponse(409,"This email already has an account. Contact the studio owner.");
  const response=NextResponse.json({ok:true,role:result.role},{headers:{"Cache-Control":"no-store"}});
  response.cookies.set(SESSION_COOKIE,session,sessionCookieConfig());
  return response;
 }catch(e){
  if((e as {code?:string}).code==="23505")return errorResponse(409,"This staff account is already registered.");
  return backendError();
 }
}
