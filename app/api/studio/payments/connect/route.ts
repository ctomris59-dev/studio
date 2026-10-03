import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,backendError,successResponse,jsonObject,sameOrigin,stringField} from "@/lib/server/responses";
import {stripeCall,studioPaymentsReady,validStripeUrl} from "@/lib/server/studio-payments";
import {StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
const permitted=["US","GB","CA","AU","DE","FR","IT","ES","IE","NL","BE","AT","PT","FI","SE","NO","DK","PL","CH"];
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const q=await client.query<{stripe_account_id:string;country:string}>("SELECT stripe_account_id,country FROM studio_payment_accounts WHERE studio_id=$1",[auth.studioId]);
   if(!q.rowCount)return {connected:false,configured:studioPaymentsReady(),chargesEnabled:false};
   if(!studioPaymentsReady())return {connected:true,configured:false,chargesEnabled:false,country:q.rows[0].country};
   const details=await stripeCall("/v1/accounts/"+q.rows[0].stripe_account_id);
   return {connected:true,configured:true,chargesEnabled:details.charges_enabled===true,
    detailsSubmitted:details.details_submitted===true,country:q.rows[0].country};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid origin.");
 if(!studioPaymentsReady())return errorResponse(503,"Stripe Connect is not yet enabled.");
 const data=await jsonObject(request);
 const country=data?stringField(data,"country",2)?.toUpperCase():null;
 if(!country||!permitted.includes(country))return errorResponse(400,"Choose an available Stripe Connect onboarding country.");
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const record=await client.query<{stripe_account_id:string;country:string}>(
    "SELECT stripe_account_id,country FROM studio_payment_accounts WHERE studio_id=$1 FOR UPDATE",[auth.studioId]);
   let account=record.rows[0]?.stripe_account_id;
   if(account&&record.rows[0].country!==country)throw new StudioOperationError(409,"Connected account country cannot be changed.");
   if(!account){
    // Express managed onboarding; no customer payment details enter StudioTasker.
    const fields=new URLSearchParams({type:"express",country,email:auth.email,
     "capabilities[card_payments][requested]":"true","capabilities[transfers][requested]":"true"});
    const created=await stripeCall("/v1/accounts",fields,undefined,"studio-connect-"+auth.studioId);
    if(typeof created.id!=="string"||!/^acct_[A-Za-z0-9]+$/.test(created.id))throw new StudioOperationError(502,"Unexpected payment account.");
    account=created.id;
    await client.query("INSERT INTO studio_payment_accounts(studio_id,stripe_account_id,country) VALUES($1,$2,$3)",
     [auth.studioId,account,country]);
   }
   const origin=process.env.PUBLIC_APP_ORIGIN!;
   const link=await stripeCall("/v1/account_links",new URLSearchParams({
    account,type:"account_onboarding",refresh_url:origin+"/workspace?connect=retry",
    return_url:origin+"/workspace?connect=return"}));
   if(!validStripeUrl(link.url))throw new StudioOperationError(502,"Untrusted account onboarding URL.");
   return {onboardingUrl:link.url,country};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
