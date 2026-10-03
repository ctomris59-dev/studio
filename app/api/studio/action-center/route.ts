import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {actionCenter} from "@/lib/server/action-center";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,["owner","manager","receptionist"],(client,auth)=>actionCenter(client,auth.studioId));
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse(r.value);
 }catch{return backendError()}
}
