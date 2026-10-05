import {NextRequest} from "next/server";
import type {PoolClient} from "pg";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,jsonObject,stringField,sameOrigin} from "@/lib/server/responses";
import {StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
async function state(client:PoolClient,studioId:string){
 const [studio,people,classes,packs]=await Promise.all([
  client.query("SELECT name,timezone,public_slug,public_booking_enabled,self_signup_enabled,onboarding_import_skipped FROM studios WHERE id=$1",[studioId]),
  client.query("SELECT count(*)::int n FROM people WHERE studio_id=$1 AND archived_at IS NULL",[studioId]),
  client.query("SELECT count(*)::int n FROM class_sessions WHERE studio_id=$1 AND starts_at>now()",[studioId]),
  client.query("SELECT count(*)::int n FROM studio_packages WHERE studio_id=$1 AND active=true",[studioId])
 ]);
 const s=studio.rows[0],contactCount=people.rows[0].n,classCount=classes.rows[0].n,packageCount=packs.rows[0].n;
 const steps=[
  {id:"profile",label:"Studio profile & timezone",done:Boolean(s?.name&&s?.timezone)},
  {id:"class",label:"Create your first class",done:classCount>0},
  {id:"package",label:"Publish a class package",done:packageCount>0},
  {id:"import",label:"Import contacts or skip for now",done:contactCount>0||s?.onboarding_import_skipped===true},
  {id:"publish",label:"Publish booking page & self-registration",done:s?.public_booking_enabled===true&&s?.self_signup_enabled===true}
 ];
 return {steps,completed:steps.filter(x=>x.done).length,total:steps.length,contactCount,classCount,packageCount,
  bookingPath:"/book/"+s.public_slug,publicSlug:s.public_slug,published:steps[4].done};
}
export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,["owner","manager","receptionist"],(client,auth)=>state(client,auth.studioId));
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse(r.value);
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request),operation=body?stringField(body,"operation",30):null;
 if(!["skip_import","publish"].includes(operation||""))return errorResponse(400,"Choose a valid onboarding action.");
 try{
  const r=await authenticated(request,["owner","manager"],async(client,auth)=>{
   if(operation==="skip_import"){
    await client.query("UPDATE studios SET onboarding_import_skipped=true WHERE id=$1",[auth.studioId]);
    return state(client,auth.studioId);
   }
   const counts=await state(client,auth.studioId);
   if(counts.classCount<1)throw new StudioOperationError(409,"Create at least one upcoming class before publishing.");
   if(counts.packageCount<1)throw new StudioOperationError(409,"Publish at least one class package before publishing.");
   await client.query("UPDATE studios SET public_booking_enabled=true,self_signup_enabled=true WHERE id=$1",[auth.studioId]);
   await client.query("INSERT INTO activity_log(studio_id,actor_id,action) VALUES($1,$2,'onboarding.public_booking_published')",[auth.studioId,auth.userId]);
   return state(client,auth.studioId);
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse(r.value);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
