import {literalLikePattern} from "./sql-search";
import {randomUUID as cryptoRandomUUID} from "node:crypto";
import "server-only";
import {refundBookingCredit} from "./booking-credits";
import {fillWaitlist,lockStudioOperations} from "./waitlist-policy";
import type {PoolClient} from "pg";
import type {Authenticated} from "./auth";
import {cancelClassBooking,StudioOperationError,validUUID,parseClass} from "./studio-booking";

const fail=(status:number,message:string):never=>{throw new StudioOperationError(status,message)};
const formats=["group","private","semi_private","course","open_gym","pt"] as const;
const text=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length<=max?v.trim():null;
const integer=(v:unknown,min:number,max:number)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max?Number(v):null;

export type ClassMetadata={
 classFormat:typeof formats[number];level:string;programLabel:string;spotBookingEnabled:boolean;
 spotLabel:string;spotCount:number|null;staffId:string|null;substituteStaffId:string|null;effectiveInstructor:string;
};

export async function resolveClassMetadata(client:PoolClient,studioId:string,body:Record<string,unknown>):Promise<ClassMetadata>{
 const studio=await client.query<{default_class_format:string;spot_booking_enabled:boolean;equipment_label:string;default_spot_count:number}>(
  "SELECT default_class_format,spot_booking_enabled,equipment_label,default_spot_count FROM studios WHERE id=$1",[studioId]);
 if(!studio.rowCount)fail(404,"Studio not found.");
 const defaults=studio.rows[0],capacityValue=integer(body.capacity,1,100);
 if(capacityValue===null)fail(400,"Choose a valid class capacity.");
 const capacity=capacityValue as number;
 const classFormat=typeof body.classFormat==="string"?body.classFormat:defaults.default_class_format;
 if(!formats.includes(classFormat as typeof formats[number]))fail(400,"Choose a valid class format.");
 const level=body.level===undefined?"":text(body.level,60),programLabel=body.programLabel===undefined?"":text(body.programLabel,80);
 if(level===null||programLabel===null)fail(400,"Class level or programme label is too long.");
 const spotBookingEnabledValue=body.spotBookingEnabled===undefined?defaults.spot_booking_enabled:body.spotBookingEnabled;
 if(typeof spotBookingEnabledValue!=="boolean")fail(400,"Invalid spot-booking setting.");
 const spotBookingEnabled=spotBookingEnabledValue as boolean;
 const spotLabelValue=body.spotLabel===undefined?defaults.equipment_label:text(body.spotLabel,40);
 const spotCountValue=spotBookingEnabled?integer(body.spotCount===undefined?defaults.default_spot_count:body.spotCount,1,100):null;
 if(!spotLabelValue||spotLabelValue.length<2||spotBookingEnabled&&(spotCountValue===null||spotCountValue<capacity))
  fail(400,"Equipment spots must have a label and at least as many spots as class capacity.");
 const spotLabel=spotLabelValue as string;
 const spotCount=spotBookingEnabled?spotCountValue as number:null;
 const rawStaff=body.staffId,rawSub=body.substituteStaffId;
 const staffId=rawStaff===undefined||rawStaff===null||rawStaff===""?null:String(rawStaff);
 const substituteStaffId=rawSub===undefined||rawSub===null||rawSub===""?null:String(rawSub);
 if(staffId&&!validUUID(staffId)||substituteStaffId&&!validUUID(substituteStaffId))fail(400,"Invalid staff selection.");
 let effectiveInstructor=typeof body.instructor==="string"?body.instructor.trim():"";
 for(const item of [{id:staffId,sub:false},{id:substituteStaffId,sub:true}]){
  if(!item.id)continue;
  const person=await client.query<{display_name:string}>(
   "SELECT display_name FROM studio_staff WHERE studio_id=$1 AND id=$2 AND active=true",[studioId,item.id]);
  if(!person.rowCount)fail(400,"Selected staff member is not active in this studio.");
  if(item.sub||!substituteStaffId)effectiveInstructor=person.rows[0].display_name;
 }
 if(effectiveInstructor.length<2||effectiveInstructor.length>80)fail(400,"Choose or enter a valid instructor.");
 return {classFormat:classFormat as ClassMetadata["classFormat"],level:level||"",programLabel:programLabel||"",
  spotBookingEnabled,spotLabel,spotCount,staffId,substituteStaffId,effectiveInstructor};
}

