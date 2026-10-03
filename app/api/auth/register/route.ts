import {NextRequest,NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {jsonObject,stringField,errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail,validatePassword,passwordHash,newSessionToken,tokenHash,SESSION_COOKIE} from "@/lib/auth-crypto";
import {sessionCookieConfig} from "@/lib/server/auth";
import {sameOrigin} from "@/lib/server/responses";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 if(process.env.AUTH_ALLOW_REGISTRATION!=="true")return errorResponse(403,"New account registration is not enabled.");
 if(!dbIsReady())return errorResponse(503,"Workspace backend is not configured.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid request.");
 const email=stringField(body,"email",160),password=stringField(body,"password",128);
 const studioName=stringField(body,"studioName",100),focus=stringField(body,"focus",40)||"Pilates";
 if(!email||!emailIsValid(normalizeEmail(email))||!password||!validatePassword(password)||
    !studioName||studioName.length<2||
    !["Pilates","Yoga","Boutique fitness","Gym"].includes(focus))return errorResponse(400,"Check email, password (12+ characters) and studio details.");
 try{
  const secured=await passwordHash(password);
  const token=newSessionToken();
  const created=await inTransaction(async client=>{
   const u=await client.query<{id:string}>("INSERT INTO app_users(email,password_hash) VALUES($1,$2) RETURNING id",[normalizeEmail(email),secured]);
   const s=await client.query<{id:string}>("INSERT INTO studios(name,focus) VALUES($1,$2) RETURNING id",[studioName,focus]);
   await client.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'owner')",[s.rows[0].id,u.rows[0].id]);
   await client.query("SELECT set_config('app.studio_id',$1,true)",[s.rows[0].id]);
   await client.query("INSERT INTO subscriptions(studio_id) VALUES($1)",[s.rows[0].id]);
   await client.query("INSERT INTO auth_sessions(token_hash,user_id,studio_id,expires_at) VALUES($1,$2,$3,now()+interval '14 days')",[tokenHash(token),u.rows[0].id,s.rows[0].id]);
   return {id:s.rows[0].id,name:studioName,role:"owner"};
  });
  const response=NextResponse.json({studio:created,notice:"Trial workspace created. Billing and invitation verification are not enabled."},{status:201,headers:{"Cache-Control":"no-store"}});
  response.cookies.set(SESSION_COOKIE,token,sessionCookieConfig());
  return response;
 }catch(e){
  if((e as {code?:string}).code==="23505")return errorResponse(409,"An account with this email already exists.");
  return backendError();
 }
}
