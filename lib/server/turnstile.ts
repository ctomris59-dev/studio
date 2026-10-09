import "server-only";
import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {trustedLoginIp} from "../auth-crypto";

type Verification={success?:boolean;hostname?:string;"error-codes"?:string[]};
function response(status:number,message:string){
 return NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
}
// The challenge cannot be trusted merely because a browser submits a token.
// Verify once against Cloudflare's HTTPS siteverify service on the server.
export async function verifyPublicChallenge(request:NextRequest,body:Record<string,unknown>){
 if(process.env.TURNSTILE_REQUIRED!=="true")return null;
 const secret=process.env.TURNSTILE_SECRET_KEY;
 const site=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
 if(!secret||!site)return response(503,"Bot verification is not configured.");
 const token=body.turnstileToken;
 if(typeof token!=="string"||token.length<16||token.length>2048)
  return response(403,"Complete the bot verification challenge.");
 const data=new URLSearchParams({secret,response:token});
 const trusted=trustedLoginIp(request.headers.get("x-real-ip"));
 if(trusted)data.set("remoteip",trusted);
 try{
  const answer=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
   method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:data.toString(),cache:"no-store",signal:AbortSignal.timeout(5000)
  });
  if(!answer.ok)return response(503,"Bot verification is temporarily unavailable.");
  const verified=await answer.json() as Verification;
  if(!verified.success)return response(403,"Bot verification was unsuccessful. Please try again.");
  const expected=process.env.TURNSTILE_ALLOWED_HOSTNAMES?.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)||[];
  if(expected.length&&!expected.includes(String(verified.hostname||"").toLowerCase()))
   return response(403,"Bot verification hostname mismatch.");
  return null;
 }catch{return response(503,"Bot verification is temporarily unavailable.")}
}
