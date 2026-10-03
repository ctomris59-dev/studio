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
    UNION ALL SELECT 'activity_log',count(*)::int FROM activity_log WHERE studio_id=$1`,[auth.studioId]);
   if(counts.rows.some(r=>r.count>10000))return {tooLarge:true};
   const [studio,people,sessions,bookings,credits,tasks,activity,sub]=await Promise.all([
    client.query("SELECT id,name,focus,timezone,created_at FROM studios WHERE id=$1",[auth.studioId]),
    client.query("SELECT id,kind,full_name,email,phone,notes,source,lead_stage,next_contact,preferred_service,preferred_channel,interest_plan,joined,start_date,expiry_date,last_visit,member_status,plan,credits,initial_credits,package_status,source_lead_id,email_consent,created_at,archived_at FROM people WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]),
    client.query("SELECT * FROM class_sessions WHERE studio_id=$1 ORDER BY starts_at,id",[auth.studioId]),
    client.query("SELECT * FROM bookings WHERE studio_id=$1 ORDER BY booked_at,id",[auth.studioId]),
    client.query("SELECT id,member_id,booking_id,delta,reason,reversal_of,created_at FROM credit_ledger WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]),
    client.query("SELECT id,person_id,title,due_at,category,priority,repeat_rule,notes,outcome,completed_at,created_at FROM followup_tasks WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]),
    client.query("SELECT id,person_id,action,details,created_at FROM activity_log WHERE studio_id=$1 ORDER BY created_at,id",[auth.studioId]),
    client.query("SELECT provider,plan,status,current_period_end,updated_at FROM subscriptions WHERE studio_id=$1",[auth.studioId])
   ]);
   await client.query(`INSERT INTO data_export_audits(studio_id,actor_id,reason)
    VALUES($1,$2,'studio_export')`,[auth.studioId,auth.userId]);
   return {format:"ReformDesk Studio Export v1",exportedAt:new Date().toISOString(),
    studio:studio.rows[0],people:people.rows,classes:sessions.rows,bookings:bookings.rows,
    creditLedger:credits.rows,tasks:tasks.rows,activity:activity.rows,subscription:sub.rows[0]};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value&&"tooLarge" in result.value)return errorResponse(413,"Export exceeds the per-table limit; use the database backup procedure.");
  const file="reformdesk-studio-"+new Date().toISOString().slice(0,10)+".json";
  return new NextResponse(JSON.stringify(result.value),{status:200,headers:{
   "Content-Type":"application/json; charset=utf-8","Content-Disposition":'attachment; filename="'+file+'"',
   "Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"
  }});
 }catch{return backendError()}
}
