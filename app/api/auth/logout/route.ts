import {NextRequest,NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {SESSION_COOKIE,tokenHash} from "@/lib/auth-crypto";
import {sameOrigin,errorResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const token=request.cookies.get(SESSION_COOKIE)?.value;
 const deviceToken=request.cookies.get("studiotasker_device")?.value;
 const deviceHash=deviceToken&&/^[A-Za-z0-9_-]{43}$/.test(deviceToken)?tokenHash(deviceToken):null;
 if((token||deviceHash)&&!dbIsReady())return errorResponse(503,"Unable to revoke the session and trusted device while the database is unavailable.");
 if((token||deviceHash)&&dbIsReady()){
  try{await inTransaction(async client=>{
   if(token)await client.query("UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1",[tokenHash(token)]);
   if(deviceHash)await client.query("DELETE FROM auth_trusted_devices WHERE token_hash=$1",[deviceHash]);
  });}
  catch{return backendError()}
 }
 const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 response.cookies.set(SESSION_COOKIE,"",{path:"/",maxAge:0,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});
 response.cookies.set("studiotasker_device","",{path:"/",maxAge:0,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});
 return response;
}
