import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
import type {PoolClient} from "pg";
import {StudioOperationError,validUUID} from "./studio-booking";
import {inTransaction} from "./database";
import {queueMessage} from "./challenges";
const fail=(status:number,message:string):never=>{throw new StudioOperationError(status,message)};
const accountPattern=/^acct_[a-zA-Z0-9]+$/;
export const currencies=["usd","eur","gbp","cad","aud"] as const;
const origin=()=>process.env.PUBLIC_APP_ORIGIN||"";
const testMode=()=>process.env.BILLING_ALLOW_LOCAL_TEST==="true"&&
 /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin());
export function studioPaymentsReady():boolean{
 return process.env.STRIPE_STUDIO_PAYMENTS_ENABLED==="true"&&
 Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_CONNECT_WEBHOOK_SECRET)&&
 (origin().startsWith("https://")||testMode());
}
export type StudioPackage={id:string;name:string;description:string;price_cents:number;currency:string;credits:number;valid_days:number;active:boolean};
export async function stripeCall(path:string,values?:URLSearchParams,account?:string,idempotency?:string):Promise<Record<string,unknown>>{
 if(!studioPaymentsReady())fail(503,"Studio payments are not configured.");
 if(account&&!accountPattern.test(account))fail(400,"Invalid connected payment account.");
 const stub=process.env.STRIPE_STUDIO_PAYMENTS_TEST_BASE_URL;
 const base=testMode()&&stub&&/^http:\/\/127\.0\.0\.1:\d+$/.test(stub)?stub:"https://api.stripe.com";
 const response=await fetch(base+path,{
  method:values?"POST":"GET",
  headers:{Authorization:"Bearer "+process.env.STRIPE_SECRET_KEY,
   ...(values?{"Content-Type":"application/x-www-form-urlencoded"}:{}),
   ...(account?{"Stripe-Account":account}:{}),
   ...(idempotency?{"Idempotency-Key":idempotency}:{})},
  body:values?.toString(),signal:AbortSignal.timeout(10000),cache:"no-store"
 });
 const obj=await response.json().catch(()=>({})) as Record<string,unknown>;
 if(!response.ok)fail(502,"Payment provider rejected the request. No purchase was activated.");
 return obj;
}
export function validStripeUrl(url:unknown):url is string{
 if(typeof url!=="string")return false;
 try{const u=new URL(url);return u.protocol==="https:"&&
  (u.hostname==="checkout.stripe.com"||u.hostname==="connect.stripe.com"||u.hostname==="billing.stripe.com"||
  // Only in CI, using a local mock provider.
  (testMode()&&u.hostname==="127.0.0.1"));
 }catch{return false}
}
export function stripeWebhookValid(raw:string,header:string|null,secret:string,now=Math.floor(Date.now()/1000)):boolean{
 if(!secret||!header||raw.length>262144)return false;
 const parts=header.split(",").map(part=>part.trim().split("="));
 const t=parts.find(([k])=>k==="t")?.[1];
 const signatures=parts.filter(([k])=>k==="v1").map(([,v])=>v);
 if(!t||!/^\d{10}$/.test(t)||Math.abs(now-Number(t))>300||!signatures.length)return false;
 const expected=createHmac("sha256",secret).update(t+"."+raw).digest();
 return signatures.some(v=>{
  if(!v||!/^[0-9a-f]{64}$/i.test(v))return false;
  const received=Buffer.from(v,"hex");
  return received.length===expected.length&&timingSafeEqual(received,expected);
 });
}
export type StripeEvent={id:string;type:string;account:string;livemode:boolean;data:{object:Record<string,unknown>}};
export function parseStripeEvent(raw:unknown):StripeEvent|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const e=raw as Record<string,unknown>;
 if(typeof e.id!=="string"||!/^evt_[a-zA-Z0-9]+$/.test(e.id)||
 typeof e.type!=="string"||typeof e.account!=="string"||!accountPattern.test(e.account)||
 typeof e.livemode!=="boolean"||!e.data||typeof e.data!=="object")return null;
 const data=e.data as Record<string,unknown>,obj=data.object;
 if(!obj||typeof obj!=="object"||Array.isArray(obj))return null;
 return {id:e.id,type:e.type,account:e.account,livemode:e.livemode,data:{object:obj as Record<string,unknown>}};
}
export async function settleStudioPurchase(event:StripeEvent){
 const obj=event.data.object;
 const metadata=obj.metadata;
 const meta=metadata&&typeof metadata==="object"?metadata as Record<string,unknown>:null;
 // Session events carry the immutable purchase reference; refunds are resolved by payment intent.
 const purchaseId=event.type.startsWith("checkout.")?String(obj.client_reference_id||""):String(meta?.purchase_id||"");
 const studioId=String(meta?.studio_id||"");
 if(!validUUID(purchaseId)||!validUUID(studioId))return {processed:false,reason:"unrelated"};
 if(event.livemode!==(!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")))return {processed:false,reason:"mode_mismatch"};
 return inTransaction(async client=>{
  // Never trust metadata for authorization: all tenant + account + amount checks follow.
  await client.query("SELECT set_config('app.studio_id',$1,true)",[studioId]);
  const acc=await client.query<{stripe_account_id:string}>("SELECT stripe_account_id FROM studio_payment_accounts WHERE studio_id=$1",[studioId]);
  if(!acc.rowCount||acc.rows[0].stripe_account_id!==event.account)return {processed:false,reason:"unknown_account"};
  const purchase=await client.query<{id:string;member_id:string;package_id:string;amount_cents:number;currency:string;status:string;stripe_account_id:string;stripe_session_id:string|null}>(`
   SELECT id,member_id,package_id,amount_cents,currency,status,stripe_account_id,stripe_session_id
   FROM member_purchases WHERE studio_id=$1 AND id=$2 FOR UPDATE`,[studioId,purchaseId]);
  if(!purchase.rowCount)return {processed:false,reason:"unknown_purchase"};
  const p=purchase.rows[0];
  if(p.stripe_account_id!==event.account)return {processed:false,reason:"account_mismatch"};
  const inserted=await client.query("INSERT INTO studio_payment_events(studio_id,stripe_event_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING stripe_event_id",[studioId,event.id]);
  if(!inserted.rowCount)return {processed:false,reason:"duplicate"};
  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
   if(obj.object!=="checkout.session"||obj.mode!=="payment"||obj.payment_status!=="paid"||
    typeof obj.id!=="string"||!/^cs_(test_)?[A-Za-z0-9]+$/.test(obj.id)||
    obj.amount_total!==p.amount_cents||obj.currency!==p.currency||
    (p.stripe_session_id!==null&&p.stripe_session_id!==obj.id)){
    return {processed:false,reason:"mismatch"};
   }
   if(p.status!=="pending")return {processed:false,reason:"already_settled"};
   const pkg=await client.query<{name:string;credits:number;valid_days:number}>(`
    SELECT name,credits,valid_days FROM studio_packages WHERE studio_id=$1 AND id=$2`,[studioId,p.package_id]);
   if(!pkg.rowCount)throw new Error("Purchased package missing.");
   const person=await client.query<{credits:number|null;expiry_date:string|null;member_status:string|null}>(`
    SELECT credits,expiry_date::text,member_status FROM people
    WHERE studio_id=$1 AND id=$2 AND kind='member' FOR UPDATE`,[studioId,p.member_id]);
   if(!person.rowCount)throw new Error("Member missing.");
   const local=await client.query<{local_day:string}>(
    "SELECT (now() AT TIME ZONE timezone)::date::text AS local_day FROM studios WHERE id=$1",[studioId]);
   const localToday=local.rows[0]?.local_day;
   if(person.rows[0].credits===null&&person.rows[0].expiry_date&&person.rows[0].expiry_date>=localToday)
    throw new Error("Existing unlimited access requires staff review.");
   // Renew from later of current expiry or today, regardless of remaining credits.
   const row=await client.query<{expiry_date:string}>(`
    UPDATE people SET credits=coalesce(credits,0)+$3,initial_credits=coalesce(initial_credits,0)+$3,
     plan=$4,package_status='Paid',member_status='Active',
     start_date=coalesce(start_date,$6::date),
     expiry_date=greatest(coalesce(expiry_date,$6::date),$6::date)+($5::integer),
     updated_at=now()
    WHERE studio_id=$1 AND id=$2 RETURNING expiry_date::text`,
    [studioId,p.member_id,pkg.rows[0].credits,pkg.rows[0].name,pkg.rows[0].valid_days,localToday]);
   await client.query("INSERT INTO credit_ledger(studio_id,member_id,delta,reason,purchase_id) VALUES($1,$2,$3,'stripe_package_purchase',$4)",
    [studioId,p.member_id,pkg.rows[0].credits,p.id]);
   await client.query("UPDATE member_purchases SET status='paid',stripe_session_id=$3,stripe_payment_intent_id=$4,fulfilled_at=now() WHERE studio_id=$1 AND id=$2",
    [studioId,p.id,obj.id,typeof obj.payment_intent==="string"?obj.payment_intent:null]);
   await client.query("INSERT INTO activity_log(studio_id,person_id,action,details) VALUES($1,$2,'package.payment_verified',$3::jsonb)",
    [studioId,p.member_id,JSON.stringify({purchaseId:p.id,packageId:p.package_id,expiry:row.rows[0].expiry_date})]);
   const mail=await client.query<{email:string;studio_name:string}>(`SELECT p.email,s.name AS studio_name
    FROM people p JOIN studios s ON s.id=p.studio_id WHERE p.studio_id=$1 AND p.id=$2`,[studioId,p.member_id]);
   if(mail.rows[0]?.email)await queueMessage(client,mail.rows[0].email,"package_payment_confirmed",{
    studioName:mail.rows[0].studio_name,packName:pkg.rows[0].name,
    credits:pkg.rows[0].credits,expiryDate:row.rows[0].expiry_date
   });
   return {processed:true,reason:"paid"};
  }
  // Refunds/disputes require human reconciliation, and immediately block NEW bookings.
  if(event.type==="charge.refunded"||event.type==="charge.dispute.created"){
   if(p.status!=="paid")return {processed:false,reason:"not_paid"};
   const intent=obj.payment_intent;
   if(typeof intent!=="string"||!p.stripe_session_id) return {processed:false,reason:"missing_intent"};
   const matches=await client.query("SELECT 1 FROM member_purchases WHERE studio_id=$1 AND id=$2 AND stripe_payment_intent_id=$3",
    [studioId,p.id,intent]);
   if(!matches.rowCount)return {processed:false,reason:"intent_mismatch"};
   await client.query("UPDATE member_purchases SET status=$3,revoked_at=now() WHERE studio_id=$1 AND id=$2",
    [studioId,p.id,event.type==="charge.refunded"?"refunded":"disputed"]);
   // Remove unspent refunded credits immediately; do not leave them usable on a later renewal.
   // If credits were already used, zero is the safe floor and a human must reconcile.
   const pack=await client.query<{credits:number}>("SELECT credits FROM studio_packages WHERE studio_id=$1 AND id=$2",[studioId,p.package_id]);
   const member=await client.query<{credits:number|null}>("SELECT credits FROM people WHERE studio_id=$1 AND id=$2 FOR UPDATE",[studioId,p.member_id]);
   const available=member.rows[0]?.credits;
   const toReverse=typeof available==="number"?Math.min(available,pack.rows[0]?.credits||0):0;
   await client.query("UPDATE people SET credits=CASE WHEN credits IS NULL THEN NULL ELSE greatest(0,credits-$3::int) END,member_status='Paused',package_status='Pending',updated_at=now() WHERE studio_id=$1 AND id=$2",
    [studioId,p.member_id,toReverse]);
   if(toReverse>0)await client.query("INSERT INTO credit_ledger(studio_id,member_id,delta,reason) VALUES($1,$2,$3,'stripe_payment_reversal')",
    [studioId,p.member_id,-toReverse]);
   await client.query("INSERT INTO activity_log(studio_id,person_id,action,details) VALUES($1,$2,'package.payment_review_required',$3::jsonb)",
    [studioId,p.member_id,JSON.stringify({purchaseId:p.id,reason:event.type,creditsReversed:toReverse,manualReview:true})]);
   const mail=await client.query<{email:string;studio_name:string}>(`SELECT p.email,s.name AS studio_name
    FROM people p JOIN studios s ON s.id=p.studio_id WHERE p.studio_id=$1 AND p.id=$2`,[studioId,p.member_id]);
   if(mail.rows[0]?.email)await queueMessage(client,mail.rows[0].email,"package_payment_review",{
    studioName:mail.rows[0].studio_name
   });
   return {processed:true,reason:"review_required"};
  }
  return {processed:false,reason:"ignored"};
 });
}
