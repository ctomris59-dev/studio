import {NextRequest} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail,validatePassword,passwordHash} from "@/lib/auth-crypto";
import {newChallenge,queueMessage,publicMailOrigin} from "@/lib/server/challenges";
import {validStudioTimezone} from "@/lib/studio-timezone";
import {commercialRegistrationReady} from "@/lib/server/release-config";
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
 if(!email||!emailIsValid(normalizeEmail(email))||!password||!validatePassword(password)||
 !studioName||studioName.length<2||!["Pilates","Yoga","Boutique fitness","Gym"].includes(focus)||!validStudioTimezone(timezone))
 return errorResponse(400,"Check email, password (12+ characters) and studio details.");
 try{
  const origin=publicMailOrigin(),secured=await passwordHash(password);
  await inTransaction(async client=>{
   const u=await client.query<{id:string}>("INSERT INTO app_users(email,password_hash) VALUES($1,$2) RETURNING id",[normalizeEmail(email),secured]);
   const studio=await client.query<{id:string}>("INSERT INTO studios(name,focus,timezone) VALUES($1,$2,$3) RETURNING id",[studioName,focus,timezone]);
   await client.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'owner')",[studio.rows[0].id,u.rows[0].id]);
   await client.query("SELECT set_config('app.studio_id',$1,true)",[studio.rows[0].id]);
   await client.query("INSERT INTO subscriptions(studio_id) VALUES($1)",[studio.rows[0].id]);
   const challenge=await newChallenge(client,{purpose:"verify_email",email,userId:u.rows[0].id,hours:24});
   await queueMessage(client,email,"verify_email",{url:origin+"/workspace#verify="+encodeURIComponent(challenge.secret),studioName});
  });
  return successResponse({ok:true,notice:"Check your email to verify your account before signing in. If delivery is not configured, registration should remain disabled."},202);
 }catch(e){
  if((e as {code?:string}).code==="23505")return errorResponse(409,"An account with this email already exists.");
  return backendError();
 }
}
