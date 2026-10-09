import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin,jsonObject,stringField} from "@/lib/server/responses";
import {entitlement} from "@/lib/server/billing";
import {hasCurrentLegalAcceptance,legalPayloadIsCurrent,recordLegalAcceptance} from "@/lib/server/legal-audit";
import {LEGAL_ACCEPTANCE_TEXT,LEGAL_PLAN_PRICE_CENTS,LEGAL_VERSIONS,type LegalPlan} from "@/lib/legal-versions";
import {paddleCheckoutConfigured,paddleClient,paddleEnvironment} from "@/lib/server/paddle";

export const runtime="nodejs";

export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const subscription=await entitlement(client,auth.studioId);
   // Serialize queries on one PostgreSQL client (pg disallows concurrent queries).
   const monthly=await hasCurrentLegalAcceptance(client,auth.studioId,auth.userId,"monthly");
   const annual=await hasCurrentLegalAcceptance(client,auth.studioId,auth.userId,"annual");
   const provider=await client.query<{provider:string|null;provider_subscription_id:string|null;provider_customer_id:string|null}>(
    "SELECT provider,provider_subscription_id,provider_customer_id FROM subscriptions WHERE studio_id=$1",[auth.studioId]
   );
   return {subscription,provider:provider.rows[0]||null,legal:{accepted:{monthly,annual},versions:LEGAL_VERSIONS,acceptanceText:LEGAL_ACCEPTANCE_TEXT}};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({...result.value,checkoutConfigured:paddleCheckoutConfigured(),billingProvider:"Paddle"});
 }catch{return backendError()}
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const data=await jsonObject(request),plan=(data?stringField(data,"plan",12):null) as LegalPlan|null;
 if(!plan||!["monthly","annual"].includes(plan))return errorResponse(400,"Select monthly or annual plan.");
 if(!paddleCheckoutConfigured())return errorResponse(503,"Secure Paddle checkout is not configured.");
 const priceId=plan==="annual"?process.env.PADDLE_ANNUAL_PRICE_ID:process.env.PADDLE_MONTHLY_PRICE_ID;
 const clientToken=(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN||"").trim();
 if(!priceId||!clientToken)return errorResponse(503,"Secure Paddle checkout is not configured.");
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const access=await entitlement(client,auth.studioId);
   if(access.enabled)return {alreadyActive:true as const,subscription:access};
   const alreadyAccepted=await hasCurrentLegalAcceptance(client,auth.studioId,auth.userId,plan);
   if(!alreadyAccepted){
    if(!data||!legalPayloadIsCurrent(data))return {legalRequired:true as const};
    await recordLegalAcceptance(client,{request,studioId:auth.studioId,userId:auth.userId,plan,source:"checkout"});
   }

   const paddle=paddleClient();
   const price=await paddle.prices.get(priceId);
   const expected=String(LEGAL_PLAN_PRICE_CENTS[plan]);
   const cycle=price.billingCycle;
   if(price.status!=="active"||price.unitPrice.amount!==expected||price.unitPrice.currencyCode!=="USD"||
    !cycle||cycle.interval!==(plan==="annual"?"year":"month")||cycle.frequency!==1)
    throw new Error("Paddle catalog price does not match the published StudioTasker plan.");

   // Price and tenant binding are created server-side. The browser receives only the resulting transaction id.
   const transaction=await paddle.transactions.create({
    items:[{priceId,quantity:1}],
    customData:{
     studio_id:auth.studioId,
     plan,
     legal_terms_version:LEGAL_VERSIONS.terms,
     legal_dpa_version:LEGAL_VERSIONS.dpa,
     legal_privacy_version:LEGAL_VERSIONS.privacy,
     legal_cancellation_version:LEGAL_VERSIONS.cancellation
    }
   });
   if(!/^txn_[a-z\d]{26}$/.test(transaction.id))throw new Error("Unexpected Paddle transaction id.");
   return {transactionId:transaction.id,clientToken,environment:paddleEnvironment(),plan};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value&&"legalRequired" in result.value)return errorResponse(409,"Accept the current Terms, Cancellation & Refund Policy and DPA before checkout.");
  if(result.value&&"alreadyActive" in result.value)return errorResponse(409,"This studio already has paid access. Use Manage billing for subscription changes.");
  return successResponse(result.value);
 }catch(error){
  console.error("Paddle checkout creation failed:",error instanceof Error?error.message:"unknown error");
  return backendError();
 }
}
