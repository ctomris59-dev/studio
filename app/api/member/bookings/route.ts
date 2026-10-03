import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {ownMemberId} from "@/lib/server/member-identity";
import {reserveClass,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const data=await jsonObject(request),sessionId=data?stringField(data,"sessionId",36):null;
 if(!sessionId)return errorResponse(400,"Choose a class.");
 try{
  const r=await authenticated(request,["member"],async(client,auth)=>{
   const memberId=await ownMemberId(client,auth);
   return reserveClass(client,auth,sessionId,memberId);
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({booking:r.value},r.value?.alreadyExists?200:201);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
