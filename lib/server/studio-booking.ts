import "server-only";
import type {PoolClient} from "pg";
import type {Authenticated} from "./auth";
import {randomUUID} from "node:crypto";
import {localDateTimeToUTC,validStudioTimezone} from "../studio-timezone";

export class StudioOperationError extends Error{
 constructor(public readonly status:number,message:string){super(message);this.name="StudioOperationError";}
}
const fail=(status:number,message:string):never=>{throw new StudioOperationError(status,message)};
export const validUUID=(id:unknown):id is string=>typeof id==="string"&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id);
export const validText=(value:unknown,max:number,min=0):value is string=>typeof value==="string"&&value.trim().length>=min&&value.trim().length<=max;
export const validInteger=(value:unknown,min:number,max:number):value is number=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
export const isZonedDate=(value:unknown):value is string=>
 typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));

export type ClassInput={
 title:string;instructor:string;room:string;startsAt:string;
 durationMinutes:number;capacity:number;bookingCutoffHours:number;cancelCutoffHours:number;
};
export function parseClass(body:Record<string,unknown>):ClassInput{
 const title=body.title,instructor=body.instructor,room=body.room??"Main studio",startsAt=body.startsAt;
 const durationMinutes=body.durationMinutes??50,capacity=body.capacity;
 const bookingCutoffHours=body.bookingCutoffHours??0,cancelCutoffHours=body.cancelCutoffHours??0;
 if(!validText(title,100,2)||!validText(instructor,80,2)||!validText(room,80,2)||!isZonedDate(startsAt)||
 !validInteger(durationMinutes,15,240)||!validInteger(capacity,1,100)||
 !validInteger(bookingCutoffHours,0,168)||!validInteger(cancelCutoffHours,0,168))
 fail(400,"Provide a valid class title, instructor, room, timezone-aware start, duration, capacity and cutoff rules.");
 // The guards above validate unknown JSON. Use explicit narrowed primitives here:
 const safeStart=startsAt as string;
 if(Date.parse(safeStart)<Date.now()+60_000)fail(400,"The class must start at least one minute from now.");
 return {title:(title as string).trim(),instructor:(instructor as string).trim(),
  room:(room as string).trim(),startsAt:safeStart,
  durationMinutes:durationMinutes as number,capacity:capacity as number,
  bookingCutoffHours:bookingCutoffHours as number,cancelCutoffHours:cancelCutoffHours as number};
}

export async function createClass(client:PoolClient,auth:Authenticated,input:ClassInput,seriesId?:string){
 // Transaction-scoped advisory lock prevents concurrent class creation for the same studio.
 // The app role has no direct client SQL interface and all class mutations go through this path.
 await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))",[auth.studioId]);
 const from=new Date(input.startsAt),to=new Date(from.getTime()+input.durationMinutes*60_000);
 const conflicts=await client.query<{id:string}>(`
  SELECT id FROM class_sessions
  WHERE studio_id=$1 AND starts_at<$2::timestamptz
    AND starts_at+(duration_minutes*interval '1 minute')>$3::timestamptz
    AND (lower(instructor)=lower($4) OR lower(room)=lower($5))
  LIMIT 1`,[auth.studioId,to.toISOString(),from.toISOString(),input.instructor,input.room]);
 if(conflicts.rowCount)fail(409,"This instructor or room already has an overlapping class.");
 const result=await client.query(`
 INSERT INTO class_sessions
  (studio_id,title,instructor,room,starts_at,duration_minutes,capacity,booking_cutoff_hours,cancel_cutoff_hours,series_id)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
 RETURNING id,title,instructor,room,starts_at,duration_minutes,capacity,booking_cutoff_hours,cancel_cutoff_hours,series_id`,
 [auth.studioId,input.title,input.instructor,input.room,from.toISOString(),input.durationMinutes,
  input.capacity,input.bookingCutoffHours,input.cancelCutoffHours,seriesId||null]);
 return result.rows[0];
}

