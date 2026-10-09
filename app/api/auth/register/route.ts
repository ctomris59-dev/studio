import {verifyPublicChallenge} from "@/lib/server/turnstile";
import {publicAbuseGuard} from "@/lib/server/public-abuse";
import {NextRequest} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,busyResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail,validatePassword,passwordHash,PasswordHashBusyError} from "@/lib/auth-crypto";
import {newChallenge,queueMessage,publicMailOrigin} from "@/lib/server/challenges";
import {validStudioTimezone} from "@/lib/studio-timezone";
import {commercialRegistrationReady} from "@/lib/server/release-config";
import {legalPayloadIsCurrent,recordLegalAcceptance} from "@/lib/server/legal-audit";
import type {LegalPlan} from "@/lib/legal-versions";
import {STUDIO_FOCUSES,studioPreset} from "@/lib/studio-presets";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(process.env.AUTH_ALLOW_REGISTRATION!=="true")return errorResponse(403,"New registration is disabled.");
 if(!commercialRegistrationReady())return errorResponse(503,"Public registration requires configured email, billing and backups.");
 if(!dbIsReady())return errorResponse(503,"Workspace backend is not configured.");
 const body=await jsonObject(request);if(!body)return errorResponse(400,"Invalid request.");
 const email=stringField(body,"email",160),password=stringField(body,"password",128);
 const studioName=stringField(body,"studioName",100),focus=stringField(body,"focus",40)||"Pilates";
 const timezone=stringField(body,"timezone",80)||"UTC";
 const plan=stringField(body,"plan",12) as LegalPlan|null;
 if(!email||!emailIsValid(normalizeEmail(email))||!password||!validatePassword(password)||!studioName||studioName.length<2||
  !(STUDIO_FOCUSES as readonly string[]).includes(focus)||!validStudioTimezone(timezone)||
  !plan||!["monthly","annual"].includes(plan)||!legalPayloadIsCurrent(body))
  return errorResponse(400,"Check account details, subscription plan and required legal acceptance.");
 const budget=await publicAbuseGuard(request,"register",email);
 if(budget)return budget;
 const verification=await verifyPublicChallenge(request,body);
 if(verification)return verification;
 try{
  const origin=publicMailOrigin(),secured=await passwordHash(password),preset=studioPreset(focus);
  await inTransaction(async client=>{
   const u=await client.query<{id:string}>("INSERT INTO app_users(email,password_hash) VALUES($1,$2) RETURNING id",[normalizeEmail(email),secured]);
   const studio=await client.query<{id:string}>(`INSERT INTO studios
    (name,focus,timezone,member_term,class_term,credit_term,default_class_duration,default_class_capacity,default_room,
     spot_booking_enabled,equipment_label,default_spot_count,default_class_format,waiver_required)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,[
     studioName,focus,timezone,preset.memberTerm,preset.classTerm,preset.creditTerm,preset.defaultClassDuration,preset.defaultClassCapacity,
     preset.defaultRoom,preset.spotBookingEnabled,preset.equipmentLabel,preset.defaultSpotCount,preset.defaultClassFormat,preset.waiverRequired
    ]);
   await client.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'owner')",[studio.rows[0].id,u.rows[0].id]);
   await client.query("SELECT set_config('app.studio_id',$1,true)",[studio.rows[0].id]);
   await client.query("SELECT set_config('app.user_id',$1,true)",[u.rows[0].id]);
   await client.query("INSERT INTO subscriptions(studio_id) VALUES($1)",[studio.rows[0].id]);
   await recordLegalAcceptance(client,{request,studioId:studio.rows[0].id,userId:u.rows[0].id,plan,source:"registration"});
   const challenge=await newChallenge(client,{purpose:"verify_email",email,userId:u.rows[0].id,hours:24});
   await queueMessage(client,email,"verify_email",{url:origin+"/workspace#verify="+encodeURIComponent(challenge.secret),studioName});
  });
  return successResponse({ok:true,notice:"If this email address is eligible, check your inbox for the next account step."},202);
 }catch(e){
  // Do not disclose whether an email already belongs to an existing user.
  if((e as {code?:string}).code==="23505")return successResponse({ok:true,notice:"If this email address is eligible, check your inbox for the next account step."},202);
  // Report only the error class and PostgreSQL code; never log submitted credentials.
  console.error("Studio registration failure",{
   name:e instanceof Error?e.name:"unknown",code:(e as {code?:string}).code||"unclassified",
   message:e instanceof Error?e.message:"unknown"
  });
  if(e instanceof PasswordHashBusyError)return busyResponse("Registration service is busy. Try again shortly.");
  return backendError();
 }
}
