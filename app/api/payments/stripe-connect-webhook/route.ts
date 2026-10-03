import {NextRequest} from "next/server";
import {dbIsReady} from "@/lib/server/database";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {parseStripeEvent,stripeWebhookValid,settleStudioPurchase,stripeCall,studioPaymentsReady} from "@/lib/server/studio-payments";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!dbIsReady()||!studioPaymentsReady())return errorResponse(503,"Member payment verification is not configured.");
 const contentLength=Number(request.headers.get("content-length")||0);
 if(contentLength>262144)return errorResponse(413,"Webhook too large.");
 const raw=await request.text();
 if(!stripeWebhookValid(raw,request.headers.get("stripe-signature"),process.env.STRIPE_CONNECT_WEBHOOK_SECRET!))
  return errorResponse(401,"Invalid payment signature.");
 let data:unknown;
 try{data=JSON.parse(raw)}catch{return errorResponse(400,"Invalid webhook data.");}
 const event=parseStripeEvent(data);
 if(!event)return errorResponse(422,"Unsupported payment event.");
 if(!["checkout.session.completed","checkout.session.async_payment_succeeded","charge.refunded","charge.dispute.created"].includes(event.type))
  return successResponse({processed:false,reason:"ignored"});
 try{
  // Refund events can omit Checkout metadata; retrieve authenticated payment intent
  // in the connected account instead of trusting or guessing a member reference.
  if(event.type.startsWith("charge.")){
   const object=event.data.object;
   const chargeId=event.type==="charge.dispute.created"?object.charge:object.id;
   if(typeof chargeId!=="string"||!/^ch_[A-Za-z0-9]+$/.test(chargeId))return errorResponse(422,"Missing related charge.");
   const charge=event.type==="charge.refunded"?object:
    await stripeCall("/v1/charges/"+chargeId,undefined,event.account);
   if(typeof charge.payment_intent!=="string")return errorResponse(422,"Missing payment intent.");
   const intent=await stripeCall("/v1/payment_intents/"+charge.payment_intent,undefined,event.account);
   event.data.object={...object,payment_intent:charge.payment_intent,metadata:intent.metadata||{}};
  }
  const result=await settleStudioPurchase(event);
  return successResponse({ok:true,...result});
 }catch{return backendError()}
}