export async function createRecurringClasses(client:PoolClient,auth:Authenticated,body:Record<string,unknown>){
 const startDate=body.startDate,endDate=body.endDate,time=body.time,weekdays=body.weekdays;
 if(typeof startDate!=="string"||typeof endDate!=="string"||typeof time!=="string"||
 !/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(endDate)||
 !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!Array.isArray(weekdays)||!weekdays.length||
 weekdays.length>7||!weekdays.every(x=>Number.isInteger(x)&&x>=0&&x<=6)||
 new Set(weekdays).size!==weekdays.length)fail(400,"Choose valid dates, class time and weekdays.");
 const first=Date.parse(startDate+"T00:00:00Z"),last=Date.parse(endDate+"T00:00:00Z");
 if(!Number.isFinite(first)||!Number.isFinite(last)||new Date(first).toISOString().slice(0,10)!==startDate||
 new Date(last).toISOString().slice(0,10)!==endDate||last<first||last-first>84*86400000)
 fail(400,"Class series must cover a valid period of at most 12 weeks.");
 const zones=await client.query<{timezone:string}>("SELECT timezone FROM studios WHERE id=$1",[auth.studioId]);
 const timezone=zones.rows[0]?.timezone;
 if(!validStudioTimezone(timezone))fail(400,"Configure a valid studio timezone before scheduling.");
 const seriesId=randomUUID(),classes=[];
 // Inside authenticated() transaction: failures roll back all series occurrences.
 for(let stamp=first;stamp<=last;stamp+=86400000){
  if(!(weekdays as number[]).includes(new Date(stamp).getUTCDay()))continue;
  if(classes.length>=52)fail(400,"Maximum 52 classes per recurring series.");
  const day=new Date(stamp).toISOString().slice(0,10);
  const startsAt=localDateTimeToUTC(day,time as string,timezone);
  const input=parseClass({...body,startsAt});
  classes.push(await createClass(client,auth,input,seriesId));
 }
 if(!classes.length)fail(400,"No classes match the selected range and weekdays.");
 return {seriesId,timezone,classes};
}

export async function listClasses(client:PoolClient,studioId:string){
 const records=await client.query(`
 SELECT c.id,c.title,c.instructor,c.room,c.starts_at,c.duration_minutes,c.capacity,
   c.booking_cutoff_hours,c.cancel_cutoff_hours,c.series_id,
   COUNT(b.id) FILTER(WHERE b.status='booked')::int AS booked_count,
   COUNT(b.id) FILTER(WHERE b.status='waitlisted')::int AS waitlist_count
 FROM class_sessions c
 LEFT JOIN bookings b ON b.studio_id=c.studio_id AND b.session_id=c.id
 WHERE c.studio_id=$1 AND c.starts_at>=now()-interval '1 day'
   AND c.starts_at<now()+interval '90 days'
 GROUP BY c.id
 ORDER BY c.starts_at ASC,c.id ASC LIMIT 120`,[studioId]);
 return records.rows;
}

