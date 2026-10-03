import "server-only";
import type {PoolClient} from "pg";

export type ActionItem={
 id:string;kind:"lead_followup"|"expiring_pass"|"low_credits"|"open_seats"|"overdue_task";
 priority:"high"|"medium"|"low";title:string;reason:string;
 suggestedAction:string;personId?:string;sessionId?:string;dueAt?:string;
};
export async function actionCenter(client:PoolClient,studioId:string){
 const [overdue,expiring,credits,gaps,tasks]=await Promise.all([
  client.query<{id:string;full_name:string;days_late:number;next_contact:string}>(`
   SELECT p.id,p.full_name,
     GREATEST((now() AT TIME ZONE s.timezone)::date-p.next_contact,0)::int AS days_late,
     p.next_contact::text
   FROM people p JOIN studios s ON s.id=p.studio_id
   WHERE p.studio_id=$1 AND p.kind='lead'
     AND p.lead_stage NOT IN('Won','Lost') AND p.next_contact IS NOT NULL
     AND p.next_contact<=(now() AT TIME ZONE s.timezone)::date
   ORDER BY p.next_contact ASC,p.id ASC LIMIT 20`,[studioId]),
  client.query<{id:string;full_name:string;days_left:number;expiry_date:string}>(`
   SELECT p.id,p.full_name,
      (p.expiry_date-(now() AT TIME ZONE s.timezone)::date)::int AS days_left,
      p.expiry_date::text
   FROM people p JOIN studios s ON s.id=p.studio_id
   WHERE p.studio_id=$1 AND p.kind='member' AND p.package_status='Paid'
    AND p.member_status='Active' AND p.expiry_date IS NOT NULL
    AND p.expiry_date BETWEEN (now() AT TIME ZONE s.timezone)::date
    AND (now() AT TIME ZONE s.timezone)::date+14
   ORDER BY p.expiry_date,p.id LIMIT 20`,[studioId]),
  client.query<{id:string;full_name:string;credits:number}>(`
   SELECT id,full_name,credits FROM people
   WHERE studio_id=$1 AND kind='member' AND member_status='Active'
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
    ORDER BY t.due_at,t.id LIMIT 20`,[studioId])
 ]);
 const items:ActionItem[]=[];
 for(const t of tasks.rows)items.push({
  id:"task:"+t.id,kind:"overdue_task",priority:"high",
  title:"Overdue task · "+t.full_name,
  reason:"Follow-up due "+new Date(t.due_at).toISOString().slice(0,10)+": "+t.title,
  suggestedAction:"Review and complete the pending follow-up",personId:t.person_id,dueAt:t.due_at
 });
 for(const l of overdue.rows)items.push({
  id:"lead:"+l.id,kind:"lead_followup",priority:l.days_late>2?"high":"medium",
  title:"Follow up · "+l.full_name,
  reason:l.days_late===0?"The next contact date is today.":"Next contact was "+l.days_late+" day(s) ago.",
  suggestedAction:"Create a contact task or call the lead",personId:l.id
 });
 for(const p of expiring.rows)items.push({
  id:"expiry:"+p.id,kind:"expiring_pass",priority:p.days_left<=3?"high":"medium",
  title:"Membership renewal · "+p.full_name,
  reason:"Package expires in "+p.days_left+" day(s) ("+p.expiry_date+").",
  suggestedAction:"Ask whether the member wants to renew",personId:p.id
 });
 for(const p of credits.rows)items.push({
  id:"credits:"+p.id,kind:"low_credits",priority:p.credits===0?"high":"medium",
  title:"Class pack running low · "+p.full_name,
  reason:p.credits+" class credit(s) remaining.",
  suggestedAction:"Review remaining classes and discuss renewal",personId:p.id
 });
 for(const c of gaps.rows)items.push({
  id:"seats:"+c.id,kind:"open_seats",priority:"low",
  title:"Class has empty places · "+c.title,
  reason:c.empty_seats+" places available for "+new Date(c.starts_at).toISOString().slice(0,16)+" UTC.",
  suggestedAction:"Review eligible members and offer this class",sessionId:c.id,dueAt:c.starts_at
 });
 const score={high:0,medium:1,low:2};
 items.sort((a,b)=>score[a.priority]-score[b.priority]||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
 return {
  generatedAt:new Date().toISOString(),
  rules:"Deterministic, explainable rules. No AI API calls; no messages sent.",
  total:items.length,
  items:items.slice(0,75)
 };
}
