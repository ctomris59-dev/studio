import {NextRequest} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {applyPaddleEvent,parsePaddleSubscriptionEvent} from "@/lib/server/billing";
import {verifyPaddleWebhookSignature} from "@/lib/server/paddle";

export const runtime="nodejs";

export async function POST(request:NextRequest){
 const secret=(process.env.PADDLE_WEBHOOK_SECRET||"").trim();
 if(!dbIsReady()||!secret||!process.env.PADDLE_API_KEY)return errorResponse(503,"Billing webhook unavailable.");
 const raw=await request.text();
 if(raw.length>250000)return errorResponse(413,"Payload too large.");
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
 if(event.isTestMode&&process.env.BILLING_ALLOW_LOCAL_TEST!=="true")
  return errorResponse(422,"Sandbox transactions cannot activate a live subscription.");
 if(event.isTestMode&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(process.env.PUBLIC_APP_ORIGIN||""))
  return errorResponse(422,"Sandbox events are only accepted in explicit localhost test mode.");
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
