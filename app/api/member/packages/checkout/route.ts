import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin,jsonObject,stringField} from "@/lib/server/responses";
import {ownMemberId} from "@/lib/server/member-identity";
import {StudioOperationError,validUUID} from "@/lib/server/studio-booking";
import {stripeCall,studioPaymentsReady,validStripeUrl} from "@/lib/server/studio-payments";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid origin.");
 if(!studioPaymentsReady())return errorResponse(503,"Studio payment checkout is not configured.");
 const data=await jsonObject(request),id=data?stringField(data,"packageId",36):null;
 if(!validUUID(id))return errorResponse(400,"Choose an available package.");
 try{
  const r=await authenticated(request,["member"],async(client,auth)=>{
   const memberId=await ownMemberId(client,auth);
   const pack=await client.query<{id:string;name:string;credits:number;price_cents:number;currency:string;valid_days:number}>(`
    SELECT id,name,credits,price_cents,currency,valid_days FROM studio_packages
    WHERE studio_id=$1 AND id=$2 AND active=true FOR SHARE`,[auth.studioId,id]);
   if(!pack.rowCount)throw new StudioOperationError(404,"Package not available.");
   const account=await client.query<{stripe_account_id:string}>("SELECT stripe_account_id FROM studio_payment_accounts WHERE studio_id=$1",[auth.studioId]);
   if(!account.rowCount)throw new StudioOperationError(409,"Studio payment account is not connected.");
   const person=await client.query<{email:string;expiry_date:string|null;credits:number|null;local_today:string}>(`
    SELECT p.email,p.expiry_date::text,p.credits,
     (now() AT TIME ZONE st.timezone)::date::text AS local_today
    FROM people p JOIN studios st ON st.id=p.studio_id
    WHERE p.studio_id=$1 AND p.id=$2 FOR UPDATE OF p`,[auth.studioId,memberId]);
   if(!person.rowCount||!person.rows[0].email)throw new StudioOperationError(409,"Member email is required for secure checkout.");
   if(person.rows[0].credits===null&&person.rows[0].expiry_date&&person.rows[0].expiry_date>=person.rows[0].local_today)
    throw new StudioOperationError(409,"Existing unlimited membership requires staff review.");
   const charge=await stripeCall("/v1/accounts/"+account.rows[0].stripe_account_id);
   if(charge.charges_enabled!==true)throw new StudioOperationError(409,"The studio must complete Stripe payment onboarding.");
   const pending=await client.query<{id:string}>(`
    INSERT INTO member_purchases(studio_id,member_id,package_id,stripe_account_id,amount_cents,currency)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [auth.studioId,memberId,id,account.rows[0].stripe_account_id,pack.rows[0].price_cents,pack.rows[0].currency]);
   const purchaseId=pending.rows[0].id;
   const values=new URLSearchParams({
    mode:"payment","line_items[0][price_data][currency]":pack.rows[0].currency,
    "line_items[0][price_data][unit_amount]":String(pack.rows[0].price_cents),
    "line_items[0][price_data][product_data][name]":pack.rows[0].name,
    "line_items[0][quantity]":"1",
    "customer_email":person.rows[0].email,
    "client_reference_id":purchaseId,
    "metadata[purchase_id]":purchaseId,"metadata[studio_id]":auth.studioId,
    "payment_intent_data[metadata][purchase_id]":purchaseId,
    "payment_intent_data[metadata][studio_id]":auth.studioId,
    "success_url":process.env.PUBLIC_APP_ORIGIN+"/workspace?studioCheckout=return",
    "cancel_url":process.env.PUBLIC_APP_ORIGIN+"/workspace?studioCheckout=cancel"
   });
   const session=await stripeCall("/v1/checkout/sessions",values,account.rows[0].stripe_account_id,"studio-purchase-"+purchaseId);
   if(typeof session.id!=="string"||!/^cs_(test_)?[A-Za-z0-9]+$/.test(session.id)||!validStripeUrl(session.url))
    throw new StudioOperationError(502,"Payment provider returned an unexpected checkout session.");
   await client.query("UPDATE member_purchases SET stripe_session_id=$3 WHERE studio_id=$1 AND id=$2",[auth.studioId,purchaseId,session.id]);
   return {checkoutUrl:session.url,purchaseId};
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse(r.value,201);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
