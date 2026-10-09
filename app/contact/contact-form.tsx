"use client";
import {FormEvent, useEffect, useRef, useState} from "react";
import Link from "next/link";

const SUPPORT_EMAIL="support@studiotasker.com";

export default function ContactForm(){
 const [state,setState]=useState<"idle"|"sending"|"sent"|"error">("idle");
 const [status,setStatus]=useState("");
 const [deliveryAvailable,setDeliveryAvailable]=useState<boolean|null>(null);
 useEffect(()=>{
  let cancelled=false;
  void fetch("/api/contact",{cache:"no-store"}).then(r=>r.json()).then(data=>{if(!cancelled)setDeliveryAvailable(data.deliveryAvailable===true)}).catch(()=>{if(!cancelled)setDeliveryAvailable(false)});
  return ()=>{cancelled=true};
 },[]);
 const startedAt=useRef(Date.now());

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(state==="sending"||deliveryAvailable!==true)return;
  setState("sending");setStatus("");
  const form=e.currentTarget;
  const data=new FormData(form);
  const payload={
   name:String(data.get("name")||""),
   email:String(data.get("email")||""),
   studio:String(data.get("studio")||""),
   topic:String(data.get("topic")||"Product question"),
   message:String(data.get("message")||""),
   website:String(data.get("website")||""),
   startedAt:startedAt.current
  };
  try{
   const response=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(typeof result.error==="string"?result.error:"Unable to send your message.");
   setState("sent");
   setStatus("Message sent. We’ll reply to your email as soon as we can.");
   form.reset();
   startedAt.current=Date.now();
  }catch(error){
   setState("error");
   setStatus(error instanceof Error?error.message:"Unable to send your message.");
  }
 }

 return <div className="ct-form-card">
  <div className="ct-form-head"><span>SEND A MESSAGE</span><b>{SUPPORT_EMAIL}</b></div>
  {deliveryAvailable===false?<section role="status" className="ct-status"><p>Our web contact form is currently unavailable. To ensure we receive your message, please email us directly.</p><p><a href={"mailto:"+SUPPORT_EMAIL+"?subject=StudioTasker%20enquiry"}>Open your email app</a> · {SUPPORT_EMAIL}</p><p>No message has been submitted through this page.</p></section>:<form onSubmit={submit}>
   <input className="ct-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
   <div className="ct-fields">
    <label><span>Your name *</span><input name="name" type="text" autoComplete="name" required maxLength={100} placeholder="Alex Morgan"/></label>
    <label><span>Email *</span><input name="email" type="email" autoComplete="email" required maxLength={160} placeholder="alex@yourstudio.com"/></label>
    <label><span>Studio name</span><input name="studio" type="text" autoComplete="organization" maxLength={120} placeholder="Your Studio"/></label>
    <label><span>Topic</span><select name="topic" defaultValue="Product question"><option>Product question</option><option>Pricing / annual plan</option><option>Account / sign in</option><option>Setup / migration</option><option>Billing</option><option>Feedback</option><option>Other</option></select></label>
    <label className="ct-message"><span>Message *</span><textarea name="message" required minLength={10} maxLength={5000} rows={5} placeholder="How can we help?"/></label>
   </div>
   <button type="submit" disabled={state==="sending"||deliveryAvailable!==true}>{state==="sending"?"SENDING…":"SEND MESSAGE"} <span>↗</span></button>
   {deliveryAvailable===null&&<p role="status">Checking secure message delivery…</p>}
   <p className="ct-form-note">Your message is used to answer your enquiry. Review our <Link href="/legal/privacy">Privacy Policy</Link> for retention and contact details.</p>
   {status&&<p className={"ct-status "+(state==="sent"?"is-success":"is-error")} role="status">{status}{state==="error"&&<> <a href={"mailto:"+SUPPORT_EMAIL}>Email us directly.</a></>}</p>}
  </form>}
 </div>
}
