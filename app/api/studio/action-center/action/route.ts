import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {actionCenter} from "@/lib/server/action-center";
import {StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const data=await jsonObject(request);
 if(!data)return errorResponse(400,"Invalid action.");
 const actionKey=stringField(data,"actionKey",180),operation=stringField(data,"operation",30);
 if(!actionKey||!["create_task","contacted","snooze"].includes(operation||""))
  return errorResponse(400,"Choose a valid StudioTasker Today action.");
 try{
  const result=await authenticated(request,["owner","manager","receptionist"],async(client,auth)=>{
   const current=await actionCenter(client,auth.studioId,{includeSnoozed:true});
   const item=current.items.find(x=>x.id===actionKey);
   if(!item)throw new StudioOperationError(404,"StudioTasker Today item is no longer active.");
   if(operation==="snooze"){
    await client.query(`INSERT INTO action_center_snoozes(studio_id,action_key,snoozed_until,created_by)
      VALUES($1,$2,now()+interval '24 hours',$3)
      ON CONFLICT(studio_id,action_key) DO UPDATE SET snoozed_until=excluded.snoozed_until,created_by=excluded.created_by,created_at=now()`,
      [auth.studioId,item.id,auth.userId]);
    return {operation,itemId:item.id,notice:"Hidden until tomorrow."};
   }
   if(!item.personId)throw new StudioOperationError(409,"This signal does not belong to a person.");
   if(operation==="create_task"){
    const category=item.kind==="trial_no_conversion"?"Trial":
     ["expiring_pass","low_credits","package_pending"].includes(item.kind)?"Renewal":
     item.kind==="lead_followup"?"Call":"General";
    const priority=item.priority==="high"?"High":"Normal";
    const title=item.kind==="trial_no_conversion"?"Follow up after trial":
     item.kind==="inactive_member"?"Check in with inactive member":
     item.kind==="package_pending"?"Review package status":
     item.kind==="lead_followup"?"Follow up with lead":
     item.kind==="expiring_pass"||item.kind==="low_credits"?"Discuss membership renewal":
     "Review StudioTasker Today item";
    const inserted=await client.query<{id:string}>(`
      INSERT INTO followup_tasks(studio_id,person_id,title,due_at,category,priority,source_key,notes)
      VALUES($1,$2,$3,now()+interval '1 day',$4,$5,$6,$7)
      ON CONFLICT(studio_id,source_key) WHERE source_key IS NOT NULL AND completed_at IS NULL
      DO NOTHING RETURNING id`,
      [auth.studioId,item.personId,title,category,priority,item.id,item.reason]);
    await client.query(`INSERT INTO action_center_snoozes(studio_id,action_key,snoozed_until,created_by)
      VALUES($1,$2,now()+interval '2 days',$3)
      ON CONFLICT(studio_id,action_key) DO UPDATE SET snoozed_until=excluded.snoozed_until,created_by=excluded.created_by,created_at=now()`,
      [auth.studioId,item.id,auth.userId]);
    if(inserted.rowCount)await client.query(
      "INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,'today.task_created',$4::jsonb)",
      [auth.studioId,item.personId,auth.userId,JSON.stringify({actionKey:item.id,kind:item.kind})]);
    return {operation,itemId:item.id,created:Boolean(inserted.rowCount),notice:inserted.rowCount?"Follow-up task created.":"An open task already exists."};
   }
   await client.query(
    "INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,'today.contacted',$4::jsonb)",
    [auth.studioId,item.personId,auth.userId,JSON.stringify({actionKey:item.id,kind:item.kind})]);
   if(item.kind==="lead_followup"||item.kind==="trial_no_conversion"){
    await client.query(`UPDATE people p SET
      lead_stage=CASE WHEN lead_stage='New' THEN 'Contacted' ELSE lead_stage END,
      next_contact=(now() AT TIME ZONE s.timezone)::date+7,updated_at=now()
      FROM studios s WHERE p.studio_id=$1 AND p.id=$2 AND s.id=p.studio_id AND p.kind='lead'`,
      [auth.studioId,item.personId]);
   }
   await client.query(`INSERT INTO action_center_snoozes(studio_id,action_key,snoozed_until,created_by)
      VALUES($1,$2,now()+interval '7 days',$3)
      ON CONFLICT(studio_id,action_key) DO UPDATE SET snoozed_until=excluded.snoozed_until,created_by=excluded.created_by,created_at=now()`,
      [auth.studioId,item.id,auth.userId]);
   return {operation,itemId:item.id,notice:"Contact recorded; this signal is hidden for seven days."};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value);
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
