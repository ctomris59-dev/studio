import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin,jsonObject,stringField} from "@/lib/server/responses";
import {entitlement} from "@/lib/server/billing";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>entitlement(client,auth.studioId));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({subscription:result.value,checkoutConfigured:Boolean(process.env.LEMON_API_KEY&&process.env.LEMON_STORE_ID&&process.env.LEMON_MONTHLY_VARIANT_ID&&process.env.LEMON_ANNUAL_VARIANT_ID&&process.env.LEMON_WEBHOOK_SECRET)});
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const data=await jsonObject(request),plan=data?stringField(data,"plan",12):null;
 if(!["monthly","annual"].includes(plan||""))return errorResponse(400,"Select monthly or annual plan.");
 const key=process.env.LEMON_API_KEY,store=process.env.LEMON_STORE_ID;
 const variant=plan==="annual"?process.env.LEMON_ANNUAL_VARIANT_ID:process.env.LEMON_MONTHLY_VARIANT_ID;
 if(!key||!store||!variant||!process.env.LEMON_WEBHOOK_SECRET)return errorResponse(503,"Secure checkout is not configured.");
 // Live pricing and card details belong to Lemon Squeezy, never our database.
 try{
  // Fail closed on stale Lemon Squeezy variants: published price must match our $49/$468 offer.
  // Lemon's variant.price is kept for backward compatibility in its API.
  const result=await authenticated(request,["owner"],async(_client,auth)=>{
  const verify=await fetch("https://api.lemonsqueezy.com/v1/variants/"+encodeURIComponent(variant!),{
   headers:{Accept:"application/vnd.api+json",Authorization:"Bearer "+key},cache:"no-store",signal:AbortSignal.timeout(8000)
  });
  if(!verify.ok)throw new Error("StudioTasker plan price could not be verified.");
  const config=await verify.json() as {data?:{attributes?:{price?:number;is_subscription?:boolean;interval?:string;interval_count?:number}}};
  const advertised=plan==="annual"?46800:4900;
  if(config.data?.attributes?.price!==advertised||
   config.data?.attributes?.is_subscription!==true||
   config.data?.attributes?.interval!==(plan==="annual"?"year":"month")||
   config.data?.attributes?.interval_count!==1)
   throw new Error("Checkout price does not match $49/month or $468/year. Update provider pricing first.");
   const body={data:{type:"checkouts",attributes:{
    checkout_data:{email:auth.email,custom:{studio_id:auth.studioId}},
    checkout_options:{embed:false},product_options:{enabled_variants:[Number(variant)]}
   },relationships:{store:{data:{type:"stores",id:store}},variant:{data:{type:"variants",id:variant}}}}};
   const res=await fetch("https://api.lemonsqueezy.com/v1/checkouts",{
    method:"POST",headers:{Accept:"application/vnd.api+json","Content-Type":"application/vnd.api+json",
      Authorization:"Bearer "+key},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)
   });
   if(!res.ok)throw new Error("Payment provider checkout unavailable");
   const payload=await res.json() as {data?:{attributes?:{url?:string}}};
   const url=payload.data?.attributes?.url;
   if(!url||!/^https:\/\/[^/]+\.lemonsqueezy\.com\//i.test(url))throw new Error("Unexpected checkout URL");
   return {checkoutUrl:url};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value);
 }catch{return backendError()}
}