type LockedClass={
 id:string;title:string;starts_at:Date;duration_minutes:number;capacity:number;booking_cutoff_hours:number;
 cancel_cutoff_hours:number;timezone:string;
};
async function lockClass(client:PoolClient,studioId:string,sessionId:string):Promise<LockedClass>{
 if(!validUUID(sessionId))fail(400,"Invalid class identifier.");
 const found=await client.query<LockedClass>(`
 SELECT c.id,c.title,c.starts_at,c.duration_minutes,c.capacity,c.booking_cutoff_hours,c.cancel_cutoff_hours,
   st.timezone
 FROM class_sessions c JOIN studios st ON st.id=c.studio_id
 WHERE c.id=$1 AND c.studio_id=$2 FOR UPDATE OF c`,[sessionId,studioId]);
 if(!found.rowCount)fail(404,"Class not found in this studio.");
 return found.rows[0];
}
const cutoffPassed=(startsAt:Date,hours:number):boolean=>Date.now()>=new Date(startsAt).getTime()-hours*3600000;
async function studioDate(client:PoolClient,timezone:string,time:Date){
 const date=await client.query<{local_day:string}>(`
 SELECT ($1::timestamptz AT TIME ZONE $2)::date::text AS local_day`,[time,timezone]);
 return date.rows[0].local_day;
}
type Member={
 id:string;kind:string;credits:number|null;package_status:string|null;member_status:string|null;
 start_date:string|null;expiry_date:string|null;waiver_status:string;
};
async function lockedMember(client:PoolClient,studioId:string,memberId:string):Promise<Member>{
 const member=await client.query<Member>(`
 SELECT id,kind,credits,package_status,member_status,start_date::text,expiry_date::text,waiver_status
 FROM people WHERE studio_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE`,[studioId,memberId]);
 if(!member.rowCount||member.rows[0].kind!=="member")fail(404,"Member not found in this studio.");
 return member.rows[0];
}
const eligible=(m:Member,onDay:string)=>
 m.member_status==="Active"&&m.package_status==="Confirmed"&&
 (!m.start_date||m.start_date<=onDay)&&(!m.expiry_date||m.expiry_date>=onDay)&&
 (m.credits===null||m.credits>0);
async function changeCredits(client:PoolClient,studioId:string,memberId:string,delta:number){
 const updated=await client.query<{credits:number|null}>(`
 UPDATE people SET credits=CASE WHEN credits IS NULL THEN NULL ELSE credits+$3 END,updated_at=now()
 WHERE id=$1 AND studio_id=$2 AND (credits IS NULL OR (credits+$3 BETWEEN 0 AND 1000000))
 RETURNING credits`,[memberId,studioId,delta]);
 if(!updated.rowCount)fail(409,"The member does not have enough class credits.");
 return updated.rows[0].credits;
}

export async function reserveClass(client:PoolClient,auth:Authenticated,sessionId:string,memberId:string){
 if(!validUUID(memberId))fail(400,"Invalid member identifier.");
 const session=await lockClass(client,auth.studioId,sessionId);
 if(cutoffPassed(session.starts_at,session.booking_cutoff_hours))fail(409,"Bookings for this class are closed.");
 const member=await lockedMember(client,auth.studioId,memberId);
 const waiver=await client.query<{waiver_required:boolean}>("SELECT waiver_required FROM studios WHERE id=$1",[auth.studioId]);
 if(waiver.rows[0]?.waiver_required&&member.waiver_status!=="signed")fail(409,"A signed waiver is required before booking.");
 const date=await studioDate(client,session.timezone,session.starts_at);
 if(!eligible(member,date))fail(409,"Member needs an active, confirmed and valid class pass.");
 const existing=await client.query<{id:string;status:string}>(`
 SELECT id,status FROM bookings
 WHERE studio_id=$1 AND session_id=$2 AND member_id=$3 AND status IN('booked','waitlisted')
 LIMIT 1`,[auth.studioId,sessionId,memberId]);
 if(existing.rowCount)return {...existing.rows[0],alreadyExists:true};
 const count=await client.query<{total:number}>(`
 SELECT COUNT(*)::int AS total FROM bookings WHERE studio_id=$1 AND session_id=$2 AND status='booked'`,[auth.studioId,sessionId]);
 const full=count.rows[0].total>=session.capacity;
 if(full){
  const next=await client.query<{position:number}>(`
   SELECT (COALESCE(MAX(queue_number),0)+1)::int AS position
   FROM bookings WHERE studio_id=$1 AND session_id=$2`,[auth.studioId,sessionId]);
  if(next.rows[0].position>10000)fail(409,"Waitlist is full.");
  const row=await client.query(`
   INSERT INTO bookings(studio_id,session_id,member_id,status,queue_number)
   VALUES($1,$2,$3,'waitlisted',$4)
   RETURNING id,status,queue_number`,[auth.studioId,sessionId,memberId,next.rows[0].position]);
  await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action)
    VALUES($1,$2,$3,'booking.waitlisted')`,[auth.studioId,memberId,auth.userId]);
  return {...row.rows[0],alreadyExists:false};
 }
 if(member.credits!==null)await changeCredits(client,auth.studioId,memberId,-1);
 const row=await client.query<{id:string;status:string}>(`
 INSERT INTO bookings(studio_id,session_id,member_id,status)
 VALUES($1,$2,$3,'booked') RETURNING id,status`,[auth.studioId,sessionId,memberId]);
 if(member.credits!==null)await client.query(`
 INSERT INTO credit_ledger(studio_id,member_id,booking_id,delta,reason,created_by)
 VALUES($1,$2,$3,-1,'class_booking',$4)`,[auth.studioId,memberId,row.rows[0].id,auth.userId]);
 await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action)
 VALUES($1,$2,$3,'booking.confirmed')`,[auth.studioId,memberId,auth.userId]);
 return {...row.rows[0],alreadyExists:false};
}

