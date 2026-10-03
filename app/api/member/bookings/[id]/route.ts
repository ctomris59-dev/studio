import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {ownMemberId} from "@/lib/server/member-identity";
import {cancelClassBooking,validUUID,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const {id}=await params;if(!validUUID(id))return errorResponse(400,"Invalid booking.");
 try{
  const r=await authenticated(request,["member"],async(client,auth)=>{
   const memberId=await ownMemberId(client,auth);
   const owns=await client.query(`SELECT 1 FROM bookings
    WHERE studio_id=$1 AND id=$2 AND member_id=$3 LIMIT 1`,[auth.studioId,id,memberId]);
   if(!owns.rowCount)throw new StudioOperationError(404,"Booking not found.");
   return cancelClassBooking(client,auth,id);
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({booking:r.value});
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
