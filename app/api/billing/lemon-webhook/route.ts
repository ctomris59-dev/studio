import {NextRequest} from "next/server";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {lemonSignatureValid,parseLemonEvent,applyLemonEvent} from "@/lib/server/billing";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const secret=process.env.LEMON_WEBHOOK_SECRET;
 if(!dbIsReady()||!secret)return errorResponse(503,"Billing webhook unavailable.");
 const text=await request.text();
 if(text.length>200000)return errorResponse(413,"Payload too large.");
 if(!lemonSignatureValid(text,request.headers.get("x-signature"),secret))return errorResponse(401,"Invalid webhook signature.");
 let parsed:unknown;
 try{parsed=JSON.parse(text)}catch{return errorResponse(400,"Malformed payload.")}
 const event=parseLemonEvent(parsed);
 if(!event)return errorResponse(422,"Unsupported subscription event or configuration.");
 if(event.isTestMode&&process.env.BILLING_ALLOW_LOCAL_TEST!=="true")
  return errorResponse(422,"Test transactions cannot activate a live subscription.");
 if(event.isTestMode&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(process.env.PUBLIC_APP_ORIGIN||""))
  return errorResponse(422,"Test events only allowed on localhost.");
 try{
  const result=await inTransaction(async client=>{
   // The event studio_id is protected by the provider HMAC; RLS remains enforced.
   await client.query("SELECT set_config('app.studio_id',$1,true)",[event.studioId]);
   return applyLemonEvent(client,event,text);
  });
  return successResponse({ok:true,...result});
 }catch{return backendError()}
}
