import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {sameOrigin,jsonObject,errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,["owner"],async(client,auth)=>{
   const last=await client.query<{action:string;created_at:Date;details:{status?:string}}>(`
    SELECT action,created_at,details FROM activity_log
    WHERE studio_id=$1 AND action IN('privacy.studio_closure_requested','privacy.studio_closure_withdrawn')
    ORDER BY created_at DESC,id DESC LIMIT 1`,[auth.studioId]);
   const sub=await client.query<{status:string;provider_subscription_id:string|null;current_period_end:Date|null}>(`
    SELECT status,provider_subscription_id,current_period_end FROM subscriptions WHERE studio_id=$1`,[auth.studioId]);
   return {requestedAt:last.rows[0]?.action==="privacy.studio_closure_requested"?last.rows[0].created_at:null,
    status:last.rows[0]?.action==="privacy.studio_closure_requested"?last.rows[0].details?.status:null,
    subscriptionStatus:sub.rows[0]?.status||"inactive",hasProviderSubscription:Boolean(sub.rows[0]?.provider_subscription_id)};
  });
  return r.access.ok?successResponse(r.value):errorResponse(r.access.status,r.access.message);
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 const withdraw=body?.action==="withdraw";
 if(withdraw?body?.confirmation!=="WITHDRAW CLOSURE REQUEST":
     body?.confirmation!=="CLOSE MY STUDIO"||body?.exportAcknowledged!==true)
  return errorResponse(400,"Confirm the closure request or its withdrawal.");
 try{
  const r=await authenticated(request,["owner"],async(client,auth)=>{
   await client.query("SELECT id FROM studios WHERE id=$1 FOR UPDATE",[auth.studioId]);
   const prior=await client.query<{action:string;created_at:Date;details:{status:string}}>(
    "SELECT action,created_at,details FROM activity_log WHERE studio_id=$1 AND action IN('privacy.studio_closure_requested','privacy.studio_closure_withdrawn') ORDER BY created_at DESC,id DESC LIMIT 1",[auth.studioId]);
   if(withdraw){
    if(!prior.rowCount||prior.rows[0].action!=="privacy.studio_closure_requested")return {noActiveRequest:true};
    await client.query("INSERT INTO activity_log(studio_id,actor_id,action,details) VALUES($1,$2,'privacy.studio_closure_withdrawn',$3::jsonb)",
     [auth.studioId,auth.userId,JSON.stringify({withdrawnAt:new Date().toISOString()})]);
    return {withdrawn:true,status:"withdrawn"};
   }
   if(prior.rowCount&&prior.rows[0].action==="privacy.studio_closure_requested")
    return {alreadyRequested:true,status:prior.rows[0].details.status||"pending_verification"};
   const sub=await client.query<{status:string;current_period_end:Date|null;provider_subscription_id:string|null}>(
    "SELECT status,current_period_end,provider_subscription_id FROM subscriptions WHERE studio_id=$1 FOR UPDATE",[auth.studioId]);
   const active=Boolean(sub.rows[0]?.provider_subscription_id)&&(
    ["active","trialing","past_due"].includes(sub.rows[0]?.status||"")||
    !!sub.rows[0]?.current_period_end&&sub.rows[0].current_period_end.getTime()>Date.now());
   const status=active?"billing_action_required":"pending_verification";
   // A request is not deletion. Retain it for operator verification, subscription
   // termination, export confirmation, legal holds and documented erasure.
   await client.query(`INSERT INTO activity_log(studio_id,actor_id,action,details)
     VALUES($1,$2,'privacy.studio_closure_requested',$3::jsonb)`,
     [auth.studioId,auth.userId,JSON.stringify({status,exportAcknowledged:true})]);
   return {alreadyRequested:false,status};
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  if(r.value?.noActiveRequest)return errorResponse(409,"There is no active closure request to withdraw.");
  return successResponse({ok:true,...r.value,
   notice:r.value?.withdrawn?"Your closure request has been withdrawn. Your studio remains active; billing was not changed.":"Closure request recorded. Your workspace and billing have NOT been cancelled or deleted. Contact support for verification and the retention/deletion process."},202);
 }catch{return backendError()}
}
