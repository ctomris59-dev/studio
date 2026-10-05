import {NextRequest} from "next/server";
import {dbIsReady,inTransaction} from "@/lib/server/database";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {findPublicStudio} from "@/lib/server/public-studio";
export const runtime="nodejs";
export async function GET(_request:NextRequest,context:{params:Promise<{slug:string}>}){
 if(!dbIsReady())return errorResponse(503,"Booking service is not configured.");
 const {slug}=await context.params;
 try{
  const result=await inTransaction(async client=>{
   const studio=await findPublicStudio(client,slug);
   if(!studio||!studio.public_booking_enabled)return null;
   await client.query("SELECT set_config('app.studio_id',$1,true)",[studio.id]);
   if(process.env.BILLING_ENFORCEMENT==="required"){
    const {entitlement}=await import("@/lib/server/billing");
    if(!(await entitlement(client,studio.id)).enabled)return null;
   }
   const [classes,packs]=await Promise.all([
    client.query(`SELECT c.id,c.title,c.instructor,c.room,c.starts_at,c.duration_minutes,c.capacity,
      count(b.id) FILTER(WHERE b.status='booked')::int AS booked_count,
      count(b.id) FILTER(WHERE b.status='waitlisted')::int AS waitlist_count
     FROM class_sessions c LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
     WHERE c.studio_id=$1 AND c.starts_at>now() AND c.starts_at<now()+interval '30 days'
     GROUP BY c.id ORDER BY c.starts_at LIMIT 60`,[studio.id]),
    client.query(`SELECT id,name,description,price_cents,currency,credits,valid_days
     FROM studio_packages WHERE studio_id=$1 AND active=true ORDER BY price_cents,id LIMIT 30`,[studio.id])
   ]);
   return {studio:{name:studio.name,focus:studio.focus,timezone:studio.timezone,slug:studio.public_slug,selfSignupEnabled:studio.self_signup_enabled},
    classes:classes.rows,packages:packs.rows};
  });
  if(!result)return errorResponse(404,"Studio booking page not found.");
  return successResponse(result);
 }catch{return backendError()}
}