export async function applyClassMetadata(client:PoolClient,studioId:string,classIds:string[],meta:ClassMetadata){
 for(const id of classIds){
  await client.query(
   "UPDATE class_sessions SET class_format=$3,level=$4,program_label=$5,spot_booking_enabled=$6,spot_label=$7,spot_count=$8,staff_id=$9,substitute_staff_id=$10,instructor=$11 WHERE studio_id=$1 AND id=$2",
   [studioId,id,meta.classFormat,meta.level,meta.programLabel,meta.spotBookingEnabled,meta.spotLabel,meta.spotCount,meta.staffId,meta.substituteStaffId,meta.effectiveInstructor]);
 }
}

export async function listClassesExtended(client:PoolClient,studioId:string,search='',offset=0){
 const records=await client.query(
  `SELECT c.id,c.title,c.instructor,c.room,c.starts_at,c.duration_minutes,c.capacity,c.booking_cutoff_hours,c.cancel_cutoff_hours,c.status,c.cancelled_at,c.series_id,c.class_format,c.level,c.program_label,c.spot_booking_enabled,c.spot_label,c.spot_count,c.staff_id,c.substitute_staff_id,COUNT(b.id) FILTER(WHERE b.status='booked')::int AS booked_count,COUNT(b.id) FILTER(WHERE b.status='waitlisted')::int AS waitlist_count FROM class_sessions c LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id WHERE c.studio_id=$1 AND c.starts_at>=now()-interval '1 day' AND c.starts_at<now()+interval '90 days'
  AND (c.title ILIKE $2 ESCAPE '~' OR c.instructor ILIKE $2 ESCAPE '~' OR c.room ILIKE $2 ESCAPE '~')
  GROUP BY c.id ORDER BY c.starts_at ASC,c.id ASC LIMIT 121 OFFSET $3`,
  [studioId,literalLikePattern(search),offset]);
 return records.rows;
}

export async function assignSpotToBooking<T extends {id:string;status:string}>(client:PoolClient,studioId:string,sessionId:string,booking:T,spotNumber:unknown):Promise<T&{spot_number:number|null}>{
 if(booking.status!=="booked")return {...booking,spot_number:null};
 const session=await client.query<{spot_booking_enabled:boolean;spot_label:string;spot_count:number|null}>(
  "SELECT spot_booking_enabled,spot_label,spot_count FROM class_sessions WHERE studio_id=$1 AND id=$2 FOR UPDATE",[studioId,sessionId]);
 if(!session.rowCount)fail(404,"Class not found.");
 const config=session.rows[0];
 if(!config.spot_booking_enabled)return {...booking,spot_number:null};
 const spot=integer(spotNumber,1,config.spot_count||100);
 if(spot===null)fail(400,"Choose a valid "+config.spot_label.toLowerCase()+" number.");
 const occupied=await client.query(
  "SELECT 1 FROM bookings WHERE studio_id=$1 AND session_id=$2 AND (status='booked' OR (status='waitlisted' AND offer_expires_at>now())) AND spot_number=$3 AND id<>$4 LIMIT 1",
  [studioId,sessionId,spot,booking.id]);
 if(occupied.rowCount)fail(409,"That "+config.spot_label.toLowerCase()+" is already booked.");
 await client.query("UPDATE bookings SET spot_number=$3 WHERE studio_id=$1 AND id=$2",[studioId,booking.id,spot]);
 return {...booking,spot_number:spot};
}

export async function listBookingsExtended(client:PoolClient,studioId:string,sessionId:string){
 if(!validUUID(sessionId))fail(400,"Invalid class identifier.");
 const result=await client.query(
  "SELECT b.id,b.session_id,b.member_id,b.status,b.queue_number,b.booked_at,b.attended_at,b.spot_number,b.cancellation_type,b.no_show_at,b.offer_expires_at,b.offer_closed,p.full_name AS member_name FROM bookings b JOIN people p ON p.id=b.member_id AND p.studio_id=b.studio_id WHERE b.studio_id=$1 AND b.session_id=$2::uuid AND b.status IN('booked','waitlisted') ORDER BY CASE WHEN b.status='booked' THEN 0 ELSE 1 END,b.spot_number ASC NULLS LAST,b.queue_number ASC NULLS LAST,b.booked_at ASC,b.id ASC LIMIT 300",
  [studioId,sessionId]);
 return result.rows;
}

