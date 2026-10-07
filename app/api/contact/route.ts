import {NextRequest} from "next/server";
import nodemailer from "nodemailer";
import {errorResponse,jsonObject,sameOrigin,stringField,successResponse} from "@/lib/server/responses";

export const runtime="nodejs";

const SUPPORT_EMAIL=process.env.CONTACT_TO||"support@studiotasker.com";
const allowedTopics=new Set(["Product question","Pricing / annual plan","Account / sign in","Setup / migration","Billing","Feedback","Other"]);

function validEmail(value:string){
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=160;
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

 const {SMTP_HOST,SMTP_FROM,SMTP_USER,SMTP_PASSWORD}=process.env;
 const port=Number(process.env.SMTP_PORT||587);
 if(!SMTP_HOST||!SMTP_FROM||!SMTP_USER||!SMTP_PASSWORD||![465,587].includes(port)){
  return errorResponse(503,"Message delivery is temporarily unavailable. Please email support@studiotasker.com.");
 }

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

 const subject="[StudioTasker contact] "+topic+" — "+(studio==="Not provided"?name:studio);
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
