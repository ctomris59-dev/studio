import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {cancelClassBooking,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const {id}=await context.params;
 try{
  const result=await authenticated(request,["owner","manager","receptionist"],(client,auth)=>cancelClassBooking(client,auth,id));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({booking:result.value});
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
