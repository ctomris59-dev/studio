import {NextRequest,NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail,passwordMatches,newSessionToken,tokenHash,loginKey,SESSION_COOKIE} from "@/lib/auth-crypto";
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
  const result=await inTransaction(async client=>{
   // Atomic, durable per-email attempt limiter (5 attempts per 15 minutes).
   const throttle=await client.query<{attempts:number}>(`
    INSERT INTO login_attempts(email_hash,attempts,window_started_at)
    VALUES($1,1,now())
    ON CONFLICT(email_hash) DO UPDATE SET
       attempts=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,
       window_started_at=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END
    RETURNING attempts`,[key]);
   if(throttle.rows[0].attempts>5)return {ok:false as const,rateLimited:true};
   const u=await client.query<{id:string;password_hash:string}>(`SELECT id,password_hash FROM app_users
       WHERE email=$1 AND disabled_at IS NULL LIMIT 1`,[normalizeEmail(email)]);
   const hash=u.rows[0]?.password_hash;
   const matches=hash?await passwordMatches(password,hash):false;
   if(!matches)return {ok:false as const,rateLimited:false};
   const membership=await client.query<{studio_id:string;role:string}>(`
      SELECT studio_id,role FROM studio_users WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1`,[u.rows[0].id]);
   if(!membership.rowCount)return {ok:false as const,rateLimited:false};
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
