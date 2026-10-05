import "server-only";
import type {PoolClient} from "pg";

export type ActionKind=
 "lead_followup"|"trial_no_purchase"|"inactive_member"|"expiring_pass"|"low_credits"|
 "abandoned_checkout"|"open_seats"|"overdue_task";
export type ActionItem={
 id:string;kind:ActionKind;priority:"high"|"medium"|"low";title:string;reason:string;
 suggestedAction:string;personId?:string;sessionId?:string;dueAt?:string;
 amountCents?:number;currency?:string;
};
export type TodaySummary={
 classes:number;bookings:number;waitlisted:number;capacity:number;occupancy:number;
};
export type RescueSummary={
 total:number;trials:number;inactive:number;renewals:number;abandoned:number;openSeats:number;
 checkoutValue:Record<string,number>;
};
export async function actionCenter(client:PoolClient,studioId:string,options?:{includeSnoozed?:boolean}){
 const [overdue,expiring,credits,gaps,tasks,inactive,trials,abandoned,today,snoozes]=await Promise.all([
  client.query<{id:string;full_name:string;days_late:number;next_contact:string}>(`
   SELECT p.id,p.full_name,
     GREATEST((now() AT TIME ZONE s.timezone)::date-p.next_contact,0)::int AS days_late,
     p.next_contact::text
   FROM people p JOIN studios s ON s.id=p.studio_id
   WHERE p.studio_id=$1 AND p.kind='lead' AND p.archived_at IS NULL
     AND p.lead_stage NOT IN('Won','Lost') AND p.next_contact IS NOT NULL
     AND p.next_contact<=(now() AT TIME ZONE s.timezone)::date
   ORDER BY p.next_contact ASC,p.id ASC LIMIT 20`,[studioId]),
  client.query<{id:string;full_name:string;days_left:number;expiry_date:string;credits:number|null}>(`
   SELECT p.id,p.full_name,
      (p.expiry_date-(now() AT TIME ZONE s.timezone)::date)::int AS days_left,
      p.expiry_date::text,p.credits
   FROM people p JOIN studios s ON s.id=p.studio_id
   WHERE p.studio_id=$1 AND p.kind='member' AND p.archived_at IS NULL AND p.package_status='Paid'
    AND p.member_status='Active' AND p.expiry_date IS NOT NULL
    AND p.expiry_date BETWEEN (now() AT TIME ZONE s.timezone)::date
    AND (now() AT TIME ZONE s.timezone)::date+14
   ORDER BY p.expiry_date,p.id LIMIT 20`,[studioId]),
  client.query<{id:string;full_name:string;credits:number}>(`
   SELECT id,full_name,credits FROM people
   WHERE studio_id=$1 AND kind='member' AND member_status='Active' AND archived_at IS NULL
    AND package_status='Paid' AND credits BETWEEN 0 AND 2
   ORDER BY credits ASC,id ASC LIMIT 20`,[studioId]),
  client.query<{id:string;title:string;starts_at:string;empty_seats:number}>(`
    SELECT c.id,c.title,c.starts_at,
     (c.capacity-COUNT(b.id) FILTER(WHERE b.status='booked'))::int AS empty_seats
    FROM class_sessions c
    LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
    WHERE c.studio_id=$1 AND c.starts_at>now()+interval '2 hours'
     AND c.starts_at<=now()+interval '48 hours'
    GROUP BY c.id HAVING c.capacity-COUNT(b.id) FILTER(WHERE b.status='booked')>=2
    ORDER BY c.starts_at,c.id LIMIT 15`,[studioId]),
  client.query<{id:string;title:string;due_at:string;full_name:string;person_id:string}>(`
    SELECT t.id,t.title,t.due_at,p.full_name,t.person_id
    FROM followup_tasks t JOIN people p ON p.id=t.person_id AND p.studio_id=t.studio_id
    WHERE t.studio_id=$1 AND t.completed_at IS NULL AND t.due_at<now()
    ORDER BY t.due_at,t.id LIMIT 20`,[studioId]),
  client.query<{id:string;full_name:string;days_inactive:number;activity_date:string}>(`
    SELECT p.id,p.full_name,
      COALESCE(MAX((c.starts_at AT TIME ZONE s.timezone)::date),p.last_visit,p.joined,p.start_date,p.created_at::date)::text AS activity_date,
      ((now() AT TIME ZONE s.timezone)::date-
       COALESCE(MAX((c.starts_at AT TIME ZONE s.timezone)::date),p.last_visit,p.joined,p.start_date,p.created_at::date))::int AS days_inactive
    FROM people p JOIN studios s ON s.id=p.studio_id
    LEFT JOIN bookings b ON b.studio_id=p.studio_id AND b.member_id=p.id AND b.attended_at IS NOT NULL
    LEFT JOIN class_sessions c ON c.studio_id=b.studio_id AND c.id=b.session_id
    WHERE p.studio_id=$1 AND p.kind='member' AND p.archived_at IS NULL
      AND p.member_status='Active' AND p.package_status='Paid'
      AND (p.expiry_date IS NULL OR p.expiry_date>=(now() AT TIME ZONE s.timezone)::date)
    GROUP BY p.id,p.full_name,p.last_visit,p.joined,p.start_date,p.created_at,s.timezone
    HAVING ((now() AT TIME ZONE s.timezone)::date-
      COALESCE(MAX((c.starts_at AT TIME ZONE s.timezone)::date),p.last_visit,p.joined,p.start_date,p.created_at::date))>=21
    ORDER BY days_inactive DESC,p.id LIMIT 20`,[studioId]),
  client.query<{id:string;full_name:string;hours_since_trial:number}>(`
    SELECT p.id,p.full_name,extract(epoch FROM(now()-p.updated_at))/3600 AS hours_since_trial
    FROM people p
    WHERE p.studio_id=$1 AND p.kind='lead' AND p.archived_at IS NULL
      AND p.lead_stage='Trial attended'
      AND p.updated_at<=now()-interval '18 hours' AND p.updated_at>=now()-interval '30 days'
      AND NOT EXISTS(
       SELECT 1 FROM people m WHERE m.studio_id=p.studio_id AND m.kind='member' AND m.archived_at IS NULL
        AND (m.source_lead_id=p.id OR (p.email<>'' AND lower(m.email)=lower(p.email)) OR (p.phone<>'' AND m.phone=p.phone))
      )
    ORDER BY p.updated_at,p.id LIMIT 20`,[studioId]),
  client.query<{id:string;member_id:string;full_name:string;name:string;amount_cents:number;currency:string;minutes_pending:number}>(`
    SELECT o.id,o.member_id,p.full_name,sp.name,o.amount_cents,o.currency,
      floor(extract(epoch FROM(now()-o.created_at))/60)::int AS minutes_pending
    FROM member_purchases o
    JOIN people p ON p.studio_id=o.studio_id AND p.id=o.member_id
    JOIN studio_packages sp ON sp.studio_id=o.studio_id AND sp.id=o.package_id
    WHERE o.studio_id=$1 AND o.status='pending'
      AND o.created_at<=now()-interval '60 minutes' AND o.created_at>=now()-interval '7 days'
    ORDER BY o.created_at,o.id LIMIT 20`,[studioId]),
  client.query<{classes:number;bookings:number;waitlisted:number;capacity:number}>(`
    SELECT count(DISTINCT c.id)::int AS classes,
      count(b.id) FILTER(WHERE b.status='booked')::int AS bookings,
      count(b.id) FILTER(WHERE b.status='waitlisted')::int AS waitlisted,
      coalesce(sum(DISTINCT c.capacity),0)::int AS capacity
    FROM class_sessions c JOIN studios s ON s.id=c.studio_id
    LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
    WHERE c.studio_id=$1
      AND (c.starts_at AT TIME ZONE s.timezone)::date=(now() AT TIME ZONE s.timezone)::date`,[studioId]),
  client.query<{action_key:string}>(`
    SELECT action_key FROM action_center_snoozes
    WHERE studio_id=$1 AND snoozed_until>now()`,[studioId])
 ]);
 const items:ActionItem[]=[];
 const trialIds=new Set(trials.rows.map(x=>x.id));
 const renewalIds=new Set(expiring.rows.map(x=>x.id));
 for(const p of credits.rows)if(!renewalIds.has(p.id))renewalIds.add(p.id);
 for(const t of tasks.rows)items.push({
  id:"task:"+t.id,kind:"overdue_task",priority:"high",
  title:"Overdue task · "+t.full_name,
  reason:"Follow-up due "+new Date(t.due_at).toISOString().slice(0,10)+": "+t.title,
  suggestedAction:"Complete the pending follow-up",personId:t.person_id,dueAt:t.due_at
 });
 for(const t of trials.rows)items.push({
  id:"trial:"+t.id,kind:"trial_no_purchase",priority:t.hours_since_trial>=72?"high":"medium",
  title:"Trial needs a next step · "+t.full_name,
  reason:"Trial marked attended "+Math.floor(t.hours_since_trial)+" hour(s) ago, but no member record or package purchase followed.",
  suggestedAction:"Ask whether they want to join",personId:t.id
 });
 for(const l of overdue.rows)if(!trialIds.has(l.id))items.push({
  id:"lead:"+l.id,kind:"lead_followup",priority:l.days_late>2?"high":"medium",
  title:"Follow up · "+l.full_name,
  reason:l.days_late===0?"The next contact date is today.":"Next contact was "+l.days_late+" day(s) ago.",
  suggestedAction:"Contact the lead",personId:l.id
 });
 for(const p of expiring.rows)items.push({
  id:"expiry:"+p.id,kind:"expiring_pass",priority:p.days_left<=3?"high":"medium",
  title:"Renewal opportunity · "+p.full_name,
  reason:"Package expires in "+p.days_left+" day(s)"+(p.credits===null?".":" · "+p.credits+" credit(s) remaining."),
  suggestedAction:"Offer a renewal",personId:p.id
 });
 for(const p of credits.rows)if(!expiring.rows.some(x=>x.id===p.id))items.push({
  id:"credits:"+p.id,kind:"low_credits",priority:p.credits===0?"high":"medium",
  title:"Renewal opportunity · "+p.full_name,
  reason:p.credits+" class credit(s) remaining.",
  suggestedAction:"Offer a renewal",personId:p.id
 });
 for(const p of inactive.rows)if(!renewalIds.has(p.id))items.push({
  id:"inactive:"+p.id,kind:"inactive_member",priority:p.days_inactive>=35?"high":"medium",
  title:"Member may be drifting · "+p.full_name,
  reason:"No recorded attendance for "+p.days_inactive+" days (last activity "+p.activity_date+").",
  suggestedAction:"Check in with the member",personId:p.id
 });
 for(const o of abandoned.rows)items.push({
  id:"checkout:"+o.id,kind:"abandoned_checkout",priority:o.minutes_pending>=1440?"high":"medium",
  title:"Checkout still pending · "+o.full_name,
  reason:o.name+" checkout has been pending for "+Math.floor(o.minutes_pending/60)+" hour(s).",
  suggestedAction:"Confirm whether the member still wants the package",personId:o.member_id,
  amountCents:o.amount_cents,currency:o.currency
 });
 for(const c of gaps.rows)items.push({
  id:"seats:"+c.id,kind:"open_seats",priority:"low",
  title:"Open places · "+c.title,
  reason:c.empty_seats+" places remain in a class starting within 48 hours.",
  suggestedAction:"Review the class and eligible members",sessionId:c.id,dueAt:c.starts_at
 });
 const snoozed=new Set(snoozes.rows.map(x=>x.action_key));
 const visible=(options?.includeSnoozed?items:items.filter(x=>!snoozed.has(x.id)));
 const score={high:0,medium:1,low:2};
 visible.sort((a,b)=>score[a.priority]-score[b.priority]||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
 const rescueItems=visible.filter(x=>["trial_no_purchase","inactive_member","expiring_pass","low_credits","abandoned_checkout","open_seats"].includes(x.kind));
 const checkoutValue:Record<string,number>={};
 for(const x of rescueItems)if(x.kind==="abandoned_checkout"&&x.currency&&x.amountCents){
  checkoutValue[x.currency]=(checkoutValue[x.currency]||0)+x.amountCents;
 }
 const base=today.rows[0]||{classes:0,bookings:0,waitlisted:0,capacity:0};
 const summary:TodaySummary={...base,occupancy:base.capacity?Math.round(base.bookings/base.capacity*100):0};
 const rescue:RescueSummary={
  total:rescueItems.length,
  trials:rescueItems.filter(x=>x.kind==="trial_no_purchase").length,
  inactive:rescueItems.filter(x=>x.kind==="inactive_member").length,
  renewals:rescueItems.filter(x=>x.kind==="expiring_pass"||x.kind==="low_credits").length,
  abandoned:rescueItems.filter(x=>x.kind==="abandoned_checkout").length,
  openSeats:rescueItems.filter(x=>x.kind==="open_seats").length,
  checkoutValue
 };
 return {
  generatedAt:new Date().toISOString(),
  rules:"Deterministic, explainable rules. No AI API calls and no automatic marketing messages.",
  total:visible.length,today:summary,rescue,items:visible.slice(0,75)
 };
}