async function promoteWaitlist(client:PoolClient,auth:Authenticated,session:{id:string;starts_at?:Date;timezone?:string;spot_booking_enabled?:boolean},_vacatedSpot:number|null){
 return (await fillWaitlist(client,auth,session.id)).find(x=>x.status==='booked')||null;
}

export async function cancelBookingWithRules(client:PoolClient,auth:Authenticated,bookingId:string){
 await lockStudioOperations(client,auth.studioId);
 if(!validUUID(bookingId))fail(400,"Invalid booking identifier.");
 // Keep booking cancellations in the same lock order as reservations.
 const lookup=await client.query<{session_id:string}>("SELECT session_id FROM bookings WHERE studio_id=$1 AND id=$2",[auth.studioId,bookingId]);
 if(!lookup.rowCount)fail(404,"Booking not found in this studio.");
 await client.query("SELECT id FROM class_sessions WHERE studio_id=$1 AND id=$2 FOR UPDATE",[auth.studioId,lookup.rows[0].session_id]);
 const record=await client.query<{id:string;member_id:string;status:string;attended_at:Date|null;no_show_at:Date|null;spot_number:number|null;session_id:string;starts_at:Date;cancel_cutoff_hours:number;timezone:string;spot_booking_enabled:boolean;late_cancel_refund_credit:boolean}>(
  "SELECT b.id,b.member_id,b.status,b.attended_at,b.no_show_at,b.spot_number,b.session_id,c.starts_at,c.cancel_cutoff_hours,st.timezone,c.spot_booking_enabled,st.late_cancel_refund_credit FROM bookings b JOIN class_sessions c ON c.id=b.session_id AND c.studio_id=b.studio_id JOIN studios st ON st.id=b.studio_id WHERE b.studio_id=$1 AND b.id=$2 FOR UPDATE OF b",
  [auth.studioId,bookingId]);
 if(!record.rowCount)fail(404,"Booking not found in this studio.");
 const b=record.rows[0];
 if(b.status==="cancelled")return {id:b.id,status:"cancelled",alreadyCancelled:true,promoted:null,cancellationType:"standard"};
 if(b.attended_at)fail(409,"Checked-in bookings cannot be cancelled. Correct attendance first.");
 if(b.no_show_at)fail(409,"No-show bookings cannot be cancelled. Correct the no-show first.");
 const start=new Date(b.starts_at).getTime();
 if(Date.now()>=start)fail(409,"This class has started. Mark the booking as a no-show instead.");
 const late=b.cancel_cutoff_hours>0&&Date.now()>=start-b.cancel_cutoff_hours*3600000;
 if(!late){
  const result=await cancelClassBooking(client,auth,bookingId);
  await client.query("UPDATE bookings SET cancellation_type='standard' WHERE studio_id=$1 AND id=$2",[auth.studioId,bookingId]);

  return {...result,cancellationType:"standard"};
 }
 await client.query("UPDATE bookings SET status='cancelled',cancelled_at=now(),offer_expires_at=NULL,cancellation_type='late' WHERE studio_id=$1 AND id=$2",[auth.studioId,bookingId]);
 if(b.status==="booked"&&b.late_cancel_refund_credit)await refundBookingCredit(client,auth,b.member_id,bookingId);
 await client.query("INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,'booking.cancelled_late',jsonb_build_object('creditRefunded',$4::boolean))",
  [auth.studioId,b.member_id,auth.userId,b.late_cancel_refund_credit]);
 const promoted=await promoteWaitlist(client,auth,{id:b.session_id,starts_at:b.starts_at,timezone:b.timezone,spot_booking_enabled:b.spot_booking_enabled},b.spot_number);
 return {id:b.id,status:"cancelled",alreadyCancelled:false,promoted,cancellationType:"late",creditRefunded:b.late_cancel_refund_credit};
}

