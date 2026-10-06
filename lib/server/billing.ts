import "server-only";
import type {PoolClient} from "pg";

export type Entitlement={enabled:boolean;status:string;plan:string;periodEnd:string|null;graceEndsAt:string|null};
export async function entitlement(client:PoolClient,studioId:string):Promise<Entitlement>{
 const r=await client.query<{status:string;plan:string;current_period_end:Date|null;is_test_mode:boolean;provider_updated_at:Date|null}>(`
 SELECT status,plan,current_period_end,is_test_mode,provider_updated_at FROM subscriptions WHERE studio_id=$1 LIMIT 1`,[studioId]);
 if(!r.rowCount)return {enabled:false,status:"inactive",plan:"none",periodEnd:null,graceEndsAt:null};
 const row=r.rows[0],end=row.current_period_end,updated=row.provider_updated_at;
 const periodEnd=end?end.toISOString():null;
 const allowTest=process.env.BILLING_ALLOW_LOCAL_TEST==="true"&&
  /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(process.env.PUBLIC_APP_ORIGIN||"");
 const testAllowed=!row.is_test_mode||allowTest;
 const periodValid=!!end&&end.getTime()>Date.now();
 const graceMs=72*60*60*1000;
 const graceEnd=updated?new Date(updated.getTime()+graceMs):null;
 const pastDueGrace=row.status==="past_due"&&!!graceEnd&&graceEnd.getTime()>Date.now();
 const enabled=testAllowed&&((periodValid&&["active","trialing","cancelled"].includes(row.status))||pastDueGrace);
 return {enabled,status:row.status,plan:row.plan,periodEnd,graceEndsAt:pastDueGrace&&graceEnd?graceEnd.toISOString():null};
}

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const text=(v:unknown)=>typeof v==="string"?v:"";
const date=(v:unknown)=>typeof v==="string"&&Number.isFinite(Date.parse(v))?new Date(v):null;
const uuid=(v:unknown):v is string=>typeof v==="string"&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v);

export type PaddleSubscriptionEvent={
 eventId:string;
 eventType:string;
 studioId:string;
 providerId:string;
 customerId:string;
 updatedAt:Date;
 plan:"monthly"|"annual";
 status:"active"|"trialing"|"past_due"|"cancelled";
 periodEnd:Date|null;
 isTestMode:boolean;
 priceId:string;
};

export function parsePaddleSubscriptionEvent(raw:unknown):PaddleSubscriptionEvent|null{
 if(!object(raw))return null;
 const eventId=text(raw.eventId||raw.event_id),eventType=text(raw.eventType||raw.event_type);
 if(!/^evt_[a-z\d]{26}$/.test(eventId))return null;
 const supported=new Set([
  "subscription.created","subscription.updated","subscription.activated","subscription.trialing",
  "subscription.past_due","subscription.paused","subscription.resumed","subscription.canceled"
 ]);
 if(!supported.has(eventType)||!object(raw.data))return null;
 const data=raw.data;
 const providerId=text(data.id),customerId=text(data.customerId||data.customer_id);
 if(!/^sub_[a-z\d]{26}$/.test(providerId)||!/^ctm_[a-z\d]{26}$/.test(customerId))return null;
 const custom=object(data.customData)?data.customData:object(data.custom_data)?data.custom_data:null;
 const studioId=custom?text(custom.studio_id):"";
 if(!uuid(studioId))return null;
 const items=Array.isArray(data.items)?data.items:[];
 const configured=[process.env.PADDLE_MONTHLY_PRICE_ID,process.env.PADDLE_ANNUAL_PRICE_ID].filter(Boolean) as string[];
 let priceId="";
 for(const item of items){
  if(!object(item))continue;
  const price=object(item.price)?item.price:null,id=price?text(price.id):text(item.priceId||item.price_id);
  if(configured.includes(id)){priceId=id;break}
 }
 if(!priceId)return null;
 const plan=priceId===process.env.PADDLE_MONTHLY_PRICE_ID?"monthly":
  priceId===process.env.PADDLE_ANNUAL_PRICE_ID?"annual":null;
 if(!plan)return null;
 const rawStatus=text(data.status);
 const mapped=rawStatus==="paused"?"past_due":rawStatus==="canceled"?"cancelled":rawStatus;
 if(!["active","trialing","past_due","cancelled"].includes(mapped))return null;
 const updatedAt=date(data.updatedAt||data.updated_at)||date(raw.occurredAt||raw.occurred_at);
 if(!updatedAt)return null;
 const billing=object(data.currentBillingPeriod)?data.currentBillingPeriod:object(data.current_billing_period)?data.current_billing_period:null;
 const periodEnd=billing?date(billing.endsAt||billing.ends_at):null;
 const isTestMode=process.env.PADDLE_ENV!=="production";
 return {eventId,eventType,studioId,providerId,customerId,updatedAt,plan,
  status:mapped as PaddleSubscriptionEvent["status"],periodEnd,isTestMode,priceId};
}

export async function applyPaddleEvent(client:PoolClient,event:PaddleSubscriptionEvent){
 const inserted=await client.query(`
 INSERT INTO billing_events(provider,event_id)
 VALUES('paddle',$1) ON CONFLICT DO NOTHING RETURNING event_id`,[event.eventId]);
 if(!inserted.rowCount)return {processed:false,reason:"duplicate"};
 const existing=await client.query<{provider_subscription_id:string|null;provider_updated_at:Date|null;status:string}>(`
 SELECT provider_subscription_id,provider_updated_at,status FROM subscriptions
 WHERE studio_id=$1 FOR UPDATE`,[event.studioId]);
 if(!existing.rowCount)throw new Error("Unknown studio subscription");
 const old=existing.rows[0];
 const replaceable=["inactive","cancelled","expired"].includes(old.status);
 if(old.provider_subscription_id&&old.provider_subscription_id!==event.providerId&&!replaceable)
  throw new Error("Unexpected Paddle subscription identity for studio");
 if(old.provider_updated_at&&old.provider_updated_at>=event.updatedAt)
  return {processed:false,reason:"stale"};
 await client.query(`
 UPDATE subscriptions SET provider='paddle',provider_subscription_id=$2,provider_customer_id=$3,
  status=$4,plan=$5,current_period_end=$6,provider_updated_at=$7,is_test_mode=$8,
  provider_price_id=$9,provider_variant_id=NULL,customer_portal_url=NULL,updated_at=now()
 WHERE studio_id=$1`,[
  event.studioId,event.providerId,event.customerId,event.status,event.plan,event.periodEnd?.toISOString()||null,
  event.updatedAt.toISOString(),event.isTestMode,event.priceId
 ]);
 await client.query("UPDATE billing_events SET processed_at=now() WHERE provider='paddle' AND event_id=$1",[event.eventId]);
 return {processed:true,reason:"updated"};
}
