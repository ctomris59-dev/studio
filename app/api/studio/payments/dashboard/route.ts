import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {stripeCall,studioPaymentsReady,validStripeUrl} from "@/lib/server/studio-payments";
import {StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid origin.");
 if(!studioPaymentsReady())return errorResponse(503,"Stripe Connect is not configured.");
 try{
  const res=await authenticated(request,["owner"],async(client,auth)=>{
   const row=await client.query<{stripe_account_id:string}>(
    "SELECT stripe_account_id FROM studio_payment_accounts WHERE studio_id=$1",[auth.studioId]);
   if(!row.rowCount)throw new StudioOperationError(409,"Connect a payment account first.");
   const link=await stripeCall("/v1/accounts/"+row.rows[0].stripe_account_id+"/login_links",new URLSearchParams());
   if(!validStripeUrl(link.url))throw new StudioOperationError(502,"Untrusted Stripe dashboard link.");
   return {dashboardUrl:link.url};
  });
  if(!res.access.ok)return errorResponse(res.access.status,res.access.message);
  return successResponse(res.value);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
