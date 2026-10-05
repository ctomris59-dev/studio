import {NextRequest} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validChallengeToken,tokenDigest} from "@/lib/server/challenges";
import {passwordHash,passwordMatches,validatePassword} from "@/lib/auth-crypto";
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
   // The one-time database challenge has authenticated this studio scope.
   await client.query("SELECT set_config('app.studio_id',$1,true)",[studio_id]);
   const person=await client.query<{id:string;kind:string}>(`
    SELECT id,kind FROM people WHERE studio_id=$1 AND id=$2 AND email=$3
     AND kind IN('member','lead') AND archived_at IS NULL FOR UPDATE`,[studio_id,member_id,email]);
   if(!person.rowCount)return {error:"Member invitation is no longer valid.",status:409};
   const existing=await client.query<{id:string;password_hash:string}>("SELECT id,password_hash FROM app_users WHERE email=$1 LIMIT 1",[email]);
   let userId:string;
   if(existing.rowCount){
    if(!await passwordMatches(password,existing.rows[0].password_hash))return {error:"This email already has StudioTasker access. Enter the existing account password.",status:401};
    userId=existing.rows[0].id;
    const membership=await client.query<{role:string}>("SELECT role FROM studio_users WHERE studio_id=$1 AND user_id=$2",[studio_id,userId]);
    if(membership.rowCount&&membership.rows[0].role!=="member")return {error:"This account already has a staff role in the studio.",status:409};
    await client.query("UPDATE app_users SET email_verified_at=coalesce(email_verified_at,now()) WHERE id=$1",[userId]);
    await client.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'member') ON CONFLICT(studio_id,user_id) DO NOTHING",[studio_id,userId]);
   }else{
    const created=await client.query<{id:string}>(`
     INSERT INTO app_users(email,password_hash,email_verified_at) VALUES($1,$2,now()) RETURNING id`,[email,secure]);
    userId=created.rows[0].id;
    await client.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'member')",[studio_id,userId]);
   }
   if(person.rows[0].kind==="lead")await client.query(`
    UPDATE people SET kind='member',lead_stage='Won',member_status='Active',package_status='Pending',credits=0,
     joined=coalesce(joined,current_date),start_date=coalesce(start_date,current_date),updated_at=now()
    WHERE studio_id=$1 AND id=$2`,[studio_id,member_id]);
   await client.query("INSERT INTO member_identities(studio_id,person_id,user_id) VALUES($1,$2,$3)",[studio_id,member_id,userId]);
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
