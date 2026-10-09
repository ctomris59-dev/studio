import {verifyPublicChallenge} from "@/lib/server/turnstile";
import {publicAbuseGuard} from "@/lib/server/public-abuse";
import {NextRequest} from "next/server";
import nodemailer from "nodemailer";
import {createHash} from "node:crypto";
import {inTransaction,dbIsReady} from "@/lib/server/database";
import {trustedLoginIp,loginIpKey} from "@/lib/auth-crypto";
import {errorResponse,jsonObject,sameOrigin,stringField,successResponse} from "@/lib/server/responses";

export const runtime="nodejs";

const SUPPORT_EMAIL=process.env.CONTACT_TO||"support@studiotasker.com";
const allowedTopics=new Set(["Product question","Pricing / annual plan","Account / sign in","Setup / migration","Billing","Feedback","Other"]);

function validEmail(value:string){
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=160;
}

// A public preflight lets the UI choose a mailto fallback instead of presenting
// a form that can never deliver when SMTP or the database is unconfigured.
const deliveryReady=()=>Boolean(dbIsReady()&&process.env.SMTP_HOST&&process.env.SMTP_FROM&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD&&[465,587].includes(Number(process.env.SMTP_PORT||587)));
export async function GET(){
 return successResponse({deliveryAvailable:deliveryReady(),fallbackEmail:SUPPORT_EMAIL});
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid request.");

 const website=stringField(body,"website",200);
 if(website)return successResponse({ok:true});
 const name=stringField(body,"name",100);
 const email=stringField(body,"email",160);
 const studio=stringField(body,"studio",120)||"Not provided";
 const topic=stringField(body,"topic",80)||"Product question";
 const message=stringField(body,"message",5000);
 const startedAt=typeof body.startedAt==="number"?body.startedAt:0;

 if(!name||!email||!validEmail(email)||!message||message.length<10)return errorResponse(400,"Please complete your name, email and message.");
 if(!allowedTopics.has(topic))return errorResponse(400,"Invalid topic.");
 if(startedAt&&Date.now()-startedAt<1500)return errorResponse(429,"Please wait a moment and try again.");
 // Fail honestly when delivery is unavailable; never claim a missing email was sent.
 // The public contact page switches to an email-app fallback based on GET above.
 if(!deliveryReady())return errorResponse(424,"Message delivery is not configured. Please email "+SUPPORT_EMAIL+" directly.");
 const quota=await publicAbuseGuard(request,"contact",email);
 if(quota)return quota;
 const verification=await verifyPublicChallenge(request,body);
 if(verification)return verification;
 const trustedIp=trustedLoginIp(request.headers.get("x-real-ip"));
 // Keep a global budget and an independent sender budget even without an
 // optional IP-HMAC secret. A valid proxy + secret adds a tighter IP budget.
 const hashed=(value:string)=>createHash("sha256").update("contact:v2:"+value).digest("hex");
 const counters=[
  {key:hashed("global"),max:150},
  {key:hashed("sender:"+email.trim().toLowerCase()),max:5}
 ];
 const ipKey=trustedIp?loginIpKey("contact:"+trustedIp):null;
 if(ipKey)counters.push({key:ipKey,max:10});
 try{
  const allowed=await inTransaction(async client=>{
   for(const counter of counters){
    const q=await client.query<{attempts:number}>(`
     INSERT INTO login_ip_attempts(ip_hash,attempts,window_started_at) VALUES($1,1,now())
     ON CONFLICT(ip_hash) DO UPDATE SET
      attempts=CASE WHEN login_ip_attempts.window_started_at<now()-interval '1 hour' THEN 1 ELSE login_ip_attempts.attempts+1 END,
      window_started_at=CASE WHEN login_ip_attempts.window_started_at<now()-interval '1 hour' THEN now() ELSE login_ip_attempts.window_started_at END
     RETURNING attempts`,[counter.key]);
    if(q.rows[0].attempts>counter.max)return false;
   }
   return true;
  });
  if(!allowed)return errorResponse(429,"Too many contact requests. Please try again later or email support.");
 }catch{return errorResponse(424,"Contact delivery is temporarily unavailable. Please email "+SUPPORT_EMAIL+" directly.");}

 const {SMTP_HOST,SMTP_FROM,SMTP_USER,SMTP_PASSWORD}=process.env;
 const port=Number(process.env.SMTP_PORT||587);

 const transporter=nodemailer.createTransport({
  host:SMTP_HOST,
  port,
  secure:port===465,
  requireTLS:true,
  tls:{rejectUnauthorized:true},
  auth:{user:SMTP_USER,pass:SMTP_PASSWORD},
  connectionTimeout:10000,
  greetingTimeout:10000,
  socketTimeout:15000
 });

 const subject="[StudioTasker contact] "+topic+" | "+(studio==="Not provided"?name:studio);
 const text=[
  "New StudioTasker contact enquiry",
  "",
  "Name: "+name,
  "Email: "+email,
  "Studio: "+studio,
  "Topic: "+topic,
  "",
  "Message:",
  message
 ].join("\n");

 try{
  await transporter.sendMail({
   from:SMTP_FROM,
   to:SUPPORT_EMAIL,
   replyTo:email,
   subject,
   text
  });
  return successResponse({ok:true});
 }catch{
  return errorResponse(503,"We could not send your message right now. Please try again or email support@studiotasker.com.");
 }finally{
  transporter.close();
 }
}
