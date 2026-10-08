"use client";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {CheckCircle2,Clock3,RefreshCw,Users} from "lucide-react";
import {localDateTimeToUTC} from "../../lib/studio-timezone";

type Preferences={
 timezone:string;timeFormat:"24h"|"12h";classTerm:string;memberTerm:string;creditTerm:string;
 defaultClassDuration:number;defaultClassCapacity:number;defaultRoom:string;
 spotBookingEnabled:boolean;equipmentLabel:string;defaultSpotCount:number;defaultClassFormat:string;
 lateCancelRefundCredit:boolean;noShowRefundCredit:boolean;
};
type ClassRow={
 id:string;title:string;instructor:string;room:string;starts_at:string;duration_minutes:number;capacity:number;
 booking_cutoff_hours:number;cancel_cutoff_hours:number;status:"scheduled"|"cancelled";series_id:string|null;class_format:string;level:string;program_label:string;
 spot_booking_enabled:boolean;spot_label:string;spot_count:number|null;staff_id:string|null;substitute_staff_id:string|null;
 booked_count:number;waitlist_count:number;
};
type Member={id:string;full_name:string;package_status:string|null;credits:number|null;member_status:string|null};
type Booking={id:string;session_id:string;member_id:string;member_name:string;status:"booked"|"waitlisted";queue_number:number|null;attended_at:string|null;spot_number:number|null;no_show_at:string|null};
type Staff={id:string;display_name:string;role:string;availability_notes:string;active:boolean};
type Insights={
 periodDays:number;
 summary:{classes:number;capacity:number;booked:number;attended:number;no_shows:number;late_cancels:number;standard_cancels:number;waitlisted:number;occupancy:number;attendanceRate:number;noShowRate:number;trialConversion:number};
 topClasses:{title:string;classes:number;capacity:number;booked:number;occupancy:number}[];
 instructors:{instructor:string;classes:number;check_ins:number;no_shows:number}[];
 timeSlots:{time_slot:string;classes:number;capacity:number;booked:number;occupancy:number}[];
};
type Section="classes"|"insights"|"settings";