export async function setBookingNoShow(client:PoolClient,auth:Authenticated,bookingId:string,noShow:boolean,reason?:string){
 await lockStudioOperations(client,auth.studioId);
 if(!validUUID(bookingId))fail(400,"Invalid booking identifier.");
 if(!noShow&&(!reason||reason.trim().length<5||reason.length>200))fail(400,"Provide a reason for a no-show correction.");
 const row=await client.query<{member_id:string;status:string;attended_at:Date|null;no_show_at:Date|null;starts_at:Date;no_show_refund_credit:boolean}>(
  "SELECT b.member_id,b.status,b.attended_at,b.no_show_at,c.starts_at,st.no_show_refund_credit FROM bookings b JOIN class_sessions c ON c.id=b.session_id AND c.studio_id=b.studio_id JOIN studios st ON st.id=b.studio_id WHERE b.studio_id=$1 AND b.id=$2 FOR UPDATE OF b",
  [auth.studioId,bookingId]);
 if(!row.rowCount)fail(404,"Booking not found.");
 const b=row.rows[0];
 if(b.status!=="booked")fail(409,"Only confirmed bookings can be marked no-show.");
 if(b.attended_at)fail(409,"Checked-in bookings cannot be marked no-show.");
 const start=new Date(b.starts_at).getTime();
 if(Date.now()<start)fail(409,"No-show can only be recorded after the class starts.");
 if(Date.now()>start+30*86400000)fail(409,"No-show can only be changed within 30 days.");
 if(Boolean(b.no_show_at)===noShow)return {id:bookingId,noShow,alreadyApplied:true};
 const debit=await client.query<{id:string;credit_cycle:number;rollover_amount:number}>("SELECT id,credit_cycle,rollover_amount FROM credit_ledger WHERE studio_id=$1 AND booking_id=$2 AND reason='class_booking' LIMIT 1",[auth.studioId,bookingId]);
 if(b.no_show_refund_credit&&debit.rowCount){
  const cycle=await client.query("SELECT 1 FROM credit_ledger l JOIN people p ON p.id=l.member_id AND p.studio_id=l.studio_id WHERE l.id=$1 AND l.credit_cycle=p.credit_cycle",[debit.rows[0].id]);
  if(!cycle.rowCount)fail(409,"The package has been renewed. Use an audited credit adjustment for this historical no-show.");
  const d=debit.rows[0];
  const changed=await client.query(`UPDATE people SET credits=credits+$3,
   rollover_credits=CASE WHEN $3>0 THEN rollover_credits+$4 ELSE greatest(0,rollover_credits-$4) END,updated_at=now()
   WHERE studio_id=$1 AND id=$2 AND credits+$3 BETWEEN 0 AND 1000000 RETURNING id`,[auth.studioId,b.member_id,noShow?1:-1,d.rollover_amount]);
  if(!changed.rowCount)fail(409,"The member does not have enough class credits.");
  await client.query("INSERT INTO credit_ledger(studio_id,member_id,booking_id,delta,reason,created_by,credit_cycle,rollover_amount) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
   [auth.studioId,b.member_id,bookingId,noShow?1:-1,noShow?"no_show_refund":"no_show_refund_reversal",auth.userId,d.credit_cycle,d.rollover_amount]);
 }
 await client.query("UPDATE bookings SET no_show_at=$3 WHERE studio_id=$1 AND id=$2",[auth.studioId,bookingId,noShow?new Date().toISOString():null]);
 await client.query("INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,$4,$5::jsonb)",
  [auth.studioId,b.member_id,auth.userId,noShow?"attendance.no_show":"attendance.no_show_corrected",JSON.stringify({bookingId,reason:noShow?"":reason})]);
 return {id:bookingId,noShow,alreadyApplied:false,creditRefunded:b.no_show_refund_credit&&Boolean(debit.rowCount)};
}


