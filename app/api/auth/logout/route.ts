import {NextRequest,NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {SESSION_COOKIE,tokenHash} from "@/lib/auth-crypto";
import {sameOrigin,errorResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const token=request.cookies.get(SESSION_COOKIE)?.value;
 if(token&&dbIsReady()){
  try{await inTransaction(async client=>{await client.query("UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1",[tokenHash(token)]);});}
  catch{return backendError()}
 }
 const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 response.cookies.set(SESSION_COOKIE,"",{path:"/",maxAge:0,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});
 return response;
}
