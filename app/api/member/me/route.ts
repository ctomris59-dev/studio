import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {ownMemberId} from "@/lib/server/member-identity";
import {StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const res=await authenticated(request,["member"],async(client,auth)=>{
   const id=await ownMemberId(client,auth);
   const member=await client.query(`
    SELECT id,full_name,plan,credits,package_status,member_status,start_date,expiry_date
    FROM people WHERE studio_id=$1 AND id=$2`,[auth.studioId,id]);
   const bookings=await client.query(`
    SELECT b.id,b.status,b.queue_number,c.id AS class_id,c.title,c.starts_at,c.duration_minutes,c.room
    FROM bookings b JOIN class_sessions c ON c.id=b.session_id AND c.studio_id=b.studio_id
    WHERE b.studio_id=$1 AND b.member_id=$2 AND b.status IN('booked','waitlisted')
    ORDER BY c.starts_at ASC,b.id LIMIT 100`,[auth.studioId,id]);
   const studio=await client.query<{timezone:string}>("SELECT timezone FROM studios WHERE id=$1",[auth.studioId]);
   const visits=await client.query(`SELECT b.id,c.title,c.starts_at,b.attended_at
    FROM bookings b JOIN class_sessions c ON c.id=b.session_id AND c.studio_id=b.studio_id
    WHERE b.studio_id=$1 AND b.member_id=$2 AND b.attended_at IS NOT NULL
    ORDER BY c.starts_at DESC LIMIT 30`,[auth.studioId,id]);
   return {member:member.rows[0],bookings:bookings.rows,visits:visits.rows,timezone:studio.rows[0]?.timezone||"UTC"};
  });
  if(!res.access.ok)return errorResponse(res.access.status,res.access.message);
  return successResponse(res.value);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
