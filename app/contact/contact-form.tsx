"use client";
import {FormEvent, useState} from "react";

const SUPPORT_EMAIL="support@studiotasker.com";

export default function ContactForm(){
  const [status,setStatus]=useState("");
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const name=String(form.get("name")||"").trim();
    const email=String(form.get("email")||"").trim();
    const studio=String(form.get("studio")||"").trim();
    const topic=String(form.get("topic")||"General question").trim();
    const message=String(form.get("message")||"").trim();
    if(!name||!email||!message){setStatus("Please complete your name, email and message.");return}
    const subject="StudioTasker contact — "+topic;
    const body=[
      "Name: "+name,
      "Email: "+email,
      "Studio: "+(studio||"Not provided"),
      "Topic: "+topic,
      "",
      "Message:",
      message
    ].join("\n");
    setStatus("Opening your email app with this message ready to send.");
    window.location.href="mailto:"+SUPPORT_EMAIL+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  }
  return <div className="ct-form-card">
    <div className="ct-form-head"><span>SEND A MESSAGE</span><b>support@studiotasker.com</b></div>
    <form onSubmit={submit}>
      <div className="ct-fields">
        <label><span>Your name *</span><input name="name" type="text" autoComplete="name" required placeholder="Alex Morgan"/></label>
        <label><span>Email *</span><input name="email" type="email" autoComplete="email" required placeholder="alex@yourstudio.com"/></label>
        <label><span>Studio name</span><input name="studio" type="text" autoComplete="organization" placeholder="Your Studio"/></label>
        <label><span>Topic</span><select name="topic" defaultValue="Product question"><option>Product question</option><option>Pricing / annual plan</option><option>Account / sign in</option><option>Setup / migration</option><option>Billing</option><option>Feedback</option><option>Other</option></select></label>
        <label className="ct-message"><span>Message *</span><textarea name="message" required rows={7} placeholder="How can we help?"/></label>
      </div>
      <button type="submit">OPEN EMAIL TO SEND <span>↗</span></button>
      <p className="ct-form-note">This form prepares an email to <a href="mailto:support@studiotasker.com">support@studiotasker.com</a>. Your email app will open so you can review and send it.</p>
      {status&&<p className="ct-status" role="status">{status}</p>}
    </form>
  </div>
}