export async function cancelClassBooking(client:PoolClient,auth:Authenticated,bookingId:string){
 if(!validUUID(bookingId))fail(400,"Invalid booking identifier.");
 const find=await client.query<{session_id:string}>(`
 SELECT session_id FROM bookings WHERE studio_id=$1 AND id=$2`,[auth.studioId,bookingId]);
 if(!find.rowCount)fail(404,"Booking not found in this studio.");
 const session=await lockClass(client,auth.studioId,find.rows[0].session_id);
 const record=await client.query<{id:string;member_id:string;status:string;attended_at:Date|null}>(`
 SELECT id,member_id,status,attended_at FROM bookings WHERE studio_id=$1 AND id=$2 FOR UPDATE`,[auth.studioId,bookingId]);
 if(!record.rowCount)fail(404,"Booking not found.");
 const booking=record.rows[0];
 if(booking.status==="cancelled")return {id:booking.id,status:"cancelled",alreadyCancelled:true,promoted:null};
 if(booking.attended_at)fail(409,"Checked-in bookings cannot be cancelled. Correct attendance first.");
 if(cutoffPassed(session.starts_at,session.cancel_cutoff_hours))fail(409,"Cancellation deadline has passed.");
 await client.query(`
 UPDATE bookings SET status='cancelled',cancelled_at=now()
 WHERE id=$1 AND studio_id=$2`,[bookingId,auth.studioId]);
 if(booking.status==="booked"){
  const previous=await client.query(`
   SELECT id FROM credit_ledger
   WHERE studio_id=$1 AND booking_id=$2 AND reason='class_booking' LIMIT 1`,
   [auth.studioId,bookingId]);
  if(previous.rowCount){
   await changeCredits(client,auth.studioId,booking.member_id,1);
   await client.query(`
    INSERT INTO credit_ledger(studio_id,member_id,booking_id,delta,reason,reversal_of,created_by)
    VALUES($1,$2,$3,1,'class_refund',$4,$5)`,
    [auth.studioId,booking.member_id,bookingId,previous.rows[0].id,auth.userId]);
  }
 }
 await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action)
 VALUES($1,$2,$3,'booking.cancelled')`,[auth.studioId,booking.member_id,auth.userId]);
 // Cancelled waitlist entries must never trigger a promotion.
 if(booking.status!=="booked")return {id:booking.id,status:"cancelled",alreadyCancelled:false,promoted:null};
 const classDay=await studioDate(client,session.timezone,session.starts_at);
 const waiting=await client.query<{id:string;member_id:string}>(`
 SELECT id,member_id FROM bookings
 WHERE studio_id=$1 AND session_id=$2 AND status='waitlisted'
 ORDER BY queue_number ASC NULLS LAST,booked_at ASC,id ASC LIMIT 300`,[auth.studioId,find.rows[0].session_id]);
 let promoted:null|{id:string;memberId:string}=null;
 for(const next of waiting.rows){
  const member=await lockedMember(client,auth.studioId,next.member_id);
  if(!eligible(member,classDay))continue;
  if(member.credits!==null)await changeCredits(client,auth.studioId,next.member_id,-1);
  await client.query(`
   UPDATE bookings SET status='booked'
   WHERE studio_id=$1 AND id=$2 AND status='waitlisted'`,[auth.studioId,next.id]);
  if(member.credits!==null)await client.query(`
   INSERT INTO credit_ledger(studio_id,member_id,booking_id,delta,reason,created_by)
   VALUES($1,$2,$3,-1,'class_booking',$4)`,[auth.studioId,next.member_id,next.id,auth.userId]);
  await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action)
   VALUES($1,$2,$3,'booking.promoted')`,[auth.studioId,next.member_id,auth.userId]);
  promoted={id:next.id,memberId:next.member_id};
  break;
 }
 return {id:booking.id,status:"cancelled",alreadyCancelled:false,promoted};
}