export async function reviseClass(client:PoolClient,auth:Authenticated,classId:string,body:Record<string,unknown>){
 if(!validUUID(classId))fail(400,"Invalid class identifier.");
 await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))",[auth.studioId]);
 const current=await client.query<{
  title:string;instructor:string;room:string;starts_at:Date;duration_minutes:number;capacity:number;booking_cutoff_hours:number;cancel_cutoff_hours:number;status:string;
  class_format:string;level:string;program_label:string;spot_booking_enabled:boolean;spot_label:string;spot_count:number|null;staff_id:string|null;substitute_staff_id:string|null
 }>("SELECT * FROM class_sessions WHERE studio_id=$1 AND id=$2 FOR UPDATE",[auth.studioId,classId]);
 if(!current.rowCount)fail(404,"Class not found.");
 const old=current.rows[0];
 if(old.status!=="scheduled")fail(409,"Cancelled classes cannot be edited.");
 if(new Date(old.starts_at).getTime()<=Date.now())fail(409,"Started classes cannot be edited.");
 const holds=await client.query("SELECT 1 FROM bookings WHERE studio_id=$1 AND session_id=$2 AND status='waitlisted' AND offer_expires_at>now() LIMIT 1",[auth.studioId,classId]);
 if(holds.rowCount)fail(409,"Confirm or release active waitlist holds before editing this class.");
 const merged:Record<string,unknown>={title:old.title,instructor:old.instructor,room:old.room,startsAt:new Date(old.starts_at).toISOString(),
  durationMinutes:old.duration_minutes,capacity:old.capacity,bookingCutoffHours:old.booking_cutoff_hours,cancelCutoffHours:old.cancel_cutoff_hours,
  classFormat:old.class_format,level:old.level,programLabel:old.program_label,spotBookingEnabled:old.spot_booking_enabled,spotLabel:old.spot_label,
  spotCount:old.spot_count,staffId:old.staff_id,substituteStaffId:old.substitute_staff_id,...body};
 const meta=await resolveClassMetadata(client,auth.studioId,merged);
 const parsed=parseClass({...merged,instructor:meta.effectiveInstructor});
 const booked=await client.query<{count:number;highest:number}>(
  "SELECT count(*) FILTER(WHERE status='booked')::int AS count, coalesce(max(spot_number) FILTER(WHERE status='booked'),0)::int AS highest FROM bookings WHERE studio_id=$1 AND session_id=$2",[auth.studioId,classId]);
 if(booked.rows[0].count>parsed.capacity||meta.spotBookingEnabled&&booked.rows[0].highest>(meta.spotCount||0))
  fail(409,"Capacity or equipment spots cannot be reduced below existing reservations.");
 const from=new Date(parsed.startsAt),to=new Date(from.getTime()+parsed.durationMinutes*60000);
 const overlaps=await client.query("SELECT id FROM class_sessions WHERE studio_id=$1 AND id<>$2 AND status='scheduled' AND starts_at<$3::timestamptz AND starts_at+(duration_minutes*interval '1 minute')>$4::timestamptz AND (lower(instructor)=lower($5) OR lower(room)=lower($6)) LIMIT 1",
  [auth.studioId,classId,to.toISOString(),from.toISOString(),parsed.instructor,parsed.room]);
 if(overlaps.rowCount)fail(409,"This instructor or room overlaps another class.");
 await client.query(`UPDATE class_sessions SET title=$3,instructor=$4,room=$5,starts_at=$6,duration_minutes=$7,capacity=$8,
  booking_cutoff_hours=$9,cancel_cutoff_hours=$10 WHERE studio_id=$1 AND id=$2`,
  [auth.studioId,classId,parsed.title,parsed.instructor,parsed.room,from.toISOString(),parsed.durationMinutes,parsed.capacity,parsed.bookingCutoffHours,parsed.cancelCutoffHours]);
 await applyClassMetadata(client,auth.studioId,[classId],meta);
 // Fill newly opened capacity from the existing FIFO waitlist before later bookings.
 // The class row stays locked for this entire transaction.
 if(parsed.capacity>old.capacity&&booked.rows[0].count<parsed.capacity){
  const zone=await client.query<{timezone:string}>("SELECT timezone FROM studios WHERE id=$1",[auth.studioId]);
  const session={id:classId,starts_at:from,timezone:zone.rows[0].timezone,spot_booking_enabled:meta.spotBookingEnabled};
  for(let seat=booked.rows[0].count;seat<parsed.capacity;seat++){
   let spot:number|null=null;
   if(meta.spotBookingEnabled){
    const free=await client.query<{spot:number}>(`SELECT n::int AS spot FROM generate_series(1,$3::int) n
     WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.studio_id=$1
       AND b.session_id=$2 AND (b.status='booked' OR (b.status='waitlisted' AND b.offer_expires_at>now())) AND b.spot_number=n)
     ORDER BY n LIMIT 1`,[auth.studioId,classId,meta.spotCount]);
    if(!free.rowCount)break;
    spot=free.rows[0].spot;
   }
   const next=await promoteWaitlist(client,auth,session,spot);
   if(!next)break;
  }
 }
 if(old.starts_at.getTime()!==from.getTime()||old.room!==parsed.room||old.instructor!==parsed.instructor){
  const notification=await client.query<{label:string}>(`SELECT
    left($2::text,70)||' · '||to_char($3::timestamptz AT TIME ZONE timezone,'YYYY-MM-DD HH24:MI')||
    ' ('||left($4::text,24)||')' AS label FROM studios WHERE id=$1`,
    [auth.studioId,parsed.title,from.toISOString(),parsed.room]);
  const eventId=cryptoRandomUUID();
  await client.query(`INSERT INTO followup_tasks(studio_id,person_id,title,due_at,category,notes,source_key)
    SELECT $1,b.member_id,$4,now(),'General',$3,'class_changed:'||$5::text||':'||b.member_id::text
    FROM bookings b WHERE b.studio_id=$1 AND b.session_id=$2::uuid AND b.status IN('booked','waitlisted')
    ON CONFLICT DO NOTHING`,[auth.studioId,classId,JSON.stringify({classId,oldStart:old.starts_at,newStart:from}),
      "Notify member: class schedule changed · "+notification.rows[0].label,eventId]);
 }
 await client.query("INSERT INTO activity_log(studio_id,actor_id,action,details) VALUES($1,$2,'class.edited',$3::jsonb)",[auth.studioId,auth.userId,JSON.stringify({classId})]);
 return {id:classId,updated:true};
}

