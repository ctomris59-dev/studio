import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {createRecurringClasses,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid class series.");
 try{
  const result=await authenticated(request,["owner","manager"],(client,auth)=>createRecurringClasses(client,auth,body));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value,201);
 }catch(e){
  return e instanceof StudioOperationError?errorResponse(e.status,e.message):
   e instanceof Error&&/^(Invalid|Ambiguous|Nonexistent)/.test(e.message)?errorResponse(400,e.message):backendError();
 }
}
