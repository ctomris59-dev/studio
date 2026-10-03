import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin,jsonObject,stringField} from "@/lib/server/responses";
import {setClassAttendance,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const {id}=await context.params;
 try{
  const result=await authenticated(request,["owner","manager","receptionist"],(client,auth)=>setClassAttendance(client,auth,id,true));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({attendance:result.value});
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 const reason=body?stringField(body,"reason",200):null;
 if(!reason||reason.length<5)return errorResponse(400,"Correction reason must contain at least five characters.");
 const {id}=await context.params;
 try{
  const result=await authenticated(request,["owner","manager"],(client,auth)=>setClassAttendance(client,auth,id,false,reason));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({attendance:result.value});
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
