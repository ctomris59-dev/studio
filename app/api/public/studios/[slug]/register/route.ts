import {NextRequest} from "next/server";
import type {PoolClient} from "pg";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {findPublicStudio} from "@/lib/server/public-studio";
import {emailIsValid,normalizeEmail,tokenHash} from "@/lib/auth-crypto";
import {newChallenge,queueMessage,publicMailOrigin} from "@/lib/server/challenges";
export const runtime="nodejs";
async function bump(client:PoolClient,key:string,limit:number){
 const r=await client.query<{attempts:number}>(`
  INSERT INTO public_signup_attempts(key_hash,attempts,window_started_at) VALUES($1,1,now())
  ON CONFLICT(key_hash) DO UPDATE SET
   attempts=CASE WHEN public_signup_attempts.window_started_at<now()-interval '1 hour' THEN 1 ELSE public_signup_attempts.attempts+1 END,
   window_started_at=CASE WHEN public_signup_attempts.window_started_at<now()-interval '1 hour' THEN now() ELSE public_signup_attempts.window_started_at END
  RETURNING attempts`,[key]);
 return r.rows[0].attempts<=limit;
}
export async function POST(request:NextRequest,context:{params:Promise<{slug:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(!dbIsReady())return errorResponse(503,"Booking service is not configured.");
 const body=await jsonObject(request),{slug}=await context.params;
 if(!body)return errorResponse(400,"Invalid registration.");
 const name=stringField(body,"name",80),email=stringField(body,"email",160);
 const phone=body.phone===undefined?"":stringField(body,"phone",30);
 const marketingConsent=body.marketingConsent===true,termsAccepted=body.termsAccepted===true;
 const normalized=email?normalizeEmail(email):"",cleanedPhone=(phone||"").replace(/[\s().-]/g,"");
 if(!name||name.length<2||!emailIsValid(normalized)||phone===null||
  cleanedPhone&&!/^\+?[0-9]{7,15}$/.test(cleanedPhone)||!termsAccepted)
  return errorResponse(400,"Provide your name, valid email, optional phone and accept the account terms.");
 try{
  const origin=publicMailOrigin();
  const result=await inTransaction(async client=>{
   const studio=await findPublicStudio(client,slug);
   if(!studio||!studio.public_booking_enabled||!studio.self_signup_enabled)return {notFound:true};
   const emailKey=tokenHash("public-signup:"+studio.id+":"+normalized),studioKey=tokenHash("public-studio:"+studio.id);
   if(!await bump(client,emailKey,5)||!await bump(client,studioKey,60))return {rateLimited:true};
   await client.query("SELECT set_config('app.studio_id',$1,true)",[studio.id]);
   if(process.env.BILLING_ENFORCEMENT==="required"){
    const {entitlement}=await import("@/lib/server/billing");
    if(!(await entitlement(client,studio.id)).enabled)return {notFound:true};
   }
   const existing=await client.query<{id:string;kind:string}>(`
    SELECT id,kind FROM people WHERE studio_id=$1 AND lower(email)=$2 AND archived_at IS NULL LIMIT 1`,[studio.id,normalized]);
   let personId=existing.rows[0]?.id,created=false;
   if(!personId){
    const added=await client.query<{id:string}>(`
     INSERT INTO people(studio_id,kind,full_name,email,phone,member_status,package_status,credits,email_consent,source)
     VALUES($1,'member',$2,$3,$4,'Active','Pending',0,$5,'Public self-registration') RETURNING id`,
     [studio.id,name,normalized,cleanedPhone,marketingConsent]);
    personId=added.rows[0].id;created=true;
   }
   const linked=await client.query("SELECT 1 FROM member_identities WHERE studio_id=$1 AND person_id=$2",[studio.id,personId]);
   if(linked.rowCount)return {accepted:true};
   const recent=await client.query(`SELECT 1 FROM auth_challenges
     WHERE studio_id=$1 AND member_id=$2 AND purpose='member_invitation'
       AND consumed_at IS NULL AND created_at>now()-interval '10 minutes'`,[studio.id,personId]);
   if(recent.rowCount)return {accepted:true};
   const challenge=await newChallenge(client,{purpose:"member_invitation",email:normalized,studioId:studio.id,memberId:personId,hours:24});
   await queueMessage(client,normalized,"member_invitation",{
    url:origin+"/workspace#invite="+encodeURIComponent(challenge.secret),studio:studio.name,memberName:name,selfSignup:true
   });
   await client.query("INSERT INTO activity_log(studio_id,person_id,action,details) VALUES($1,$2,'public.self_signup_requested',$3::jsonb)",
    [studio.id,personId,JSON.stringify({created})]);
   return {accepted:true};
  });
  if("notFound" in result)return errorResponse(404,"Studio self-registration is not available.");
  if("rateLimited" in result)return errorResponse(429,"Too many registration attempts. Try again later.");
  return successResponse({ok:true,notice:"Check your email to finish setting up your member account. If you already have StudioTasker access, you can sign in instead."},202);
 }catch(e){
  if((e as {code?:string}).code==="23505")return successResponse({ok:true,notice:"Check your email or sign in if you already have an account."},202);
  return backendError();
 }
}
