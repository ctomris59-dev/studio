import {NextRequest,NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail,passwordMatches,passwordHash,needsPasswordRehash,DUMMY_PASSWORD_HASH,newSessionToken,tokenHash,loginKey,trustedLoginIp,loginIpKey,SESSION_COOKIE,PasswordHashBusyError} from "@/lib/auth-crypto";
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
  // Claim the attempt and read a candidate hash under a brief transaction.
  // Expensive scrypt work must NEVER retain a database pool connection.
  const attempt=await inTransaction(async client=>{
   if(ipKey){
    const limit=await client.query<{attempts:number}>(`
     INSERT INTO login_ip_attempts(ip_hash,attempts,window_started_at) VALUES($1,1,now())
     ON CONFLICT(ip_hash) DO UPDATE SET
      attempts=CASE WHEN login_ip_attempts.window_started_at<now()-interval '15 minutes' THEN 1 ELSE login_ip_attempts.attempts+1 END,
      window_started_at=CASE WHEN login_ip_attempts.window_started_at<now()-interval '15 minutes' THEN now() ELSE login_ip_attempts.window_started_at END
     RETURNING attempts`,[ipKey]);
    if(limit.rows[0].attempts>40)return {rateLimited:true as const};
   }
   const throttle=await client.query<{attempts:number}>(`
    INSERT INTO login_attempts(email_hash,attempts,window_started_at)
    VALUES($1,1,now())
    ON CONFLICT(email_hash) DO UPDATE SET
     attempts=CASE WHEN login_attempts.window_started_at<now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,
     window_started_at=CASE WHEN login_attempts.window_started_at<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END
    RETURNING attempts`,[key]);
   // Correct and incorrect guesses are blocked identically after the limit.
   if(throttle.rows[0].attempts>5)return {rateLimited:true as const};
   const user=await client.query<{id:string;password_hash:string}>(`SELECT id,password_hash FROM app_users
     WHERE email=$1 AND disabled_at IS NULL AND email_verified_at IS NOT NULL LIMIT 1`,[normalizeEmail(email)]);
   return {rateLimited:false as const,user:user.rows[0]||null};
  });
  if(attempt.rateLimited)return errorResponse(429,"Too many sign-in attempts. Try again later.");
  const candidate=attempt.user;
  const oldHash=candidate?.password_hash||DUMMY_PASSWORD_HASH;
  const matches=await passwordMatches(password,oldHash);
  if(!candidate||!matches)return errorResponse(401,"Invalid email or password.");
  const replacement=needsPasswordRehash(oldHash)?await passwordHash(password):null;
  // Re-read the verified user and role after hashing so revoked memberships,
  // disabled accounts and concurrent password resets cannot create sessions.
  const result=await inTransaction(async client=>{
   const active=await client.query<{id:string}>(`SELECT id FROM app_users
     WHERE id=$1 AND email=$2 AND password_hash=$3 AND disabled_at IS NULL
       AND email_verified_at IS NOT NULL LIMIT 1`,
       [candidate.id,normalizeEmail(email),oldHash]);
   if(!active.rowCount)return {ok:false as const,rateLimited:false};
   const membership=await client.query<{studio_id:string;role:string}>(`
     SELECT studio_id,role FROM studio_users WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1`,[candidate.id]);
   if(!membership.rowCount)return {ok:false as const,rateLimited:false};
   if(replacement)await client.query("UPDATE app_users SET password_hash=$2 WHERE id=$1 AND password_hash=$3",
     [candidate.id,replacement,oldHash]);
   await client.query("UPDATE login_attempts SET attempts=0,window_started_at=now() WHERE email_hash=$1",[key]);
   await client.query(`INSERT INTO auth_sessions(token_hash,user_id,studio_id,expires_at)
      VALUES($1,$2,$3,now()+interval '14 days')`,[tokenHash(token),candidate.id,membership.rows[0].studio_id]);
   return {ok:true as const,studioId:membership.rows[0].studio_id,role:membership.rows[0].role};
  });
  if(!result.ok)return errorResponse(result.rateLimited?429:401,result.rateLimited?"Too many sign-in attempts. Try again later.":"Invalid email or password.");
  const response=NextResponse.json({ok:true,studioId:result.studioId,role:result.role},{headers:{"Cache-Control":"no-store"}});
  response.cookies.set(SESSION_COOKIE,token,sessionCookieConfig());
  return response;
 }catch(e){return e instanceof PasswordHashBusyError?errorResponse(429,"Sign-in service is busy. Try again shortly."):backendError()}
}
