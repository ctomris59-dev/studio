import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";

// Aggregate per class before adding capacities: joining bookings first would inflate totals.
const recentMetrics=`
 WITH class_metrics AS (
  SELECT c.id,c.title,c.instructor,c.capacity,
   to_char(c.starts_at AT TIME ZONE st.timezone,'HH24:MI') AS time_slot,
   COUNT(b.id) FILTER(WHERE b.status='booked')::int AS booked,
   COUNT(b.id) FILTER(WHERE b.attended_at IS NOT NULL)::int AS attended,
   COUNT(b.id) FILTER(WHERE b.no_show_at IS NOT NULL)::int AS no_shows,
   COUNT(b.id) FILTER(WHERE b.cancellation_type='late' AND EXISTS(
     SELECT 1 FROM credit_ledger ledger WHERE ledger.studio_id=b.studio_id
      AND ledger.booking_id=b.id AND ledger.reason='class_booking'
   ))::int AS late_cancels,
   COUNT(b.id) FILTER(WHERE b.status='cancelled' AND b.cancellation_type='standard')::int AS standard_cancels
  FROM class_sessions c JOIN studios st ON st.id=c.studio_id
  LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
  WHERE c.studio_id=$1 AND c.status='scheduled' AND c.starts_at>=now()-interval '30 days' AND c.starts_at<now()
  GROUP BY c.id,st.timezone
 )
`;

export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,["owner","manager","receptionist","instructor"],async(client,auth)=>{
   const summary=await client.query(recentMetrics+`
    SELECT COUNT(*)::int AS classes,COALESCE(SUM(capacity),0)::int AS capacity,
     COALESCE(SUM(booked),0)::int AS booked,COALESCE(SUM(attended),0)::int AS attended,
     COALESCE(SUM(no_shows),0)::int AS no_shows,COALESCE(SUM(late_cancels),0)::int AS late_cancels,
     COALESCE(SUM(standard_cancels),0)::int AS standard_cancels
    FROM class_metrics`,[auth.studioId]);
   const topClasses=await client.query(recentMetrics+`
    SELECT title,COUNT(*)::int AS classes,SUM(capacity)::int AS capacity,
     SUM(booked)::int AS booked,
     CASE WHEN SUM(capacity)>0 THEN ROUND(100.0*SUM(booked)/SUM(capacity))::int ELSE 0 END AS occupancy
    FROM class_metrics GROUP BY title ORDER BY occupancy DESC,classes DESC,title ASC LIMIT 6`,[auth.studioId]);
   const timeSlots=await client.query(recentMetrics+`
    SELECT time_slot,COUNT(*)::int AS classes,SUM(capacity)::int AS capacity,
     SUM(booked)::int AS booked,
     CASE WHEN SUM(capacity)>0 THEN ROUND(100.0*SUM(booked)/SUM(capacity))::int ELSE 0 END AS occupancy
    FROM class_metrics GROUP BY time_slot ORDER BY occupancy DESC,classes DESC,time_slot ASC LIMIT 6`,[auth.studioId]);
   const instructors=await client.query(recentMetrics+`
    SELECT instructor,COUNT(*)::int AS classes,SUM(attended)::int AS check_ins,
     SUM(no_shows)::int AS no_shows
    FROM class_metrics GROUP BY instructor ORDER BY classes DESC,instructor ASC LIMIT 6`,[auth.studioId]);
   const trials=await client.query(`
    SELECT COUNT(*) FILTER(WHERE lead_stage IN('Trial attended','Won','Lost'))::int AS evaluated,
      COUNT(*) FILTER(WHERE lead_stage='Won')::int AS won
    FROM people WHERE studio_id=$1 AND created_at>=now()-interval '30 days'`,[auth.studioId]);
   const waiting=await client.query(`SELECT COUNT(*)::int AS count FROM bookings b
    JOIN class_sessions c ON c.id=b.session_id AND c.studio_id=b.studio_id
    WHERE b.studio_id=$1 AND b.status='waitlisted' AND c.status='scheduled' AND c.starts_at>now()`,[auth.studioId]);
   const s=summary.rows[0]||{classes:0,capacity:0,booked:0,attended:0,no_shows:0,late_cancels:0,standard_cancels:0};
   const occupancy=s.capacity?Math.round(100*s.booked/s.capacity):0;
   const attendanceRate=s.booked?Math.min(100,Math.round(100*s.attended/s.booked)):0;
   const noShowRate=s.booked?Math.min(100,Math.round(100*s.no_shows/s.booked)):0;
   const trial=trials.rows[0]||{evaluated:0,won:0};
   // Pipeline stages cannot prove trial attendance history. Label explicitly as an estimate.
   const trialConversion=trial.evaluated?Math.round(100*trial.won/trial.evaluated):0;
   return {periodDays:30,trialMetricNote:"Approximate pipeline win rate; attendance history is not tracked per lead.",
     summary:{...s,waitlisted:waiting.rows[0]?.count||0,occupancy,attendanceRate,noShowRate,trialConversion},
     topClasses:topClasses.rows,timeSlots:timeSlots.rows,instructors:instructors.rows};
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse(r.value);
 }catch{return backendError()}
}
