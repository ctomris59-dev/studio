import {NextRequest} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {applyPaddleEvent,parsePaddleSubscriptionEvent} from "@/lib/server/billing";
import {verifyPaddleWebhookSignature} from "@/lib/server/paddle";

export const runtime="nodejs";

export async function POST(request:NextRequest){
 const secret=(process.env.PADDLE_WEBHOOK_SECRET||"").trim();
 if(!dbIsReady()||!secret||!process.env.PADDLE_API_KEY)return errorResponse(503,"Billing webhook unavailable.");
 // Enforce the limit while streaming; Content-Length is client-controlled and may be absent.
 const maxBytes=250000;
 const length=Number(request.headers.get("content-length")||0);
 if(!Number.isFinite(length)||length>maxBytes)return errorResponse(413,"Payload too large.");
 if(!request.body)return errorResponse(400,"Missing webhook body.");
 let raw="";
 try{
  const reader=request.body.getReader(),parts:Uint8Array[]=[];let size=0;
  try{
   while(true){
    const {value,done}=await reader.read();
    if(done)break;
    size+=value.byteLength;
    if(size>maxBytes){await reader.cancel();return errorResponse(413,"Payload too large.")}
    parts.push(value);
   }
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let pos=0;
  for(const part of parts){bytes.set(part,pos);pos+=part.length}
  raw=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
 }catch{return errorResponse(400,"Invalid webhook encoding.");}
 const signature=request.headers.get("paddle-signature")||"";
 if(!signature)return errorResponse(401,"Missing webhook signature.");
 if(!verifyPaddleWebhookSignature(raw,signature,secret))
  return errorResponse(401,"Invalid webhook signature.");
 let verified:unknown;
 try{verified=JSON.parse(raw)}catch{return errorResponse(400,"Invalid JSON payload.");}
 const event=parsePaddleSubscriptionEvent(verified);
 if(!event){
  // A verified event we do not consume must be acknowledged so Paddle does not retry forever.
  return successResponse({ok:true,processed:false,reason:"ignored"});
 }
 if(event.isTestMode){
  if(process.env.PADDLE_ENV==="production")
   return errorResponse(422,"Sandbox transactions cannot activate a live subscription.");
  const enabled=process.env.BILLING_ALLOW_SANDBOX_TEST==="true"||process.env.BILLING_ALLOW_LOCAL_TEST==="true";
  if(!enabled)return errorResponse(422,"Sandbox billing test mode is disabled.");
  const appOrigin=(process.env.PUBLIC_APP_ORIGIN||"").trim();
  const stagingOrigin=(process.env.PADDLE_SANDBOX_ALLOWED_ORIGIN||"").trim();
  const localhost=/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(appOrigin);
  const approvedStaging=Boolean(stagingOrigin&&appOrigin===stagingOrigin&&/^https:\/\//.test(stagingOrigin));
  if(!localhost&&!approvedStaging)
   return errorResponse(422,"Sandbox events are only accepted for the explicitly configured test origin.");
 }
 try{
  const result=await inTransaction(async client=>{
   await client.query("SELECT set_config('app.studio_id',$1,true)",[event.studioId]);
   return applyPaddleEvent(client,event);
  });
  return successResponse({ok:true,...result});
 }catch(error){
  console.error("Paddle webhook apply failed:",error instanceof Error?error.message:"unknown error");
  return backendError();
 }
}
