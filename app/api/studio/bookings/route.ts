import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {reserveClass,StudioOperationError} from "@/lib/server/studio-booking";
import {assignSpotToBooking,listBookingsExtended} from "@/lib/server/class-based-os";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const sessionId=request.nextUrl.searchParams.get("sessionId")||"";
  const result=await authenticated(request,["owner","manager","receptionist","instructor"],(client,auth)=>listBookingsExtended(client,auth.studioId,sessionId));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({bookings:result.value});
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const data=await jsonObject(request);
 if(!data)return errorResponse(400,"Invalid booking.");
 const classId=stringField(data,"sessionId",36),memberId=stringField(data,"memberId",36);
 if(!classId||!memberId)return errorResponse(400,"Provide a class and member ID.");
 try{
  const result=await authenticated(request,["owner","manager","receptionist"],async(client,auth)=>{
   const booked=await reserveClass(client,auth,classId,memberId);
   return assignSpotToBooking(client,auth.studioId,classId,booked,data.spotNumber);
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({booking:result.value},result.value?.alreadyExists?200:201);
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
