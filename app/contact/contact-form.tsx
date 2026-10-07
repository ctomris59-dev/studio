"use client";
import {FormEvent, useRef, useState} from "react";

const SUPPORT_EMAIL="support@studiotasker.com";

export default function ContactForm(){
 const [state,setState]=useState<"idle"|"sending"|"sent"|"error">("idle");
 const [status,setStatus]=useState("");
 const startedAt=useRef(Date.now());

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(state==="sending")return;
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
  <form onSubmit={submit}>
   <input className="ct-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
   <div className="ct-fields">
    <label><span>Your name *</span><input name="name" type="text" autoComplete="name" required maxLength={100} placeholder="Alex Morgan"/></label>
    <label><span>Email *</span><input name="email" type="email" autoComplete="email" required maxLength={160} placeholder="alex@yourstudio.com"/></label>
    <label><span>Studio name</span><input name="studio" type="text" autoComplete="organization" maxLength={120} placeholder="Your Studio"/></label>
    <label><span>Topic</span><select name="topic" defaultValue="Product question"><option>Product question</option><option>Pricing / annual plan</option><option>Account / sign in</option><option>Setup / migration</option><option>Billing</option><option>Feedback</option><option>Other</option></select></label>
    <label className="ct-message"><span>Message *</span><textarea name="message" required minLength={10} maxLength={5000} rows={5} placeholder="How can we help?"/></label>
   </div>
   <button type="submit" disabled={state==="sending"}>{state==="sending"?"SENDING…":"SEND MESSAGE"} <span>↗</span></button>
   <p className="ct-form-note">Your message is sent securely to StudioTasker support. We use these details only to respond to your enquiry.</p>
   {status&&<p className={"ct-status "+(state==="sent"?"is-success":"is-error")} role="status">{status}{state==="error"&&<> <a href={"mailto:"+SUPPORT_EMAIL}>Email us directly.</a></>}</p>}
  </form>
 </div>
}
