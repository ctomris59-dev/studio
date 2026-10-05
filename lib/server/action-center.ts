import "server-only";
import type {PoolClient} from "pg";

export type ActionKind="lead_followup"|"trial_no_conversion"|"inactive_member"|"expiring_pass"|"low_credits"|"package_pending"|"open_seats"|"overdue_task";
export type ActionItem={id:string;kind:ActionKind;priority:"high"|"medium"|"low";title:string;reason:string;suggestedAction:string;personId?:string;sessionId?:string;dueAt?:string};
export type TodaySummary={classes:number;bookings:number;waitlisted:number;capacity:number;occupancy:number};
export type RescueSummary={total:number;trials:number;inactive:number;renewals:number;pendingPackages:number;openSeats:number};

export async function actionCenter(client:PoolClient,studioId:string,options?:{includeSnoozed?:boolean}){
 const configResult=await client.query<{inactive_days:number;low_credits_threshold:number;renewal_window_days:number;trial_followup_hours:number;package_review_hours:number;open_seats_threshold:number}>(
  "SELECT inactive_days,low_credits_threshold,renewal_window_days,trial_followup_hours,package_review_hours,open_seats_threshold FROM studios WHERE id=$1",[studioId]);
 const config=configResult.rows[0]||{inactive_days:21,low_credits_threshold:2,renewal_window_days:14,trial_followup_hours:18,package_review_hours:24,open_seats_threshold:2};
 const [overdue,expiring,credits,gaps,tasks,inactive,trials,pendingPackages,today,snoozes]=await Promise.all([
  client.query<{id:string;full_name:string;days_late:number;next_contact:string}>(`
   SELECT p.id,p.full_name,GREATEST((now() AT TIME ZONE s.timezone)::date-p.next_contact,0)::int AS days_late,p.next_contact::text
   FROM people p JOIN studios s ON s.id=p.studio_id
   WHERE p.studio_id=$1 AND p.kind='lead' AND p.archived_at IS NULL
    AND p.lead_stage NOT IN('Won','Lost') AND p.next_contact IS NOT NULL
    AND p.next_contact<=(now() AT TIME ZONE s.timezone)::date
   ORDER BY p.next_contact,p.id LIMIT 20`,[studioId]),
  client.query<{id:string;full_name:string;days_left:number;expiry_date:string;credits:number|null}>(`
   SELECT p.id,p.full_name,(p.expiry_date-(now() AT TIME ZONE s.timezone)::date)::int AS days_left,p.expiry_date::text,p.credits
   FROM people p JOIN studios s ON s.id=p.studio_id
   WHERE p.studio_id=$1 AND p.kind='member' AND p.archived_at IS NULL AND p.package_status='Confirmed'
    AND p.member_status='Active' AND p.expiry_date IS NOT NULL
    AND p.expiry_date BETWEEN (now() AT TIME ZONE s.timezone)::date AND (now() AT TIME ZONE s.timezone)::date+$2::int
   ORDER BY p.expiry_date,p.id LIMIT 20`,[studioId,config.renewal_window_days]),
  client.query<{id:string;full_name:string;credits:number}>(`
   SELECT id,full_name,credits FROM people WHERE studio_id=$1 AND kind='member'
    AND member_status='Active' AND archived_at IS NULL AND package_status='Confirmed' AND credits BETWEEN 0 AND $2::int
   ORDER BY credits,id LIMIT 20`,[studioId,config.low_credits_threshold]),
  client.query<{id:string;title:string;starts_at:string;empty_seats:number}>(`
   SELECT c.id,c.title,c.starts_at,(c.capacity-COUNT(b.id) FILTER(WHERE b.status='booked'))::int AS empty_seats
   FROM class_sessions c LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
   WHERE c.studio_id=$1 AND c.starts_at>now()+interval '2 hours' AND c.starts_at<=now()+interval '48 hours'
   GROUP BY c.id HAVING c.capacity-COUNT(b.id) FILTER(WHERE b.status='booked')>=$2::int
   ORDER BY c.starts_at,c.id LIMIT 15`,[studioId,config.open_seats_threshold]),
  client.query<{id:string;title:string;due_at:string;full_name:string;person_id:string}>(`
   SELECT t.id,t.title,t.due_at,p.full_name,t.person_id
   FROM followup_tasks t JOIN people p ON p.id=t.person_id AND p.studio_id=t.studio_id
   WHERE t.studio_id=$1 AND t.completed_at IS NULL AND t.due_at<now()
   ORDER BY t.due_at,t.id LIMIT 20`,[studioId]),
  client.query<{id:string;full_name:string;days_inactive:number;activity_date:string}>(`
   SELECT p.id,p.full_name,
    COALESCE(MAX((c.starts_at AT TIME ZONE s.timezone)::date),p.last_visit,p.joined,p.start_date,p.created_at::date)::text AS activity_date,
    ((now() AT TIME ZONE s.timezone)::date-COALESCE(MAX((c.starts_at AT TIME ZONE s.timezone)::date),p.last_visit,p.joined,p.start_date,p.created_at::date))::int AS days_inactive
   FROM people p JOIN studios s ON s.id=p.studio_id
   LEFT JOIN bookings b ON b.studio_id=p.studio_id AND b.member_id=p.id AND b.attended_at IS NOT NULL
   LEFT JOIN class_sessions c ON c.studio_id=b.studio_id AND c.id=b.session_id
   WHERE p.studio_id=$1 AND p.kind='member' AND p.archived_at IS NULL AND p.member_status='Active' AND p.package_status='Confirmed'
    AND (p.expiry_date IS NULL OR p.expiry_date>=(now() AT TIME ZONE s.timezone)::date)
   GROUP BY p.id,p.full_name,p.last_visit,p.joined,p.start_date,p.created_at,s.timezone
   HAVING ((now() AT TIME ZONE s.timezone)::date-COALESCE(MAX((c.starts_at AT TIME ZONE s.timezone)::date),p.last_visit,p.joined,p.start_date,p.created_at::date))>=$2::int
   ORDER BY days_inactive DESC,p.id LIMIT 20`,[studioId,config.inactive_days]),
  client.query<{id:string;full_name:string;hours_since_trial:number}>(`
   SELECT p.id,p.full_name,extract(epoch FROM(now()-p.updated_at))/3600 AS hours_since_trial
   FROM people p WHERE p.studio_id=$1 AND p.kind='lead' AND p.archived_at IS NULL AND p.lead_stage='Trial attended'
    AND p.updated_at<=now()-($2::int*interval '1 hour') AND p.updated_at>=now()-interval '30 days'
    AND NOT EXISTS(SELECT 1 FROM people m WHERE m.studio_id=p.studio_id AND m.kind='member' AND m.archived_at IS NULL
      AND (m.source_lead_id=p.id OR (p.email<>'' AND lower(m.email)=lower(p.email)) OR (p.phone<>'' AND m.phone=p.phone)))
   ORDER BY p.updated_at,p.id LIMIT 20`,[studioId,config.trial_followup_hours]),
  client.query<{id:string;full_name:string;hours_pending:number}>(`
   SELECT id,full_name,floor(extract(epoch FROM(now()-updated_at))/3600)::int AS hours_pending
   FROM people WHERE studio_id=$1 AND kind='member' AND archived_at IS NULL AND package_status='Pending'
    AND updated_at<=now()-($2::int*interval '1 hour')
   ORDER BY updated_at,id LIMIT 20`,[studioId,config.package_review_hours]),
  client.query<{classes:number;bookings:number;waitlisted:number;capacity:number}>(`
   SELECT count(*)::int AS classes,coalesce(sum(day_class.booked_count),0)::int AS bookings,
    coalesce(sum(day_class.waitlist_count),0)::int AS waitlisted,coalesce(sum(day_class.capacity),0)::int AS capacity
   FROM (SELECT c.id,c.capacity,count(b.id) FILTER(WHERE b.status='booked')::int AS booked_count,
      count(b.id) FILTER(WHERE b.status='waitlisted')::int AS waitlist_count
     FROM class_sessions c JOIN studios s ON s.id=c.studio_id
     LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
     WHERE c.studio_id=$1 AND (c.starts_at AT TIME ZONE s.timezone)::date=(now() AT TIME ZONE s.timezone)::date
     GROUP BY c.id) day_class`,[studioId]),
  client.query<{action_key:string}>(`SELECT action_key FROM action_center_snoozes WHERE studio_id=$1 AND snoozed_until>now()`,[studioId])
 ]);
 const items:ActionItem[]=[];
 const trialIds=new Set(trials.rows.map(x=>x.id));
 const renewalIds=new Set(expiring.rows.map(x=>x.id));for(const p of credits.rows)renewalIds.add(p.id);
 for(const t of tasks.rows)items.push({id:"task:"+t.id,kind:"overdue_task",priority:"high",title:"Overdue task · "+t.full_name,reason:"Follow-up due "+new Date(t.due_at).toISOString().slice(0,10)+": "+t.title,suggestedAction:"Complete the pending follow-up",personId:t.person_id,dueAt:t.due_at});
 for(const t of trials.rows)items.push({id:"trial:"+t.id,kind:"trial_no_conversion",priority:t.hours_since_trial>=72?"high":"medium",title:"Trial needs a next step · "+t.full_name,reason:"Trial marked attended "+Math.floor(t.hours_since_trial)+" hour(s) ago, but no member conversion followed.",suggestedAction:"Ask whether they want to join",personId:t.id});
 for(const l of overdue.rows)if(!trialIds.has(l.id))items.push({id:"lead:"+l.id,kind:"lead_followup",priority:l.days_late>2?"high":"medium",title:"Follow up · "+l.full_name,reason:l.days_late===0?"The next contact date is today.":"Next contact was "+l.days_late+" day(s) ago.",suggestedAction:"Contact the lead",personId:l.id});
 for(const p of expiring.rows)items.push({id:"expiry:"+p.id,kind:"expiring_pass",priority:p.days_left<=3?"high":"medium",title:"Renewal opportunity · "+p.full_name,reason:"Package expires in "+p.days_left+" day(s)"+(p.credits===null?".":" · "+p.credits+" credit(s) remaining."),suggestedAction:"Discuss renewal with the member",personId:p.id});
 for(const p of credits.rows)if(!expiring.rows.some(x=>x.id===p.id))items.push({id:"credits:"+p.id,kind:"low_credits",priority:p.credits===0?"high":"medium",title:"Renewal opportunity · "+p.full_name,reason:p.credits+" class credit(s) remaining.",suggestedAction:"Discuss renewal with the member",personId:p.id});
 for(const p of inactive.rows)if(!renewalIds.has(p.id))items.push({id:"inactive:"+p.id,kind:"inactive_member",priority:p.days_inactive>=35?"high":"medium",title:"Member may be drifting · "+p.full_name,reason:"No recorded attendance for "+p.days_inactive+" days (last activity "+p.activity_date+").",suggestedAction:"Check in with the member",personId:p.id});
 for(const p of pendingPackages.rows)items.push({id:"package:"+p.id,kind:"package_pending",priority:p.hours_pending>=72?"high":"medium",title:"Package status needs review · "+p.full_name,reason:"The member has had no confirmed class package for "+p.hours_pending+" hour(s).",suggestedAction:"Review the member's package status",personId:p.id});
 for(const c of gaps.rows)items.push({id:"seats:"+c.id,kind:"open_seats",priority:"low",title:"Open places · "+c.title,reason:c.empty_seats+" places remain in a class starting within 48 hours.",suggestedAction:"Review the class roster",sessionId:c.id,dueAt:c.starts_at});
 const snoozed=new Set(snoozes.rows.map(x=>x.action_key));
 const visible=(options?.includeSnoozed?items:items.filter(x=>!snoozed.has(x.id)));
 const score={high:0,medium:1,low:2};visible.sort((a,b)=>score[a.priority]-score[b.priority]||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
 const rescueItems=visible.filter(x=>["trial_no_conversion","inactive_member","expiring_pass","low_credits","package_pending","open_seats"].includes(x.kind));
 const base=today.rows[0]||{classes:0,bookings:0,waitlisted:0,capacity:0};
 const summary:TodaySummary={...base,occupancy:base.capacity?Math.round(base.bookings/base.capacity*100):0};
 const rescue:RescueSummary={total:rescueItems.length,trials:rescueItems.filter(x=>x.kind==="trial_no_conversion").length,
  inactive:rescueItems.filter(x=>x.kind==="inactive_member").length,renewals:rescueItems.filter(x=>x.kind==="expiring_pass"||x.kind==="low_credits").length,
  pendingPackages:rescueItems.filter(x=>x.kind==="package_pending").length,openSeats:rescueItems.filter(x=>x.kind==="open_seats").length};
 return {generatedAt:new Date().toISOString(),rules:"Deterministic, explainable studio-operation rules using saved studio thresholds. No member messaging, payment processing or AI API calls.",thresholds:config,total:visible.length,today:summary,rescue,items:visible.slice(0,75)};
}