export async function cancelEntireClass(client:PoolClient,auth:Authenticated,classId:string){
 await lockStudioOperations(client,auth.studioId);
 if(!validUUID(classId))fail(400,"Invalid class identifier.");
 const found=await client.query<{id:string;status:string;starts_at:Date;title:string;room:string}>("SELECT id,status,starts_at,title,room FROM class_sessions WHERE id=$1 AND studio_id=$2 FOR UPDATE",[classId,auth.studioId]);
 if(!found.rowCount)fail(404,"Class not found.");
 if(found.rows[0].status==="cancelled")return {id:classId,alreadyCancelled:true,affected:0,creditsRefunded:0};
 if(new Date(found.rows[0].starts_at).getTime()<Date.now())fail(409,"Started classes cannot be cancelled in bulk.");
 const bookings=await client.query<{id:string;member_id:string;status:string}>(
  "SELECT id,member_id,status FROM bookings WHERE studio_id=$1 AND session_id=$2 AND status IN('booked','waitlisted') ORDER BY id FOR UPDATE",
  [auth.studioId,classId]);
 let refunded=0;
 for(const b of bookings.rows){
  if(b.status!=="booked")continue;
  if(await refundBookingCredit(client,auth,b.member_id,b.id))refunded++;
 }
 await client.query("UPDATE bookings SET status='cancelled',cancelled_at=now(),offer_expires_at=NULL,cancellation_type='standard' WHERE studio_id=$1 AND session_id=$2 AND status IN('booked','waitlisted')",[auth.studioId,classId]);
 await client.query("UPDATE class_sessions SET status='cancelled',cancelled_at=now() WHERE studio_id=$1 AND id=$2",[auth.studioId,classId]);
 await fillWaitlist(client,auth,classId);
 const notification=await client.query<{label:string}>(`SELECT
   left($2::text,70)||' · '||to_char($3::timestamptz AT TIME ZONE timezone,'YYYY-MM-DD HH24:MI')||
   ' ('||left($4::text,24)||')' AS label FROM studios WHERE id=$1`,
   [auth.studioId,found.rows[0].title,found.rows[0].starts_at,found.rows[0].room]);
 await client.query(`INSERT INTO followup_tasks(studio_id,person_id,title,due_at,category,notes,source_key)
   SELECT $1,b.member_id,$5,now(),'General',$3,'class_cancelled:'||$2::text||':'||b.member_id::text
   FROM bookings b WHERE b.studio_id=$1 AND b.session_id=$2::uuid AND b.id=ANY($4::uuid[])
   ON CONFLICT DO NOTHING`,[auth.studioId,classId,JSON.stringify({classId}),bookings.rows.map(x=>x.id),
     "Notify member: class cancelled · "+notification.rows[0].label]);
 await client.query("INSERT INTO activity_log(studio_id,actor_id,action,details) VALUES($1,$2,'class.cancelled',$3::jsonb)",[auth.studioId,auth.userId,JSON.stringify({classId,affected:bookings.rows.length,creditsRefunded:refunded})]);
 return {id:classId,alreadyCancelled:false,affected:bookings.rows.length,creditsRefunded:refunded};
}
