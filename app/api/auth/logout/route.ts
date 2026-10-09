import {NextRequest,NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {SESSION_COOKIE,DEVICE_COOKIE,LEGACY_SESSION_COOKIE,LEGACY_DEVICE_COOKIE,tokenHash} from "@/lib/auth-crypto";
import {sameOrigin,errorResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 // Revoke both cookie-name generations so an old session cannot survive logout.
 const sessions=[...new Set([request.cookies.get(SESSION_COOKIE)?.value,
  request.cookies.get(LEGACY_SESSION_COOKIE)?.value].filter((t):t is string=>Boolean(t)))];
 const devices=[...new Set([request.cookies.get(DEVICE_COOKIE)?.value,
  request.cookies.get(LEGACY_DEVICE_COOKIE)?.value]
  .filter((t):t is string=>Boolean(t&&/^[A-Za-z0-9_-]{43}$/.test(t))))];
 if((sessions.length||devices.length)&&!dbIsReady())return errorResponse(503,"Unable to revoke the session and trusted device while the database is unavailable.");
 if((sessions.length||devices.length)&&dbIsReady()){
  try{await inTransaction(async client=>{
   for(const token of sessions)await client.query("UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1",[tokenHash(token)]);
   for(const token of devices)await client.query("DELETE FROM auth_trusted_devices WHERE token_hash=$1",[tokenHash(token)]);
  });}
  catch{return backendError()}
 }
 // Do not clear "cookies" here: that directive also deletes cookies on
 // sibling subdomains, potentially terminating unrelated accounts. Auth and
 // device cookies are expired explicitly below, while origin-local storage
 // and cache are cleared on successful sign-out.
 const response=NextResponse.json({ok:true},{headers:{
  "Cache-Control":"no-store",
  "Clear-Site-Data":'\"cache\", \"storage\"'
 }});
 response.cookies.set(SESSION_COOKIE,"",{path:"/",maxAge:0,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});
 response.cookies.set(DEVICE_COOKIE,"",{path:"/",maxAge:0,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});
 if(SESSION_COOKIE!==LEGACY_SESSION_COOKIE)
  response.cookies.set(LEGACY_SESSION_COOKIE,"",{path:"/",maxAge:0,httpOnly:true,secure:true,sameSite:"lax"});
 if(DEVICE_COOKIE!==LEGACY_DEVICE_COOKIE)
  response.cookies.set(LEGACY_DEVICE_COOKIE,"",{path:"/",maxAge:0,httpOnly:true,secure:true,sameSite:"lax"});
 return response;
}
