import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";

export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,["owner","manager","receptionist","instructor"],async(client,auth)=>{
   const [summary,topClasses,timeSlots,instructors,trials]=await Promise.all([
    client.query(`
     WITH recent_classes AS (
      SELECT id,title,instructor,capacity FROM class_sessions
      WHERE studio_id=$1 AND starts_at>=now()-interval '30 days' AND starts_at<now()
     )
     SELECT
      COUNT(DISTINCT rc.id)::int AS classes,
      COALESCE(SUM(rc.capacity),0)::int AS capacity,
      COUNT(b.id) FILTER(WHERE b.status='booked')::int AS booked,
      COUNT(b.id) FILTER(WHERE b.attended_at IS NOT NULL)::int AS attended,
      COUNT(b.id) FILTER(WHERE b.no_show_at IS NOT NULL)::int AS no_shows,
      COUNT(b.id) FILTER(WHERE b.cancellation_type='late')::int AS late_cancels,
      COUNT(b.id) FILTER(WHERE b.cancellation_type='standard')::int AS standard_cancels,
      COUNT(b.id) FILTER(WHERE b.queue_number IS NOT NULL)::int AS waitlisted
     FROM recent_classes rc LEFT JOIN bookings b ON b.studio_id=$1 AND b.session_id=rc.id`,[auth.studioId]),
    client.query(`
     SELECT c.title,COUNT(DISTINCT c.id)::int AS classes,
      COALESCE(SUM(c.capacity),0)::int AS capacity,
      COUNT(b.id) FILTER(WHERE b.status='booked')::int AS booked,
      CASE WHEN SUM(c.capacity)>0 THEN ROUND(100.0*COUNT(b.id) FILTER(WHERE b.status='booked')/SUM(c.capacity))::int ELSE 0 END AS occupancy
     FROM class_sessions c LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
     WHERE c.studio_id=$1 AND c.starts_at>=now()-interval '30 days' AND c.starts_at<now()
     GROUP BY c.title ORDER BY occupancy DESC,classes DESC,c.title ASC LIMIT 6`,[auth.studioId]),
    client.query(`
     SELECT to_char(c.starts_at AT TIME ZONE st.timezone,'HH24:MI') AS time_slot,
      COUNT(DISTINCT c.id)::int AS classes,COALESCE(SUM(c.capacity),0)::int AS capacity,
      COUNT(b.id) FILTER(WHERE b.status='booked')::int AS booked,
      CASE WHEN SUM(c.capacity)>0 THEN ROUND(100.0*COUNT(b.id) FILTER(WHERE b.status='booked')/SUM(c.capacity))::int ELSE 0 END AS occupancy
     FROM class_sessions c JOIN studios st ON st.id=c.studio_id
     LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
     WHERE c.studio_id=$1 AND c.starts_at>=now()-interval '30 days' AND c.starts_at<now()
     GROUP BY time_slot ORDER BY occupancy DESC,classes DESC,time_slot ASC LIMIT 6`,[auth.studioId]),
    client.query(`
     SELECT c.instructor,COUNT(DISTINCT c.id)::int AS classes,
      COUNT(b.id) FILTER(WHERE b.attended_at IS NOT NULL)::int AS check_ins,
      COUNT(b.id) FILTER(WHERE b.no_show_at IS NOT NULL)::int AS no_shows
     FROM class_sessions c LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
     WHERE c.studio_id=$1 AND c.starts_at>=now()-interval '30 days' AND c.starts_at<now()
     GROUP BY c.instructor ORDER BY classes DESC,c.instructor ASC LIMIT 6`,[auth.studioId]),
    client.query(`
     SELECT
      COUNT(*) FILTER(WHERE kind='lead' AND lead_stage IN('Trial attended','Won'))::int AS trial_ready,
      COUNT(*) FILTER(WHERE kind='lead' AND lead_stage='Won')::int AS won
     FROM people WHERE studio_id=$1 AND archived_at IS NULL AND created_at>=now()-interval '90 days'`,[auth.studioId])
   ]);
   const s=summary.rows[0]||{classes:0,capacity:0,booked:0,attended:0,no_shows:0,late_cancels:0,standard_cancels:0,waitlisted:0};
   const occupancy=s.capacity?Math.round(100*s.booked/s.capacity):0;
   const attendanceRate=s.booked?Math.round(100*s.attended/s.booked):0;
   const noShowRate=s.booked?Math.round(100*s.no_shows/s.booked):0;
   const t=trials.rows[0]||{trial_ready:0,won:0};
   const trialConversion=t.trial_ready?Math.round(100*t.won/t.trial_ready):0;
   return {periodDays:30,summary:{...s,occupancy,attendanceRate,noShowRate,trialConversion},topClasses:topClasses.rows,timeSlots:timeSlots.rows,instructors:instructors.rows};
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse(r.value);
 }catch{return backendError()}
}
