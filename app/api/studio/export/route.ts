import {NextRequest,NextResponse} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const counts=await client.query<{name:string;count:number}>(`
    SELECT 'people' AS name,count(*)::int FROM people WHERE studio_id=$1
    UNION ALL SELECT 'class_sessions',count(*)::int FROM class_sessions WHERE studio_id=$1
    UNION ALL SELECT 'bookings',count(*)::int FROM bookings WHERE studio_id=$1
    UNION ALL SELECT 'credit_ledger',count(*)::int FROM credit_ledger WHERE studio_id=$1
    UNION ALL SELECT 'followup_tasks',count(*)::int FROM followup_tasks WHERE studio_id=$1
    UNION ALL SELECT 'activity_log',count(*)::int FROM activity_log WHERE studio_id=$1
    UNION ALL SELECT 'studio_packages',count(*)::int FROM studio_packages WHERE studio_id=$1
UNION ALL SELECT 'recurring_reservations',count(*)::int FROM recurring_reservations WHERE studio_id=$1
UNION ALL SELECT 'recurring_booking_attempts',count(*)::int FROM recurring_booking_attempts WHERE studio_id=$1
UNION ALL SELECT 'package_renewals',count(*)::int FROM package_renewals WHERE studio_id=$1
UNION ALL SELECT 'studio_waiver_documents',count(*)::int FROM studio_waiver_documents WHERE studio_id=$1
UNION ALL SELECT 'member_waiver_records',count(*)::int FROM member_waiver_records WHERE studio_id=$1`,[auth.studioId]);
   if(counts.rows.some(r=>r.count>10000))return {tooLarge:true};
   // A pg client executes one query at a time; keep export reads sequential inside the tenant transaction.
   const studio=await client.query(`SELECT waitlist_auto_promote,waitlist_auto_cutoff_minutes,waitlist_offer_minutes,id,name,focus,timezone,accent_color,member_term,class_term,credit_term,week_starts,time_format,default_view,
    default_class_duration,default_class_capacity,default_room,inactive_days,low_credits_threshold,renewal_window_days,trial_followup_hours,
    package_review_hours,open_seats_threshold,onboarding_completed_at,created_at,
    EXISTS(SELECT 1 FROM studio_brand_assets a WHERE a.studio_id=studios.id) AS has_logo
    FROM studios WHERE id=$1`,[auth.studioId]);
   const people=await client.query("SELECT credit_cycle,rollover_credits,waiver_status,id,kind,full_name,email,phone,notes,source,lead_stage,next_contact,preferred_service,preferred_channel,interest_plan,joined,start_date,expiry_date,last_visit,member_status,plan,credits,initial_credits,package_status,source_lead_id,email_consent,created_at,archived_at FROM people WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]);
   const sessions=await client.query("SELECT * FROM class_sessions WHERE studio_id=$1 ORDER BY starts_at,id",[auth.studioId]);
   const bookings=await client.query("SELECT * FROM bookings WHERE studio_id=$1 ORDER BY booked_at,id",[auth.studioId]);
   const credits=await client.query("SELECT credit_cycle,rollover_amount,id,member_id,booking_id,delta,reason,reversal_of,created_at FROM credit_ledger WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]);
   const tasks=await client.query("SELECT id,person_id,title,due_at,category,priority,repeat_rule,notes,outcome,completed_at,created_at FROM followup_tasks WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]);
   const activity=await client.query("SELECT id,person_id,action,details,created_at FROM activity_log WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]);
   const sub=await client.query("SELECT provider,plan,status,current_period_end,updated_at FROM subscriptions WHERE studio_id=$1",[auth.studioId]);
   const packs=await client.query("SELECT id,name,description,credits,valid_days,active,created_at FROM studio_packages WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]);
   const recurring_reservations=await client.query("SELECT * FROM recurring_reservations WHERE studio_id=$1",[auth.studioId]);
   const recurring_booking_attempts=await client.query("SELECT * FROM recurring_booking_attempts WHERE studio_id=$1",[auth.studioId]);
   const package_renewals=await client.query("SELECT * FROM package_renewals WHERE studio_id=$1",[auth.studioId]);
   const studio_waiver_documents=await client.query("SELECT * FROM studio_waiver_documents WHERE studio_id=$1",[auth.studioId]);
   const member_waiver_records=await client.query("SELECT * FROM member_waiver_records WHERE studio_id=$1",[auth.studioId]);
   await client.query("INSERT INTO data_export_audits(studio_id,actor_id,reason) VALUES($1,$2,'studio_export')",[auth.studioId,auth.userId]);
   return {format:"StudioTasker Studio Export v2",exportedAt:new Date().toISOString(),studio:studio.rows[0],people:people.rows,
    classes:sessions.rows,bookings:bookings.rows,creditLedger:credits.rows,tasks:tasks.rows,activity:activity.rows,
    subscription:sub.rows[0],studioPackages:packs.rows,recurring_reservations:recurring_reservations.rows,recurring_booking_attempts:recurring_booking_attempts.rows,package_renewals:package_renewals.rows,studio_waiver_documents:studio_waiver_documents.rows,member_waiver_records:member_waiver_records.rows};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value&&"tooLarge" in result.value)return errorResponse(413,"Export exceeds the per-table limit; use the database backup procedure.");
  const file="studiotasker-studio-"+new Date().toISOString().slice(0,10)+".json";
  return new NextResponse(JSON.stringify(result.value),{status:200,headers:{
   "Content-Type":"application/json; charset=utf-8","Content-Disposition":'attachment; filename="'+file+'"',
   "Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"
  }});
 }catch{return backendError()}
}
