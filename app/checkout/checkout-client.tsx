"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {useSearchParams} from "next/navigation";
import type {Paddle} from "@paddle/paddle-js";

export default function CheckoutClient(){
 const params=useSearchParams();
 const transactionId=(params.get("_ptxn")||params.get("transaction")||"").trim();
 const paddleRef=useRef<Promise<Paddle|undefined>|null>(null);
 const [status,setStatus]=useState(transactionId?"Loading secure checkout…":"No checkout transaction was supplied.");

 useEffect(()=>{
  if(!transactionId)return;
  const token=(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN||"").trim();
  const declaredEnvironment=process.env.NEXT_PUBLIC_PADDLE_ENV;
  const environment=declaredEnvironment==="production"?"production":"sandbox";
  if(!token||!["sandbox","production"].includes(declaredEnvironment||"")){
   setStatus("Secure checkout is not configured yet.");return
  }
  if((environment==="production")!==token.startsWith("live_")){
   setStatus("Secure checkout environment mismatch. Please contact support.");return
  }
  if(!paddleRef.current){
   paddleRef.current=import("@paddle/paddle-js").then(({initializePaddle})=>initializePaddle({
    token,environment,
    eventCallback:(event)=>{
     if(event.name==="checkout.completed")setStatus("Payment received. Paddle is confirming your subscription.");
     else if(event.name==="checkout.error"||event.name==="checkout.payment.error")setStatus("Checkout could not continue. Please try again.");
    }
   }));
  }
  void paddleRef.current.then(paddle=>{
   if(!paddle){setStatus("Secure checkout could not be initialized.");return}
   setStatus("Secure checkout ready.");
   paddle.Checkout.open({transactionId,settings:{displayMode:"overlay",variant:"one-page",theme:"light",locale:"en",successUrl:"/workspace?billing=success"}});
  }).catch(()=>setStatus("Secure checkout could not be initialized."));
 },[transactionId]);

 return <div className="st-pay-card">
  <strong>{transactionId?"Paddle secure payment":"Start from a StudioTasker plan"}</strong>
  <p role="status">{status}</p>
  {!transactionId&&<Link href="/start">CHOOSE A PLAN →</Link>}
  <small>StudioTasker never stores your card details.</small>
 </div>
}
