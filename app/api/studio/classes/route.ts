import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {createClass,listClasses,parseClass,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner","manager","receptionist","instructor"],(client,auth)=>listClasses(client,auth.studioId));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({classes:result.value});
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const data=await jsonObject(request);
 if(!data)return errorResponse(400,"Invalid class details.");
 try{
  // Input validation before the DB lock.
  const input=parseClass(data);
  const result=await authenticated(request,["owner","manager"],(client,auth)=>createClass(client,auth,input));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({class:result.value},201);
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
