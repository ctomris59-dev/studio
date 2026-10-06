import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {paddleClient,paddleCheckoutConfigured} from "@/lib/server/paddle";

export const runtime="nodejs";

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(!paddleCheckoutConfigured())return errorResponse(503,"Billing management is not configured.");
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const found=await client.query<{provider:string|null;provider_customer_id:string|null;provider_subscription_id:string|null}>(
    "SELECT provider,provider_customer_id,provider_subscription_id FROM subscriptions WHERE studio_id=$1 LIMIT 1",[auth.studioId]
   );
   const row=found.rows[0];
   if(!row||row.provider!=="paddle"||!row.provider_customer_id||!row.provider_subscription_id)
    return {missing:true as const};
   const session=await paddleClient().customerPortalSessions.create(row.provider_customer_id,[row.provider_subscription_id]);
   const url=session.urls.general.overview;
   const parsed=new URL(url);
   if(parsed.protocol!=="https:"||!(parsed.hostname==="paddle.com"||parsed.hostname.endsWith(".paddle.com")))
    throw new Error("Unexpected Paddle portal URL");
   return {url};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value&&"missing" in result.value)return errorResponse(404,"No Paddle subscription is available for this studio yet.");
  return successResponse(result.value);
 }catch(error){
  console.error("Paddle portal creation failed:",error instanceof Error?error.message:"unknown error");
  return backendError();
 }
}
