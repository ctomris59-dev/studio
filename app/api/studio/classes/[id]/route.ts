import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {StudioOperationError} from "@/lib/server/studio-booking";
import {reviseClass,cancelEntireClass} from "@/lib/server/class-based-os";
export const runtime="nodejs";
export async function PATCH(request:NextRequest,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid class change.");
 const {id}=await ctx.params;
 try{
  const result=await authenticated(request,["owner","manager"],(client,auth)=>reviseClass(client,auth,id,body));
  return result.access.ok?successResponse({class:result.value}):errorResponse(result.access.status,result.access.message);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
export async function DELETE(request:NextRequest,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const {id}=await ctx.params;
 try{
  const result=await authenticated(request,["owner","manager"],(client,auth)=>cancelEntireClass(client,auth,id));
  return result.access.ok?successResponse({class:result.value}):errorResponse(result.access.status,result.access.message);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