async function api<T>(path:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch(path,{method,credentials:"same-origin",cache:"no-store",headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof data.error==="string"?data.error:"Operation failed.");
 return data as T;
}
const formatLabels:Record<string,string>={group:"Group class",private:"Private",semi_private:"Semi-private",course:"Course / term",open_gym:"Open gym",pt:"Personal training"};
const formats=Object.entries(formatLabels);

export function ClassBasedOperations({role,section,preferences}:{role:string;section:Section;preferences:Preferences}){
 const canManage=["owner","manager"].includes(role),canBook=["owner","manager","receptionist"].includes(role);
 const [classes,setClasses]=useState<ClassRow[]>([]),[members,setMembers]=useState<Member[]>([]),[bookings,setBookings]=useState<Booking[]>([]),[staff,setStaff]=useState<Staff[]>([]);
 const [insights,setInsights]=useState<Insights|null>(null),[selectedClass,setSelectedClass]=useState(""),[selectedMember,setSelectedMember]=useState(""),[selectedSpot,setSelectedSpot]=useState("");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [classSearch,setClassSearch]=useState(""),[classHasMore,setClassHasMore]=useState(false),[classOffset,setClassOffset]=useState(0);
 const [memberSearch,setMemberSearch]=useState(""),[memberHasMore,setMemberHasMore]=useState(false),[memberOffset,setMemberOffset]=useState(0);
 const [repeat,setRepeat]=useState({enabled:false,until:"",weekdays:[1,3,5] as number[]});
 const [editingClass,setEditingClass]=useState(false);
 const [classEdit,setClassEdit]=useState({title:"",instructor:"",room:"",startsAt:"",capacity:8,durationMinutes:50});
 const [staffForm,setStaffForm]=useState({displayName:"",role:"Instructor",availabilityNotes:""});
 const [editingStaff,setEditingStaff]=useState(""),[staffEdit,setStaffEdit]=useState({displayName:"",role:"Instructor",availabilityNotes:""});
 const [schedule,setSchedule]=useState({
  title:"Studio Class",instructor:"Instructor",room:preferences.defaultRoom,startsAt:"",durationMinutes:preferences.defaultClassDuration,capacity:preferences.defaultClassCapacity,
  bookingCutoffHours:0,cancelCutoffHours:12,classFormat:preferences.defaultClassFormat,level:"",programLabel:"",
  spotBookingEnabled:preferences.spotBookingEnabled,spotLabel:preferences.equipmentLabel,spotCount:preferences.defaultSpotCount,staffId:"",substituteStaffId:""
 });

 const selected=classes.find(c=>c.id===selectedClass);
 const occupiedSpots=useMemo(()=>new Set(bookings.filter(b=>b.status==="booked"&&b.spot_number!==null).map(b=>Number(b.spot_number))),[bookings]);
 const classStarted=selected?Date.now()>=new Date(selected.starts_at).getTime():false;
 useEffect(()=>{setEditingClass(false)},[selectedClass]);
 const isFull=selected?selected.booked_count>=selected.capacity:false;

 const refresh=useCallback(async()=>{
  const [c,m,s]=await Promise.all([
   api<{classes:ClassRow[];hasMore:boolean;nextOffset:number}>("/api/studio/classes?search="+encodeURIComponent(classSearch)),
   canBook?api<{members:Member[];hasMore:boolean;nextOffset:number}>("/api/studio/members?search="+encodeURIComponent(memberSearch)):Promise.resolve({members:[] as Member[],hasMore:false,nextOffset:0}),
   api<{staff:Staff[]}>("/api/studio/staff")
  ]);
  setClasses(c.classes);setMembers(m.members);setStaff(s.staff);
  setClassHasMore(c.hasMore);setClassOffset(c.nextOffset);
  setMemberHasMore(m.hasMore);setMemberOffset(m.nextOffset);
  setSelectedClass(v=>c.classes.some(item=>item.id===v)?v:c.classes[0]?.id||"");
  setSelectedMember(v=>m.members.some(item=>item.id===v)?v:m.members[0]?.id||"");
  if(section==="insights")setInsights(await api<Insights>("/api/studio/insights"));
 },[section,canBook,classSearch,memberSearch]);
 useEffect(()=>{void refresh().catch(e=>setMessage(e instanceof Error?e.message:"Could not load operations."))},[refresh]);
 useEffect(()=>{setSchedule(v=>({...v,room:preferences.defaultRoom,durationMinutes:preferences.defaultClassDuration,capacity:preferences.defaultClassCapacity,classFormat:preferences.defaultClassFormat,spotBookingEnabled:preferences.spotBookingEnabled,spotLabel:preferences.equipmentLabel,spotCount:preferences.defaultSpotCount}))},[preferences.defaultRoom,preferences.defaultClassDuration,preferences.defaultClassCapacity,preferences.defaultClassFormat,preferences.spotBookingEnabled,preferences.equipmentLabel,preferences.defaultSpotCount]);
 useEffect(()=>{
  setBookings([]);
  if(!selectedClass)return;
  let obsolete=false;
  void api<{bookings:Booking[]}>("/api/studio/bookings?sessionId="+encodeURIComponent(selectedClass))
   .then(x=>{if(!obsolete)setBookings(x.bookings)})
   .catch(()=>{if(!obsolete)setBookings([])});
  return ()=>{obsolete=true};
 },[selectedClass]);
 useEffect(()=>{
  if(!selected?.spot_booking_enabled||isFull){setSelectedSpot("");return}
  const max=selected.spot_count||selected.capacity;
  const first=Array.from({length:max},(_,i)=>i+1).find(n=>!occupiedSpots.has(n));
  setSelectedSpot(first?String(first):"");
 },[selectedClass,selected?.spot_booking_enabled,selected?.spot_count,selected?.capacity,isFull,occupiedSpots]);

 async function loadMoreClasses(){
  try{const r=await api<{classes:ClassRow[];hasMore:boolean;nextOffset:number}>("/api/studio/classes?search="+encodeURIComponent(classSearch)+"&offset="+classOffset);
   setClasses(v=>[...v,...r.classes.filter(x=>!v.some(old=>old.id===x.id))]);setClassHasMore(r.hasMore);setClassOffset(r.nextOffset)}
  catch(e){setMessage(e instanceof Error?e.message:"Could not load more classes.")}
 }
 async function loadMoreMembers(){
  try{const r=await api<{members:Member[];hasMore:boolean;nextOffset:number}>("/api/studio/members?search="+encodeURIComponent(memberSearch)+"&offset="+memberOffset);
   setMembers(v=>[...v,...r.members.filter(x=>!v.some(old=>old.id===x.id))]);setMemberHasMore(r.hasMore);setMemberOffset(r.nextOffset)}
  catch(e){setMessage(e instanceof Error?e.message:"Could not load more members.")}
 }
 async function perform(work:()=>Promise<string>){
  if(busy)return;setBusy(true);setMessage("");
  try{
   const msg=await work();await refresh();
   if(selectedClass){const b=await api<{bookings:Booking[]}>("/api/studio/bookings?sessionId="+encodeURIComponent(selectedClass));setBookings(b.bookings)}
   setMessage(msg);
  }catch(e){setMessage(e instanceof Error?e.message:"Request failed.")}finally{setBusy(false)}
 }
 function createClass(e:FormEvent){
  e.preventDefault();
  if(!schedule.startsAt){setMessage("Choose a class start time.");return}
  let startsAt:string;try{startsAt=localDateTimeToUTC(schedule.startsAt.slice(0,10),schedule.startsAt.slice(11,16),preferences.timezone)}catch(e){setMessage(e instanceof Error?e.message:"Invalid studio time.");return}
  const activeStaff=staff.find(x=>x.id===schedule.staffId),sub=staff.find(x=>x.id===schedule.substituteStaffId);
  const payload={...schedule,instructor:sub?.display_name||activeStaff?.display_name||schedule.instructor,startsAt,spotCount:schedule.spotBookingEnabled?schedule.spotCount:null};
  void perform(async()=>{
   if(repeat.enabled){
    if(!repeat.until)throw new Error("Select the last day of the recurring series.");
    const r=await api<{classes:{id:string}[]}>("/api/studio/classes/series","POST",{...payload,startDate:schedule.startsAt.slice(0,10),endDate:repeat.until,time:schedule.startsAt.slice(11,16),weekdays:repeat.weekdays});
    return r.classes.length+" recurring "+preferences.classTerm.toLowerCase()+" created.";
   }
   await api("/api/studio/classes","POST",payload);return "Class created.";
  });
 }
 function startClassEdit(){
  if(!selected)return;
  const local=new Intl.DateTimeFormat("sv-SE",{timeZone:preferences.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(selected.starts_at)).replace(" ","T");
  setClassEdit({title:selected.title,instructor:selected.instructor,room:selected.room,startsAt:local,capacity:selected.capacity,durationMinutes:selected.duration_minutes});
  setEditingClass(true);
 }
 function saveClassEdit(e:FormEvent){e.preventDefault();if(!selected)return;
  let startsAt:string;
  try{startsAt=localDateTimeToUTC(classEdit.startsAt.slice(0,10),classEdit.startsAt.slice(11,16),preferences.timezone)}
  catch(error){setMessage(error instanceof Error?error.message:"Invalid class time");return}
  void perform(async()=>{await api("/api/studio/classes/"+selected.id,"PATCH",{...classEdit,startsAt,staffId:null,substituteStaffId:null});
   setEditingClass(false);return "Class updated. Check notification tasks if timing, instructor or room changed."});
 }
 function cancelEntire(){if(!selected||!window.confirm("Cancel this class and refund applicable booked credits?"))return;
  void perform(async()=>{const result=await api<{class:{affected:number;creditsRefunded:number}}>("/api/studio/classes/"+selected.id,"DELETE");
   return "Class cancelled. "+result.class.affected+" affected reservations, "+result.class.creditsRefunded+" credits refunded. Notify members using Follow-ups."});
 }
 function book(e:FormEvent){e.preventDefault();if(!selectedClass||!selectedMember)return;
  void perform(async()=>{
   const r=await api<{booking:{status:string;alreadyExists:boolean;spot_number:number|null}}>("/api/studio/bookings","POST",{sessionId:selectedClass,memberId:selectedMember,spotNumber:selectedSpot?Number(selectedSpot):null});
   if(r.booking.alreadyExists)return "This member already has a booking or waitlist place.";
   return r.booking.status==="waitlisted"?"Class full: member added to the waitlist.":"Booking confirmed"+(r.booking.spot_number?" · "+selected?.spot_label+" "+r.booking.spot_number:"")+".";
  });
 }
 function cancel(b:Booking){
  const late=selected&&selected.cancel_cutoff_hours>0&&Date.now()>=new Date(selected.starts_at).getTime()-selected.cancel_cutoff_hours*3600000&&!classStarted;
  if(!window.confirm((late?"Late cancel ":"Cancel ")+b.member_name+"?"))return;
  void perform(async()=>{
   const r=await api<{booking:{cancellationType:"standard"|"late";promoted:{id:string}|null}}>("/api/studio/bookings/"+b.id,"DELETE");
   return r.booking.cancellationType==="late"?"Late cancellation recorded"+(preferences.lateCancelRefundCredit?" with credit refund.":"; credit retained."):(r.booking.promoted?"Cancelled; next waitlisted member promoted.":"Booking cancelled.");
  });
 }
 function attendance(b:Booking){
  if(b.attended_at){const reason=window.prompt("Reason for correcting check-in (minimum 5 characters):");if(!reason)return;void perform(async()=>{await api("/api/studio/bookings/"+b.id+"/attendance","DELETE",{reason});return "Check-in corrected."})}
  else void perform(async()=>{await api("/api/studio/bookings/"+b.id+"/attendance","POST");return "Member checked in."});
 }
 function noShow(b:Booking){
  if(b.no_show_at){const reason=window.prompt("Reason for correcting no-show (minimum 5 characters):");if(!reason)return;void perform(async()=>{await api("/api/studio/bookings/"+b.id+"/status","POST",{noShow:false,reason});return "No-show corrected."})}
  else if(window.confirm("Mark "+b.member_name+" as a no-show?"))void perform(async()=>{await api("/api/studio/bookings/"+b.id+"/status","POST",{noShow:true});return "No-show recorded"+(preferences.noShowRefundCredit?" with credit refund.":".")});
 }
 function addStaff(e:FormEvent){e.preventDefault();void perform(async()=>{await api("/api/studio/staff","POST",staffForm);setStaffForm({displayName:"",role:"Instructor",availabilityNotes:""});return "Staff roster updated."})}
 function saveStaff(e:FormEvent){e.preventDefault();if(!editingStaff)return;void perform(async()=>{await api("/api/studio/staff/"+editingStaff,"PATCH",staffEdit);setEditingStaff("");return "Staff details updated."})}
 function toggleStaff(person:Staff){void perform(async()=>{await api("/api/studio/staff/"+person.id,"PATCH",{active:!person.active});return person.active?"Staff member archived from active scheduling.":"Staff member restored."})}

 if(section==="classes")return <section className="rd-ops rd-class-os">
  {message&&<div className="rd-feedback" role="status">{message}</div>}
  <div className="rd-ops-section">
   <div className="rd-ops-section-title"><div><h3>{preferences.classTerm} operations</h3><p>Recurring schedule, waitlist, check-in, no-show, cancellation rules and configurable equipment spots.</p></div><button type="button" onClick={()=>void refresh()}><RefreshCw size={15}/> Refresh</button></div>
   {canManage&&<details className="rd-ops-details"><summary>Create class or recurring series</summary><form className="rd-form rd-class-create" onSubmit={createClass}>
    <div className="rd-ops-pair"><label>Name<input required minLength={2} maxLength={100} value={schedule.title} onChange={e=>setSchedule({...schedule,title:e.target.value})}/></label><label>Format<select value={schedule.classFormat} onChange={e=>setSchedule({...schedule,classFormat:e.target.value})}>{formats.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
    <div className="rd-ops-pair"><label>Level / track<input maxLength={60} placeholder="Beginner, Level 2, All levels" value={schedule.level} onChange={e=>setSchedule({...schedule,level:e.target.value})}/></label><label>Course / term label<input maxLength={80} placeholder="Spring term, 6-week course" value={schedule.programLabel} onChange={e=>setSchedule({...schedule,programLabel:e.target.value})}/></label></div>
    <div className="rd-ops-pair"><label>Primary instructor<select value={schedule.staffId} onChange={e=>{const p=staff.find(x=>x.id===e.target.value);setSchedule({...schedule,staffId:e.target.value,instructor:p?.display_name||schedule.instructor})}}><option value="">Manual / external</option>{staff.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.display_name} · {x.role}</option>)}</select></label><label>Substitute<select value={schedule.substituteStaffId} onChange={e=>setSchedule({...schedule,substituteStaffId:e.target.value})}><option value="">None</option>{staff.filter(x=>x.active&&x.id!==schedule.staffId).map(x=><option key={x.id} value={x.id}>{x.display_name}</option>)}</select></label></div>
    {!schedule.staffId&&<label>Instructor name<input required minLength={2} maxLength={80} value={schedule.instructor} onChange={e=>setSchedule({...schedule,instructor:e.target.value})}/></label>}
    <div className="rd-ops-pair"><label>Room<input required maxLength={80} value={schedule.room} onChange={e=>setSchedule({...schedule,room:e.target.value})}/></label><label>Starts in {preferences.timezone}<input type="datetime-local" required value={schedule.startsAt} onChange={e=>setSchedule({...schedule,startsAt:e.target.value})}/></label></div>
    <div className="rd-ops-pair"><label>Duration (minutes)<input type="number" min={15} max={240} value={schedule.durationMinutes} onChange={e=>setSchedule({...schedule,durationMinutes:Number(e.target.value)})}/></label><label>Capacity<input type="number" min={1} max={100} value={schedule.capacity} onChange={e=>setSchedule({...schedule,capacity:Number(e.target.value),spotCount:Math.max(schedule.spotCount,Number(e.target.value))})}/></label></div>
    <div className="rd-ops-pair"><label>Booking closes before class (hours)<input type="number" min={0} max={168} value={schedule.bookingCutoffHours} onChange={e=>setSchedule({...schedule,bookingCutoffHours:Number(e.target.value)})}/></label><label>Late-cancel cutoff (hours)<input type="number" min={0} max={168} value={schedule.cancelCutoffHours} onChange={e=>setSchedule({...schedule,cancelCutoffHours:Number(e.target.value)})}/></label></div>
    <label className="rd-check"><input type="checkbox" checked={schedule.spotBookingEnabled} onChange={e=>setSchedule({...schedule,spotBookingEnabled:e.target.checked})}/> Numbered equipment / spot booking</label>
    {schedule.spotBookingEnabled&&<div className="rd-ops-pair"><label>Spot label<input minLength={2} maxLength={40} value={schedule.spotLabel} onChange={e=>setSchedule({...schedule,spotLabel:e.target.value})}/></label><label>Number of spots<input type="number" min={schedule.capacity} max={100} value={schedule.spotCount} onChange={e=>setSchedule({...schedule,spotCount:Number(e.target.value)})}/></label></div>}
    <label className="rd-check"><input type="checkbox" checked={repeat.enabled} onChange={e=>setRepeat({...repeat,enabled:e.target.checked})}/> Repeat weekly</label>
    {repeat.enabled&&<div className="rd-repeat-config"><strong>Repeat on</strong><div className="rd-weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day,index)=><button type="button" key={day} className={repeat.weekdays.includes(index)?"selected":""} aria-pressed={repeat.weekdays.includes(index)} onClick={()=>setRepeat(v=>({...v,weekdays:v.weekdays.includes(index)?v.weekdays.filter(x=>x!==index):[...v.weekdays,index]}))}>{day}</button>)}</div><label>Repeat until<input type="date" value={repeat.until} onChange={e=>setRepeat({...repeat,until:e.target.value})}/></label></div>}
    <button className="rd-primary" disabled={busy}>{repeat.enabled?"Create recurring series":"Create class"}</button>
   </form></details>}
   <label>Search classes<input aria-label="Search classes" value={classSearch} onChange={e=>setClassSearch(e.target.value)} placeholder="Class, room or instructor"/></label>
   <div className="rd-class-list">{classes.length?classes.map(c=><button key={c.id} className={"rd-class-choice"+(selectedClass===c.id?" selected":"")} onClick={()=>setSelectedClass(c.id)}><strong>{c.title} · {new Date(c.starts_at).toLocaleString("en-GB",{timeZone:preferences.timezone,month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:preferences.timeFormat==="12h"})}</strong><small>{c.instructor} · {c.room} · {formatLabels[c.class_format]||c.class_format}{c.level?" · "+c.level:""}{c.program_label?" · "+c.program_label:""}</small><span>{c.status==="cancelled"?"CANCELLED · ":""}{c.booked_count}/{c.capacity} booked · {c.waitlist_count} waiting{c.spot_booking_enabled?" · "+c.spot_label+" selection":""}</span></button>):<p className="rd-empty">No matching classes in the next 90 days.</p>}</div>
   {classHasMore&&<button disabled={busy} type="button" onClick={()=>void loadMoreClasses()}>Load more classes</button>}
   {selected&&<div className="rd-ops-subsection">
     {canManage&&!classStarted&&selected.status==="scheduled"&&<div className="rd-ops-section">
      <button type="button" disabled={busy} onClick={startClassEdit}>Edit selected class</button>
      <button type="button" disabled={busy} onClick={cancelEntire}>Cancel entire class and refund credits</button>
      {editingClass&&<form className="rd-form" onSubmit={saveClassEdit}>
       <label>Class name<input required minLength={2} value={classEdit.title} onChange={e=>setClassEdit(v=>({...v,title:e.target.value}))}/></label>
       <label>Instructor<input required minLength={2} value={classEdit.instructor} onChange={e=>setClassEdit(v=>({...v,instructor:e.target.value}))}/></label>
       <label>Room<input required minLength={2} value={classEdit.room} onChange={e=>setClassEdit(v=>({...v,room:e.target.value}))}/></label>
       <label>Start ({preferences.timezone})<input required type="datetime-local" value={classEdit.startsAt} onChange={e=>setClassEdit(v=>({...v,startsAt:e.target.value}))}/></label>
       <label>Capacity<input required type="number" min={selected.booked_count} max={100} value={classEdit.capacity} onChange={e=>setClassEdit(v=>({...v,capacity:Number(e.target.value)}))}/></label>
       <label>Duration (minutes)<input required type="number" min={15} max={240} value={classEdit.durationMinutes} onChange={e=>setClassEdit(v=>({...v,durationMinutes:Number(e.target.value)}))}/></label>
       <button className="rd-primary" disabled={busy}>Save class changes</button>
       <button type="button" onClick={()=>setEditingClass(false)}>Close</button>
      </form>}
     </div>}
     {selected.status==="cancelled"&&<p role="status">This class was cancelled. No new reservations are permitted.</p>}
    <div className="rd-class-rule-strip"><span><Clock3 size={14}/> Booking cutoff {selected.booking_cutoff_hours}h</span><span>Late cancel {selected.cancel_cutoff_hours}h</span>{selected.spot_booking_enabled&&<span>{selected.spot_count} × {selected.spot_label}</span>}</div>
    {canBook&&selected.status==="scheduled"&&<form className="rd-form rd-book-form" onSubmit={book}>
     <label>Search members<input aria-label="Search members" value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="Member name, email or phone"/></label>
     {memberHasMore&&<button type="button" onClick={()=>void loadMoreMembers()}>Load more members</button>}<div className="rd-ops-pair"><label>{preferences.memberTerm.slice(0,-1)||"Member"}<select required value={selectedMember} onChange={e=>setSelectedMember(e.target.value)}><option value="">Select</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.credits===null?"Unlimited":m.credits+" "+preferences.creditTerm.toLowerCase()}</option>)}</select></label>{selected.spot_booking_enabled&&!isFull&&<label>{selected.spot_label}<select required value={selectedSpot} onChange={e=>setSelectedSpot(e.target.value)}><option value="">Choose</option>{Array.from({length:selected.spot_count||selected.capacity},(_,i)=>i+1).map(n=><option key={n} value={n} disabled={occupiedSpots.has(n)}>{selected.spot_label} {n}{occupiedSpots.has(n)?" · booked":""}</option>)}</select></label>}</div><button className="rd-primary" disabled={busy||!selectedMember||(selected.spot_booking_enabled&&!isFull&&!selectedSpot)}>{isFull?"Join waitlist":"Book member"}</button></form>}
    <div className="rd-booking-list">{bookings.length?bookings.map(b=><div key={b.id}><span><b>{b.member_name}</b><small>{b.status}{b.status==="waitlisted"?" · waitlist #"+b.queue_number:""}{b.spot_number?" · "+selected.spot_label+" "+b.spot_number:""}{b.attended_at?" · checked in":""}{b.no_show_at?" · no-show":""}</small></span><div className="rd-booking-actions">{b.status==="booked"&&!b.no_show_at&&<button disabled={busy} onClick={()=>attendance(b)}>{b.attended_at?"Correct check-in":"Check in"}</button>}{b.status==="booked"&&classStarted&&!b.attended_at&&<button disabled={busy} onClick={()=>noShow(b)}>{b.no_show_at?"Correct no-show":"No-show"}</button>}{canBook&&selected.status==="scheduled"&&!classStarted&&<button disabled={busy||Boolean(b.attended_at)} onClick={()=>cancel(b)}>Cancel</button>}</div></div>):<p className="rd-empty">No active bookings in this class.</p>}</div>
   </div>}
  </div>
 </section>;

 if(section==="insights")return <section className="rd-ops rd-class-os">
  {message&&<div className="rd-feedback" role="status">{message}</div>}
  <div className="rd-ops-section"><div className="rd-ops-section-title"><div><h3>30-day operational insights</h3><p>Capacity, attendance, no-shows, late cancellations, trials and instructor activity from the studio's own records.</p></div><button onClick={()=>void refresh()}><RefreshCw size={15}/> Refresh</button></div>
   {insights?<><div className="rd-os-metrics"><article><small>OCCUPANCY</small><strong>{insights.summary.occupancy}%</strong></article><article><small>ATTENDANCE</small><strong>{insights.summary.attendanceRate}%</strong></article><article><small>NO-SHOW RATE</small><strong>{insights.summary.noShowRate}%</strong></article><article><small>LATE CANCELS</small><strong>{insights.summary.late_cancels}</strong></article><article><small>PIPELINE WON (EST.)</small><strong>{insights.summary.trialConversion}%</strong></article><article><small>CLASSES</small><strong>{insights.summary.classes}</strong></article></div>
    <div className="rd-os-report-grid"><section><h4>Class utilization</h4>{insights.topClasses.length?insights.topClasses.map(x=><div className="rd-os-report-row" key={x.title}><span><b>{x.title}</b><small>{x.classes} classes · {x.booked}/{x.capacity} booked places</small></span><strong>{x.occupancy}%</strong></div>):<p className="rd-empty">No completed class data yet.</p>}</section><section><h4>Popular time slots</h4>{insights.timeSlots.length?insights.timeSlots.map(x=><div className="rd-os-report-row" key={x.time_slot}><span><b>{x.time_slot}</b><small>{x.classes} classes · {x.booked}/{x.capacity} booked places</small></span><strong>{x.occupancy}%</strong></div>):<p className="rd-empty">No time-slot history yet.</p>}</section><section><h4>Instructor activity</h4>{insights.instructors.length?insights.instructors.map(x=><div className="rd-os-report-row" key={x.instructor}><span><b>{x.instructor}</b><small>{x.classes} classes · {x.check_ins} check-ins</small></span><strong>{x.no_shows} no-show</strong></div>):<p className="rd-empty">No instructor history yet.</p>}</section></div>
   </>:<p className="rd-empty">Loading operational history…</p>}
  </div>
 </section>;

 return <section className="rd-ops rd-class-os">
  {message&&<div className="rd-feedback" role="status">{message}</div>}
  <div className="rd-ops-section"><div className="rd-ops-section-title"><div><h3>Staff & instructor roster</h3><p>Operational roster for scheduling and substitutions. Login permissions remain separate.</p></div><Users size={20}/></div>
   {canManage&&<details className="rd-ops-details"><summary>Add staff member</summary><form className="rd-form" onSubmit={addStaff}><div className="rd-ops-pair"><label>Name<input required minLength={2} maxLength={80} value={staffForm.displayName} onChange={e=>setStaffForm({...staffForm,displayName:e.target.value})}/></label><label>Role<select value={staffForm.role} onChange={e=>setStaffForm({...staffForm,role:e.target.value})}>{["Instructor","Coach","Front desk","Manager","Other"].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Availability notes<textarea rows={3} maxLength={500} placeholder="Tue–Thu evenings, no Fridays…" value={staffForm.availabilityNotes} onChange={e=>setStaffForm({...staffForm,availabilityNotes:e.target.value})}/></label><button className="rd-primary" disabled={busy}>Add to roster</button></form></details>}
   <div className="rd-staff-grid">{staff.length?staff.map(x=><article key={x.id} className={x.active?"":"is-inactive"}><div><CheckCircle2 size={18}/><span><b>{x.display_name}</b><small>{x.role}</small></span></div>{editingStaff===x.id?<form className="rd-form rd-staff-edit" onSubmit={saveStaff}><label>Name<input required minLength={2} maxLength={80} value={staffEdit.displayName} onChange={e=>setStaffEdit({...staffEdit,displayName:e.target.value})}/></label><label>Role<select value={staffEdit.role} onChange={e=>setStaffEdit({...staffEdit,role:e.target.value})}>{["Instructor","Coach","Front desk","Manager","Other"].map(role=><option key={role}>{role}</option>)}</select></label><label>Availability<textarea rows={3} maxLength={500} value={staffEdit.availabilityNotes} onChange={e=>setStaffEdit({...staffEdit,availabilityNotes:e.target.value})}/></label><div className="rd-staff-actions"><button className="rd-primary" disabled={busy}>Save</button><button type="button" onClick={()=>setEditingStaff("")}>Cancel</button></div></form>:<><p>{x.availability_notes||"No availability notes."}</p>{canManage&&<div className="rd-staff-actions"><button onClick={()=>{setEditingStaff(x.id);setStaffEdit({displayName:x.display_name,role:x.role,availabilityNotes:x.availability_notes})}} disabled={busy}>Edit</button><button onClick={()=>toggleStaff(x)} disabled={busy}>{x.active?"Archive":"Restore"}</button></div>}</>}</article>):<p className="rd-empty">No staff roster yet. Add instructors before assigning substitutions.</p>}</div>
  </div>
 </section>;
}
