"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import type {Paddle} from "@paddle/paddle-js";
import {LEGAL_ACCEPTANCE_TEXT,LEGAL_VERSIONS,type LegalPlan} from "../../lib/legal-versions";

type BillingState={
 subscription:{enabled:boolean;status:string;plan:string;periodEnd:string|null;graceEndsAt:string|null};
 provider:{provider:string|null;provider_subscription_id:string|null;provider_customer_id:string|null}|null;
 legal:{accepted:Record<LegalPlan,boolean>;versions:typeof LEGAL_VERSIONS;acceptanceText:string};
 checkoutConfigured:boolean;
 billingProvider:string;
};

export function BillingPanel({initialPlan}:{initialPlan:LegalPlan|null}){
 const [state,setState]=useState<BillingState|null>(null);
 const [plan,setPlan]=useState<LegalPlan>(initialPlan||"monthly");
 const [accepted,setAccepted]=useState(false);
 const [busy,setBusy]=useState(false);
 const [note,setNote]=useState("");
 const paddleRef=useRef<Promise<Paddle|undefined>|null>(null);

 async function load(){
  const res=await fetch("/api/studio/subscription",{credentials:"same-origin",cache:"no-store"});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(body.error||"Could not load subscription status.");
  setState(body);
 }
 useEffect(()=>{void load().catch(e=>setNote(e instanceof Error?e.message:"Could not load subscription status."))},[]);
 useEffect(()=>{setAccepted(false)},[plan]);

 async function startCheckout(){
  if(!state?.checkoutConfigured){setNote("Secure Paddle checkout is not configured yet.");return}
  const alreadyAccepted=Boolean(state.legal.accepted[plan]);
  if(!alreadyAccepted&&!accepted){setNote("Review and accept the current legal terms before checkout.");return}
  setBusy(true);setNote("");
  try{
   const res=await fetch("/api/studio/subscription",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
     plan,legalAccepted:alreadyAccepted||accepted,
     termsVersion:LEGAL_VERSIONS.terms,dpaVersion:LEGAL_VERSIONS.dpa,
     privacyVersion:LEGAL_VERSIONS.privacy,cancellationVersion:LEGAL_VERSIONS.cancellation
    })
   });
   const body=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(body.error||"Could not start secure checkout.");
   if(!paddleRef.current){
    paddleRef.current=import("@paddle/paddle-js").then(({initializePaddle})=>initializePaddle({
     token:body.clientToken,
     environment:body.environment==="sandbox"?"sandbox":"production"
    }));
   }
   const paddle=await paddleRef.current;
   if(!paddle)throw new Error("Paddle checkout could not be initialized.");
   paddle.Checkout.open({
    transactionId:body.transactionId,
    settings:{displayMode:"overlay",variant:"one-page",theme:"light",locale:"en",successUrl:"/workspace?billing=success"}
   });
   setNote("Secure checkout opened with Paddle. Access activates only after a verified Paddle webhook confirms the subscription.");
  }catch(e){setNote(e instanceof Error?e.message:"Could not start checkout.")}
  finally{setBusy(false)}
 }

 async function manageBilling(){
  setBusy(true);setNote("");
  try{
   const res=await fetch("/api/studio/subscription/portal",{method:"POST",credentials:"same-origin"});
   const body=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(body.error||"Could not open billing management.");
   window.location.assign(body.url);
  }catch(e){setNote(e instanceof Error?e.message:"Could not open billing management.");setBusy(false)}
 }

 const currentAccepted=Boolean(state?.legal.accepted[plan]);
 const hasPaddleSubscription=state?.provider?.provider==="paddle"&&Boolean(state.provider.provider_subscription_id);
 return <section className="rd-billing-panel" aria-labelledby="billing-title">
  <div className="rd-section-head"><div><p className="rd-eyebrow">SUBSCRIPTION & BILLING</p><h2 id="billing-title">StudioTasker plan</h2>
   <p>Checkout, payment-card processing, transaction taxes, invoices and refunds are handled by Paddle as Merchant of Record.</p></div></div>
  {note&&<p className="rd-feedback" role="status">{note}</p>}
  {!state?<p className="rd-tiny">Loading billing status…</p>:<>
   <div className="rd-billing-status"><b>Status: {state.subscription.status}</b><span>Plan: {state.subscription.plan}</span>
    {state.subscription.periodEnd&&<span>Current period ends: {new Date(state.subscription.periodEnd).toLocaleDateString()}</span>}
    {state.subscription.graceEndsAt&&<span>Payment-recovery grace until: {new Date(state.subscription.graceEndsAt).toLocaleString()}</span>}
   </div>
   {hasPaddleSubscription?<div className="rd-contact-actions">
    <button type="button" className="rd-primary" disabled={busy} onClick={()=>void manageBilling()}>{busy?"Opening…":"Manage billing in Paddle"}</button>
    <button type="button" disabled={busy} onClick={()=>void load().catch(e=>setNote(e instanceof Error?e.message:"Refresh failed"))}>Refresh subscription status</button>
   </div>:<>
    <label>Choose plan<select value={plan} onChange={e=>setPlan(e.target.value as LegalPlan)}><option value="monthly">Monthly · $39.90/month</option><option value="annual">Annual · $406.80/year · save 15%</option></select></label>
    {!currentAccepted&&<><label className="rd-legal-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>{LEGAL_ACCEPTANCE_TEXT} <Link href="/legal/terms" target="_blank">Terms</Link> · <Link href="/legal/cancellation" target="_blank">Cancellation & Refund</Link> · <Link href="/legal/dpa" target="_blank">DPA</Link></span></label><p className="rd-tiny">Privacy information is provided separately in the <Link href="/legal/privacy" target="_blank">Privacy Policy</Link> and <Link href="/legal/turkiye-privacy" target="_blank">Türkiye Privacy Notice (KVKK)</Link>; checkout does not request consent for core contractual processing.</p></>}
    <button type="button" className="rd-primary" disabled={busy||!state.checkoutConfigured||(!currentAccepted&&!accepted)} onClick={()=>void startCheckout()}>{busy?"Preparing secure checkout…":plan==="annual"?"Continue to Paddle · $406.80/year":"Continue to Paddle · $39.90/month"}</button>
    {!state.checkoutConfigured&&<p className="rd-tiny">Live payment is intentionally disabled until Paddle credentials, approved prices and the webhook secret are configured.</p>}
   </>}
  </>}
 </section>;
}
