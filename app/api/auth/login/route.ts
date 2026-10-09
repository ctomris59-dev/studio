import {NextRequest,NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail,passwordMatches,passwordHash,needsPasswordRehash,DUMMY_PASSWORD_HASH,newSessionToken,tokenHash,loginKey,trustedLoginIp,loginIpKey,SESSION_COOKIE} from "@/lib/auth-crypto";
import {sessionCookieConfig} from "@/lib/server/auth";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(!dbIsReady())return errorResponse(503,"Workspace backend is not configured.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid request.");
 const email=stringField(body,"email",160),password=stringField(body,"password",128);
 if(!email||!emailIsValid(normalizeEmail(email))||!password)return errorResponse(401,"Invalid email or password.");
 try{
  const key=loginKey(email),token=newSessionToken();
  const trusted=trustedLoginIp(request.headers.get("x-real-ip"));
  const ipKey=trusted?loginIpKey(trusted):null;
  const result=await inTransaction(async client=>{
   // Independent IP-based cap when a verified reverse proxy overwrites the remote address.
   if(ipKey){
    const limit=await client.query<{attempts:number}>(`
     INSERT INTO login_ip_attempts(ip_hash,attempts,window_started_at) VALUES($1,1,now())
     ON CONFLICT(ip_hash) DO UPDATE SET
      attempts=CASE WHEN login_ip_attempts.window_started_at<now()-interval '15 minutes' THEN 1 ELSE login_ip_attempts.attempts+1 END,
      window_started_at=CASE WHEN login_ip_attempts.window_started_at<now()-interval '15 minutes' THEN now() ELSE login_ip_attempts.window_started_at END
     RETURNING attempts`,[ipKey]);
    if(limit.rows[0].attempts>40)return {ok:false as const,rateLimited:true};
   }
   // Atomic, durable per-email attempt limiter (5 attempts per 15 minutes).
   const throttle=await client.query<{attempts:number}>(`
    INSERT INTO login_attempts(email_hash,attempts,window_started_at)
    VALUES($1,1,now())
    ON CONFLICT(email_hash) DO UPDATE SET
       attempts=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,
       window_started_at=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END
    RETURNING attempts`,[key]);
   // Never lock out a legitimate owner because an attacker guessed their email.
   // A valid password can pass this email-only throttle; invalid guesses remain limited.
   const emailExceeded=throttle.rows[0].attempts>5;
   const u=await client.query<{id:string;password_hash:string}>(`SELECT id,password_hash FROM app_users
       WHERE email=$1 AND disabled_at IS NULL AND email_verified_at IS NOT NULL LIMIT 1`,[normalizeEmail(email)]);
   const hash=u.rows[0]?.password_hash||DUMMY_PASSWORD_HASH;
   // Unknown accounts still run the expensive password check to limit enumeration.
   const matches=await passwordMatches(password,hash);
   if(!u.rowCount||!matches)return {ok:false as const,rateLimited:emailExceeded};
   const membership=await client.query<{studio_id:string;role:string}>(`
      SELECT studio_id,role FROM studio_users WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1`,[u.rows[0].id]);
   if(!membership.rowCount)return {ok:false as const,rateLimited:false};
   if(needsPasswordRehash(hash)){
    await client.query("UPDATE app_users SET password_hash=$2 WHERE id=$1 AND password_hash=$3",
      [u.rows[0].id,await passwordHash(password),hash]);
   }
   await client.query("UPDATE login_attempts SET attempts=0,window_started_at=now() WHERE email_hash=$1",[key]);
   await client.query(`INSERT INTO auth_sessions(token_hash,user_id,studio_id,expires_at)
      VALUES($1,$2,$3,now()+interval '14 days')`,[tokenHash(token),u.rows[0].id,membership.rows[0].studio_id]);
   return {ok:true as const,studioId:membership.rows[0].studio_id,role:membership.rows[0].role};
  });
  if(!result.ok)return errorResponse(result.rateLimited?429:401,result.rateLimited?"Too many sign-in attempts. Try again later.":"Invalid email or password.");
  const response=NextResponse.json({ok:true,studioId:result.studioId,role:result.role},{headers:{"Cache-Control":"no-store"}});
  response.cookies.set(SESSION_COOKIE,token,sessionCookieConfig());
  return response;
 }catch{return backendError()}
}
