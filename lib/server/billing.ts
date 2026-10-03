import "server-only";
import {createHmac,timingSafeEqual,createHash} from "node:crypto";
import type {PoolClient} from "pg";

export type Entitlement={enabled:boolean;status:string;plan:string;periodEnd:string|null};
export async function entitlement(client:PoolClient,studioId:string):Promise<Entitlement>{
 const r=await client.query<{status:string;plan:string;current_period_end:Date|null;is_test_mode:boolean}>(`
 SELECT status,plan,current_period_end,is_test_mode FROM subscriptions WHERE studio_id=$1 LIMIT 1`,[studioId]);
 if(!r.rowCount)return {enabled:false,status:"inactive",plan:"none",periodEnd:null};
 const row=r.rows[0],end=row.current_period_end;
 const periodEnd=end?end.toISOString():null;
 const allowTest=process.env.BILLING_ALLOW_LOCAL_TEST==="true"&&
  /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(process.env.PUBLIC_APP_ORIGIN||"");
 const periodValid=!!end&&end.getTime()>Date.now();
 const enabled=periodValid&&["active","trialing","cancelled"].includes(row.status)&&(!row.is_test_mode||allowTest);
 return {enabled,status:row.status,plan:row.plan,periodEnd};
}
export function lemonSignatureValid(body:string,signature:string|null,secret:string):boolean{
 if(!secret||!signature||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=createHmac("sha256",secret).update(body,"utf8").digest();
 const provided=Buffer.from(signature,"hex");
 return expected.length===provided.length&&timingSafeEqual(expected,provided);
}
const val=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const datetime=(v:unknown)=>typeof v==="string"&&Number.isFinite(Date.parse(v))?new Date(v):null;
const validUUID=(v:unknown):v is string=>
 typeof v==="string"&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v);
export type LemonEvent={
 studioId:string;providerId:string;updatedAt:Date;plan:"monthly"|"annual";
 status:"active"|"trialing"|"past_due"|"cancelled"|"expired";
 periodEnd:Date|null;isTestMode:boolean;variantId:string;eventName:string;
};
export function parseLemonEvent(raw:unknown):LemonEvent|null{
 if(!val(raw)||!val(raw.meta)||!val(raw.meta.custom_data)||!val(raw.data)||!val(raw.data.attributes))return null;
 const attrs=raw.data.attributes,custom=raw.meta.custom_data;
 const eventName=raw.meta.event_name;
 if(!["subscription_created","subscription_updated","subscription_cancelled","subscription_expired","subscription_resumed","subscription_paused","subscription_unpaused"].includes(String(eventName)))return null;
 if(raw.data.type!=="subscriptions")return null;
 const variantId=String(attrs.variant_id??""),storeId=String(attrs.store_id??"");
 const monthly=process.env.LEMON_MONTHLY_VARIANT_ID,annual=process.env.LEMON_ANNUAL_VARIANT_ID;
 const store=process.env.LEMON_STORE_ID;
 if(!store||storeId!==store||!monthly||!annual)return null;
 const plan=variantId===monthly?"monthly":variantId===annual?"annual":null;
 if(!plan||!validUUID(custom.studio_id)||!/^\d{1,30}$/.test(String(raw.data.id)))return null;
 if(typeof attrs.test_mode!=="boolean")return null;
 const updatedAt=datetime(attrs.updated_at);
 if(!updatedAt)return null;
 const status=String(attrs.status);
 if(!["active","on_trial","past_due","cancelled","expired","unpaid","paused"].includes(status))return null;
 const mappedStatus=status==="on_trial"?"trialing":status==="unpaid"||status==="paused"?"past_due":status;
 const periodEnd=datetime(
  status==="cancelled"||status==="expired"?attrs.ends_at:
  status==="on_trial"?attrs.trial_ends_at:attrs.renews_at
 );
 return {studioId:custom.studio_id,providerId:String(raw.data.id),updatedAt,plan,
  status:mappedStatus as LemonEvent["status"],periodEnd,isTestMode:attrs.test_mode,variantId,eventName:String(eventName)};
}
export async function applyLemonEvent(client:PoolClient,event:LemonEvent,rawBody:string){
 const eventId=createHash("sha256").update(rawBody).digest("hex");
 const result=await client.query(`
 INSERT INTO billing_events(provider,event_id)
 VALUES('lemon_squeezy',$1) ON CONFLICT DO NOTHING RETURNING event_id`,[eventId]);
 if(!result.rowCount)return {processed:false,reason:"duplicate"};
 const existing=await client.query<{provider_subscription_id:string|null;provider_updated_at:Date|null}>(`
 SELECT provider_subscription_id,provider_updated_at FROM subscriptions
 WHERE studio_id=$1 FOR UPDATE`,[event.studioId]);
 if(!existing.rowCount)throw new Error("Unknown studio subscription");
 if(existing.rows[0].provider_subscription_id&&existing.rows[0].provider_subscription_id!==event.providerId)
  throw new Error("Unexpected subscription identity for studio");
 if(existing.rows[0].provider_updated_at&&existing.rows[0].provider_updated_at>=event.updatedAt)
  return {processed:false,reason:"stale"};
 await client.query(`
 UPDATE subscriptions SET provider='lemon_squeezy',provider_subscription_id=$2,
  status=$3,plan=$4,current_period_end=$5,provider_updated_at=$6,
  is_test_mode=$7,provider_variant_id=$8,updated_at=now()
 WHERE studio_id=$1`,
 [event.studioId,event.providerId,event.status,event.plan,event.periodEnd?.toISOString()||null,
 event.updatedAt.toISOString(),event.isTestMode,event.variantId]);
 await client.query("UPDATE billing_events SET processed_at=now() WHERE provider='lemon_squeezy' AND event_id=$1",[eventId]);
 return {processed:true,reason:"updated"};
}
