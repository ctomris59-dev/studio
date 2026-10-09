import {sequentialPg} from "@/lib/server/pg-sequential";
import {NextRequest} from "next/server";
import type {PoolClient} from "pg";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,jsonObject,stringField,sameOrigin} from "@/lib/server/responses";
import {StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
async function state(client:PoolClient,studioId:string){
 const [studio,people,classes,packs]=await sequentialPg([
  ()=>client.query("SELECT name,timezone,onboarding_import_skipped,onboarding_completed_at FROM studios WHERE id=$1",[studioId]),
  ()=>client.query("SELECT count(*)::int n FROM people WHERE studio_id=$1 AND archived_at IS NULL",[studioId]),
  ()=>client.query("SELECT count(*)::int n FROM class_sessions WHERE studio_id=$1 AND starts_at>now()",[studioId]),
  ()=>client.query("SELECT count(*)::int n FROM studio_packages WHERE studio_id=$1 AND active=true",[studioId])
 ]);
 const s=studio.rows[0],contactCount=people.rows[0].n,classCount=classes.rows[0].n,packageCount=packs.rows[0].n;
 const contactsDone=contactCount>0||s?.onboarding_import_skipped===true;
 const basics=Boolean(s?.name&&s?.timezone)&&contactsDone&&classCount>0&&packageCount>0;
 const steps=[
  {id:"profile",label:"Studio profile & timezone",done:Boolean(s?.name&&s?.timezone)},
  {id:"contacts",label:"Import contacts or add them manually",done:contactsDone},
  {id:"class",label:"Create your first class",done:classCount>0},
  {id:"package",label:"Define an internal class package",done:packageCount>0},
  {id:"finish",label:"Finish setup & open StudioTasker Today",done:Boolean(s?.onboarding_completed_at)}
 ];
 return {steps,completed:steps.filter(x=>x.done).length,total:steps.length,contactCount,classCount,packageCount,basics,finished:Boolean(s?.onboarding_completed_at)};
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
 if(!["skip_import","complete_setup"].includes(operation||""))return errorResponse(400,"Choose a valid onboarding action.");
 try{
  const r=await authenticated(request,["owner","manager"],async(client,auth)=>{
   if(operation==="skip_import"){
    await client.query("UPDATE studios SET onboarding_import_skipped=true WHERE id=$1",[auth.studioId]);
    return state(client,auth.studioId);
   }
   const current=await state(client,auth.studioId);
   if(!current.basics)throw new StudioOperationError(409,"Complete profile, contacts/import, one upcoming class and one internal class package first.");
   await client.query("UPDATE studios SET onboarding_completed_at=coalesce(onboarding_completed_at,now()) WHERE id=$1",[auth.studioId]);
   await client.query("INSERT INTO activity_log(studio_id,actor_id,action) VALUES($1,$2,'onboarding.completed')",[auth.studioId,auth.userId]);
   return state(client,auth.studioId);
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse(r.value);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
