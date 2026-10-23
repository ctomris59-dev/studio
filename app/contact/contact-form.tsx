"use client";
import {FormEvent, useEffect, useRef, useState} from "react";
import Link from "next/link";
import {TurnstileChallenge} from "../../components/turnstile-challenge";

const SUPPORT_EMAIL="support@studiotasker.com";

// When the server deliberately disables direct delivery (for example on Vercel
// without SMTP/database), preserve the full typed enquiry in a mailto draft.
function emailDraft(form:HTMLFormElement){
 const data=new FormData(form);
 const name=String(data.get("name")||"").trim();
 const email=String(data.get("email")||"").trim();
 const studio=String(data.get("studio")||"").trim();
 const topic=String(data.get("topic")||"Product question").replace(/[\r\n]/g," ").trim();
 const message=String(data.get("message")||"").trim();
 const subject="StudioTasker enquiry: "+topic;
 const body=["Hello StudioTasker support,","","Name: "+name,"Email: "+email,
  "Studio: "+(studio||"Not provided"),"Topic: "+topic,"","Message:",message,"",
  "Sent by the visitor from their own email application."].join("\n");
 return {subject,body};
}

export default function ContactForm(){
 const [state,setState]=useState<"idle"|"sending"|"sent"|"prepared"|"copied"|"error">("idle");
 const [status,setStatus]=useState("");
 const [deliveryAvailable,setDeliveryAvailable]=useState<boolean|null>(null);
 const [turnstileToken,setTurnstileToken]=useState("");
 const [turnstileReset,setTurnstileReset]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  void fetch("/api/contact",{cache:"no-store"}).then(r=>r.json()).then(data=>{if(!cancelled)setDeliveryAvailable(data.deliveryAvailable===true)}).catch(()=>{if(!cancelled)setDeliveryAvailable(false)});
  return ()=>{cancelled=true};
 },[]);
 const startedAt=useRef(Date.now());
 const formRef=useRef<HTMLFormElement>(null);
 async function copyMessage(){
  const form=formRef.current;
  if(!form)return;
  try{
   await navigator.clipboard.writeText(emailDraft(form).body);
   setState("copied");
   setStatus("Your message was copied. Paste it into an email to "+SUPPORT_EMAIL+" and press Send. No message was submitted on this website.");
  }catch{
   setState("error");
   setStatus("Automatic copying is unavailable in this browser. You can select your message and copy it into an email to "+SUPPORT_EMAIL+".");
  }
 }

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(state==="sending"||deliveryAvailable===null)return;
  const form=e.currentTarget;
  if(deliveryAvailable===false){
   const {subject,body}=emailDraft(form);
   const mailto="mailto:"+SUPPORT_EMAIL+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
   setState("prepared");
   if(mailto.length>1900){
    setStatus("Your message is too long for a reliable email-app link. Use Copy message below, then paste into an email to "+SUPPORT_EMAIL+" and press Send. Nothing has been submitted yet.");
    return;
   }
   setStatus("Your email application should open with the details filled in. You must press Send there. This website has not submitted your message.");
   window.location.href=mailto;
   return;
  }
  setState("sending");setStatus("");
  const data=new FormData(form);
  const payload={
   name:String(data.get("name")||""),
   email:String(data.get("email")||""),
   studio:String(data.get("studio")||""),
   topic:String(data.get("topic")||"Product question"),
   message:String(data.get("message")||""),
   website:String(data.get("website")||""),
   startedAt:startedAt.current,
   turnstileToken
  };
  try{
   const response=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const result=await response.json().catch(()=>({}));
   setTurnstileToken("");setTurnstileReset(v=>v+1);
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
  <form ref={formRef} onSubmit={submit}>
   {deliveryAvailable===false&&<div className="ct-delivery-mode" role="status">
    <strong>Contact us by email</strong>
    <span>Fill in the form below. We'll prepare a message in your email app for you to send, with no account needed.</span>
   </div>}
   <input className="ct-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
   <div className="ct-fields">
    <label><span>Your name *</span><input name="name" type="text" autoComplete="name" required maxLength={100} placeholder="Alex Morgan"/></label>
    <label><span>Email *</span><input name="email" type="email" autoComplete="email" required maxLength={160} placeholder="alex@yourstudio.com"/></label>
    <label><span>Studio name</span><input name="studio" type="text" autoComplete="organization" maxLength={120} placeholder="Your Studio"/></label>
    <label><span>Topic</span><select name="topic" defaultValue="Product question"><option>Product question</option><option>Pricing / annual plan</option><option>Account / sign in</option><option>Setup / migration</option><option>Billing</option><option>Feedback</option><option>Other</option></select></label>
    <label className="ct-message"><span>Message *</span><textarea name="message" required minLength={10} maxLength={5000} rows={5} placeholder="How can we help?"/></label>
   </div>
   {deliveryAvailable===true&&<TurnstileChallenge onToken={setTurnstileToken} resetKey={turnstileReset}/>}
   <div className="ct-form-actions">
    <button type="submit" disabled={state==="sending"||deliveryAvailable===null}>{state==="sending"?"SENDING…":deliveryAvailable===false?"OPEN EMAIL APP":"SEND MESSAGE"} <span>↗</span></button>
    {deliveryAvailable===false&&<button className="ct-copy-message" type="button" onClick={copyMessage}>COPY MESSAGE</button>}
   </div>
   {deliveryAvailable===null&&<p className="ct-form-note" role="status">Checking secure message delivery…</p>}
   {deliveryAvailable===false&&<p className="ct-form-note">No message is sent from this webpage in email-app mode. Please press Send in your email application. Or write directly to <a href={"mailto:"+SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>.</p>}
   <p className="ct-form-note">Your message is used to answer your enquiry. Review our <Link href="/legal/privacy">Privacy Policy</Link> for retention and contact details.</p>
   {status&&<p className={"ct-status "+(state==="sent"?"is-success":state==="prepared"||state==="copied"?"is-prepared":"is-error")} role="status">{status}{state==="error"&&<> <a href={"mailto:"+SUPPORT_EMAIL}>Email us directly.</a></>}</p>}
  </form>
 </div>
}