export async function listBookings(client:PoolClient,studioId:string,sessionId:string){
 if(!validUUID(sessionId))fail(400,"Invalid class identifier.");
 const result=await client.query(`
 SELECT b.id,b.session_id,b.member_id,b.status,b.queue_number,b.booked_at,b.attended_at,
 p.full_name AS member_name
 FROM bookings b JOIN people p ON p.id=b.member_id AND p.studio_id=b.studio_id
 WHERE b.studio_id=$1 AND b.session_id=$2 AND b.status IN('booked','waitlisted')
 ORDER BY CASE WHEN b.status='booked' THEN 0 ELSE 1 END,
          b.queue_number ASC NULLS LAST,b.booked_at ASC,b.id ASC LIMIT 300`,[studioId,sessionId]);
 return result.rows;
}

export async function setClassAttendance(client:PoolClient,auth:Authenticated,bookingId:string,present:boolean,reason?:string){
 if(!validUUID(bookingId))fail(400,"Invalid booking identifier.");
 if(!present&&!validText(reason,200,5))fail(400,"Provide a reason for an attendance correction.");
 const found=await client.query<{id:string;member_id:string;starts_at:Date;status:string;attended_at:Date|null}>(`
 SELECT b.id,b.member_id,c.starts_at,b.status,b.attended_at
 FROM bookings b JOIN class_sessions c ON c.id=b.session_id AND c.studio_id=b.studio_id
 WHERE b.studio_id=$1 AND b.id=$2 FOR UPDATE OF b`,[auth.studioId,bookingId]);
 if(!found.rowCount)fail(404,"Booking not found in this studio.");
 const booking=found.rows[0];
 if(booking.status!=="booked")fail(409,"Only confirmed bookings can be checked in.");
 const when=new Date(booking.starts_at).getTime();
 if(Date.now()<when-60*60000||Date.now()>when+30*86400000)
  fail(409,"Attendance can only be recorded from one hour before class until 30 days afterward.");
 if(Boolean(booking.attended_at)===present)return {id:bookingId,present,alreadyApplied:true};
 await client.query("UPDATE bookings SET attended_at=$3 WHERE studio_id=$1 AND id=$2",
  [auth.studioId,bookingId,present?new Date().toISOString():null]);
 await client.query(`
 UPDATE people p SET last_visit=(
  SELECT MAX((c.starts_at AT TIME ZONE st.timezone)::date)
  FROM bookings b JOIN class_sessions c ON c.id=b.session_id AND c.studio_id=b.studio_id
  JOIN studios st ON st.id=b.studio_id
  WHERE b.studio_id=$1 AND b.member_id=$2 AND b.attended_at IS NOT NULL
 ) WHERE p.studio_id=$1 AND p.id=$2`,[auth.studioId,booking.member_id]);
 await client.query("INSERT INTO activity_log(studio_id,person_id,actor_id,action,details) VALUES($1,$2,$3,$4,$5::jsonb)",
 [auth.studioId,booking.member_id,auth.userId,present?"attendance.checked_in":"attendance.corrected",JSON.stringify({bookingId,reason:present?"":reason})]);
 return {id:bookingId,present,alreadyApplied:false};
}
