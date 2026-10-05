import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin,jsonObject,stringField} from "@/lib/server/responses";
import {validStudioTimezone} from "@/lib/studio-timezone";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner","manager","receptionist","instructor"],async(client,auth)=>{
   const r=await client.query("SELECT name,focus,timezone,public_slug,public_booking_enabled,self_signup_enabled FROM studios WHERE id=$1",[auth.studioId]);return r.rows[0];
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({studio:result.value});
 }catch{return backendError()}
}
export async function PATCH(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);if(!body)return errorResponse(400,"Invalid studio settings.");
 const name=stringField(body,"name",100),focus=stringField(body,"focus",40),timezone=stringField(body,"timezone",80);
 const publicBooking=body.publicBookingEnabled,selfSignup=body.selfSignupEnabled;
 if(!name||name.length<2||!focus||!["Pilates","Yoga","Barre","Dance","Boutique fitness","Gym"].includes(focus)||!validStudioTimezone(timezone)||
  publicBooking!==undefined&&typeof publicBooking!=="boolean"||selfSignup!==undefined&&typeof selfSignup!=="boolean")
  return errorResponse(400,"Provide a name, studio type and valid IANA timezone.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const row=await client.query<{timezone:string;public_booking_enabled:boolean;self_signup_enabled:boolean}>("SELECT timezone,public_booking_enabled,self_signup_enabled FROM studios WHERE id=$1 FOR UPDATE",[auth.studioId]);
   if(row.rows[0]?.timezone!==timezone){
    const exists=await client.query("SELECT 1 FROM class_sessions WHERE studio_id=$1 LIMIT 1",[auth.studioId]);
    if(exists.rowCount)return {conflict:true};
   }
   const nextPublic=publicBooking===undefined?row.rows[0].public_booking_enabled:publicBooking;
   const nextSignup=selfSignup===undefined?row.rows[0].self_signup_enabled:selfSignup;
   if(nextSignup&&!nextPublic)return {invalidPublic:true};
   if(nextPublic&&!row.rows[0].public_booking_enabled){
    const [hasClass,hasPackage]=await Promise.all([
     client.query("SELECT 1 FROM class_sessions WHERE studio_id=$1 AND starts_at>now() LIMIT 1",[auth.studioId]),
     client.query("SELECT 1 FROM studio_packages WHERE studio_id=$1 AND active=true LIMIT 1",[auth.studioId])
    ]);
    if(!hasClass.rowCount||!hasPackage.rowCount)return {notReady:true};
   }
   const updated=await client.query("UPDATE studios SET name=$2,focus=$3,timezone=$4,public_booking_enabled=$5,self_signup_enabled=$6 WHERE id=$1 RETURNING name,focus,timezone,public_slug,public_booking_enabled,self_signup_enabled",
    [auth.studioId,name,focus,timezone,nextPublic,nextSignup]);
   return {studio:updated.rows[0]};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value&&"conflict" in result.value)return errorResponse(409,"Timezone cannot change after classes exist. Existing bookings must not be reinterpreted.");
  if(result.value&&"invalidPublic" in result.value)return errorResponse(400,"Self-registration requires the public booking page.");
  if(result.value&&"notReady" in result.value)return errorResponse(409,"Create an upcoming class and active package before publishing the booking page.");
  return successResponse(result.value);
 }catch{return backendError()}
}
