import {NextRequest,NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail,passwordMatches,passwordHash,needsPasswordRehash,DUMMY_PASSWORD_HASH,newSessionToken,tokenHash,loginKey,trustedLoginIp,loginIpKey,SESSION_COOKIE,PasswordHashBusyError} from "@/lib/auth-crypto";
import {sessionCookieConfig} from "@/lib/server/auth";
export const runtime="nodejs";
const DEVICE_COOKIE="studiotasker_device";
const DEVICE_MAX_AGE=60*60*24*30;
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
  // Scope proxy-aware throttles to the email/IP pair, not every user
  // who shares the same NAT. Unverified forwarded headers are ignored.
  const ipKey=trusted?loginIpKey("user:"+key+"|"+trusted):null;
  const trustDevice=body.trustDevice===true;
  const deviceToken=request.cookies.get(DEVICE_COOKIE)?.value||"";
  const deviceHash=/^[a-zA-Z0-9_-]{43}$/.test(deviceToken)?tokenHash(deviceToken):null;
  // Claim the attempt and read a candidate hash under a brief transaction.
  // Expensive scrypt work must NEVER retain a database pool connection.
  const attempt=await inTransaction(async client=>{
   let ipBlocked=false;
   if(ipKey){
    const limit=await client.query<{attempts:number}>(`
     INSERT INTO login_ip_attempts(ip_hash,attempts,window_started_at) VALUES($1,1,now())
     ON CONFLICT(ip_hash) DO UPDATE SET
      attempts=CASE WHEN login_ip_attempts.window_started_at<now()-interval '15 minutes' THEN 1 ELSE login_ip_attempts.attempts+1 END,
      window_started_at=CASE WHEN login_ip_attempts.window_started_at<now()-interval '15 minutes' THEN now() ELSE login_ip_attempts.window_started_at END
     RETURNING attempts`,[ipKey]);
    ipBlocked=limit.rows[0].attempts>40;
   }
   const throttle=await client.query<{attempts:number}>(`
    INSERT INTO login_attempts(email_hash,attempts,window_started_at)
    VALUES($1,1,now())
    ON CONFLICT(email_hash) DO UPDATE SET
     attempts=CASE WHEN login_attempts.window_started_at<now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,
     window_started_at=CASE WHEN login_attempts.window_started_at<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END
    RETURNING attempts`,[key]);
   const user=await client.query<{id:string;password_hash:string}>(`SELECT id,password_hash FROM app_users
     WHERE email=$1 AND disabled_at IS NULL AND email_verified_at IS NOT NULL LIMIT 1`,[normalizeEmail(email)]);
   // Email-only lockout is vulnerable to hostile denial of service. A user
   // with a previously enrolled secure device token may verify their real
   // password despite someone else's failures; wrong guesses still get 429.
   let recognized=false;
   if((throttle.rows[0].attempts>5||ipBlocked)&&deviceHash&&user.rowCount){
    const device=await client.query("SELECT 1 FROM auth_trusted_devices WHERE token_hash=$1 AND user_id=$2 AND expires_at>now()",
      [deviceHash,user.rows[0].id]);
    recognized=Boolean(device.rowCount);
   }
   if((throttle.rows[0].attempts>5||ipBlocked)&&!recognized)return {rateLimited:true as const};
   return {rateLimited:false as const,user:user.rows[0]||null,throttled:throttle.rows[0].attempts>5||ipBlocked,recognized};
  });
  if(attempt.rateLimited)return errorResponse(429,"Too many sign-in attempts. Try again later.");
  const candidate=attempt.user;
  const oldHash=candidate?.password_hash||DUMMY_PASSWORD_HASH;
  const matches=await passwordMatches(password,oldHash);
  if(!candidate||!matches)return errorResponse(attempt.throttled?429:401,attempt.throttled?"Too many sign-in attempts. Try again later.":"Invalid email or password.");
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
   // Never enroll shared computers silently. If the checkbox is unchecked,
   // clear an existing device enrollment rather than extending its lifetime.
   const recognizedDevice=attempt.recognized&&deviceHash?deviceHash:null;
   const newDeviceToken=trustDevice&&!recognizedDevice?newSessionToken():null;
   if(trustDevice){
    const activeDeviceHash=recognizedDevice||tokenHash(newDeviceToken!);
    await client.query(`INSERT INTO auth_trusted_devices(token_hash,user_id,expires_at)
      VALUES($1,$2,now()+interval '30 days')
      ON CONFLICT(token_hash) DO UPDATE SET last_used_at=now(),expires_at=now()+interval '30 days'`,
      [activeDeviceHash,candidate.id]);
    await client.query(`DELETE FROM auth_trusted_devices WHERE user_id=$1 AND token_hash NOT IN
      (SELECT token_hash FROM auth_trusted_devices WHERE user_id=$1 ORDER BY last_used_at DESC LIMIT 10)`,[candidate.id]);
   }else if(deviceHash){
    await client.query("DELETE FROM auth_trusted_devices WHERE token_hash=$1 AND user_id=$2",[deviceHash,candidate.id]);
   }
   return {ok:true as const,studioId:membership.rows[0].studio_id,role:membership.rows[0].role,
    deviceToken:trustDevice?(newDeviceToken||deviceToken):null};
  });
  if(!result.ok)return errorResponse(result.rateLimited?429:401,result.rateLimited?"Too many sign-in attempts. Try again later.":"Invalid email or password.");
  const response=NextResponse.json({ok:true,studioId:result.studioId,role:result.role},{headers:{"Cache-Control":"no-store"}});
  response.cookies.set(SESSION_COOKIE,token,sessionCookieConfig());
  response.cookies.set(DEVICE_COOKIE,result.deviceToken||"",{path:"/",maxAge:result.deviceToken?DEVICE_MAX_AGE:0,
   httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
  return response;
 }catch(e){return e instanceof PasswordHashBusyError?errorResponse(429,"Sign-in service is busy. Try again shortly."):backendError()}
}
