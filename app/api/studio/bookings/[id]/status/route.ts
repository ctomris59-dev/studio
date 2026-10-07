import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin,jsonObject,stringField} from "@/lib/server/responses";
import {StudioOperationError} from "@/lib/server/studio-booking";
import {setBookingNoShow} from "@/lib/server/class-based-os";
export const runtime="nodejs";

export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);if(!body)return errorResponse(400,"Invalid no-show update.");
 const noShow=body.noShow;
 if(typeof noShow!=="boolean")return errorResponse(400,"Choose a valid no-show state.");
 const reason=noShow?undefined:stringField(body,"reason",200);
 const {id}=await context.params;
 try{
  const result=await authenticated(request,noShow?["owner","manager","receptionist"]:["owner","manager"],(client,auth)=>setBookingNoShow(client,auth,id,noShow,reason||undefined));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({attendance:result.value});
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
