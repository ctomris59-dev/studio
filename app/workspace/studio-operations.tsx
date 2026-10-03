"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {localDateTimeToUTC} from "../../lib/studio-timezone";

type ClassRow={
 id:string;title:string;instructor:string;room:string;starts_at:string;
 duration_minutes:number;capacity:number;booked_count:number;waitlist_count:number;
};
type MemberRow={
 id:string;full_name:string;email:string;phone:string;
 credits:number|null;plan:string|null;package_status:"Pending"|"Paid"|null;member_status:string|null;
 expiry_date:string|null;
};
type BookingRow={id:string;session_id:string;member_id:string;member_name:string;status:"booked"|"waitlisted";queue_number:number|null;attended_at:string|null};
type TaskRow={id:string;title:string;person_name:string;due_at:string;category:string;priority:string};
type StudioPack={id:string;name:string;description:string;currency:string;price_cents:number;credits:number;valid_days:number;active:boolean};
type ConnectStatus={connected:boolean;configured:boolean;chargesEnabled:boolean;country?:string;detailsSubmitted?:boolean};
type PaymentOrder={id:string;status:string;amount_cents:number;currency:string;created_at:string;member_name:string;package_name:string};
type Signal={
 id:string;kind:string;priority:"high"|"medium"|"low";title:string;reason:string;
 suggestedAction:string;personId?:string;sessionId?:string;
};
type ActionReply={items:Signal[];total:number;rules:string};

async function api<T>(path:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch(path,{
  method,credentials:"same-origin",cache:"no-store",
  headers:body===undefined?undefined:{"Content-Type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 let data:Record<string,unknown>;
 try{data=await response.json() as Record<string,unknown>}catch{data={}};
 if(!response.ok)throw new Error(typeof data.error==="string"?data.error:"Operation failed ("+response.status+").");
 return data as T;
}
function classLabel(c:ClassRow,timezone:string){
 return c.title+" · "+new Date(c.starts_at).toLocaleString("en-GB",{timeZone:timezone,month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
export function StudioOperations({role}:{role:string}){
 const owner=["owner","manager"].includes(role);
 const [classes,setClasses]=useState<ClassRow[]>([]);
 const [members,setMembers]=useState<MemberRow[]>([]);
 const [bookings,setBookings]=useState<BookingRow[]>([]);
 const [actions,setActions]=useState<Signal[]>([]);
 const [tasks,setTasks]=useState<TaskRow[]>([]);
 const [selectedClass,setSelectedClass]=useState("");
 const [selectedMember,setSelectedMember]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [schedule,setSchedule]=useState({title:"Studio Class",instructor:"Instructor",room:"Main studio",startsAt:"",durationMinutes:50,capacity:8});
 const [studioZone,setStudioZone]=useState("UTC");
 const [packs,setPacks]=useState<StudioPack[]>([]);
 const [orders,setOrders]=useState<PaymentOrder[]>([]);
 const [connect,setConnect]=useState<ConnectStatus|null>(null);
 const [country,setCountry]=useState("US");
 const [packForm,setPackForm]=useState({name:"10 Class Pack",description:"",credits:10,validDays:60,price:"99",currency:"usd"});
 const [repeat,setRepeat]=useState({enabled:false,until:"",weekdays:[1,3,5] as number[]});
 const [adjust,setAdjust]=useState({memberId:"",delta:5,reason:"Credit balance correction"});
 const [selectedPlan,setSelectedPlan]=useState<Record<string,string>>({});
 const [taskOutcomes,setTaskOutcomes]=useState<Record<string,string>>({});
 const [billing,setBilling]=useState<{subscription:{status:string;plan:string;enabled:boolean;periodEnd:string|null};checkoutConfigured:boolean}|null>(null);
 const refresh=useCallback(async()=>{
  const [c,m,a,t]=await Promise.all([
   api<{classes:ClassRow[]}>("/api/studio/classes"),
   api<{members:MemberRow[]}>("/api/studio/members"),
   api<ActionReply>("/api/studio/action-center"),
   api<{tasks:TaskRow[]}>("/api/studio/tasks")
  ]);
  setClasses(c.classes);setMembers(m.members);setActions(a.items);setTasks(t.tasks);
  if(owner){
   void api<{packages:StudioPack[]}>("/api/studio/packages").then(x=>setPacks(x.packages)).catch(()=>{});
   void api<{orders:PaymentOrder[]}>("/api/studio/payments/orders").then(x=>setOrders(x.orders)).catch(()=>{});
   void api<ConnectStatus>("/api/studio/payments/connect").then(setConnect).catch(()=>setConnect(null));
  }
  void api<{studio:{timezone:string}}>("/api/studio/settings").then(s=>setStudioZone(s.studio.timezone)).catch(()=>setMessage("Check your studio timezone in settings."));
  void api<{subscription:{status:string;plan:string;enabled:boolean;periodEnd:string|null};checkoutConfigured:boolean}>("/api/studio/subscription").then(setBilling).catch(()=>setBilling(null));
  setSelectedClass(old=>old||c.classes[0]?.id||"");
  setSelectedMember(old=>old||m.members[0]?.id||"");
  setAdjust(old=>({...old,memberId:old.memberId||m.members[0]?.id||""}));
 },[]);
 useEffect(()=>{void refresh().catch(e=>setMessage(e instanceof Error?e.message:"Could not load studio data."))},[refresh]);
 useEffect(()=>{
  if(!selectedClass){setBookings([]);return;}
  void api<{bookings:BookingRow[]}>("/api/studio/bookings?sessionId="+encodeURIComponent(selectedClass))
    .then(d=>setBookings(d.bookings)).catch(()=>setBookings([]));
 },[selectedClass]);
 async function perform(work:()=>Promise<string>){
  if(busy)return;
  setBusy(true);setMessage("");
  try{
   const info=await work();
   await refresh();
   if(selectedClass){
    const result=await api<{bookings:BookingRow[]}>("/api/studio/bookings?sessionId="+encodeURIComponent(selectedClass));
    setBookings(result.bookings);
   }
   setMessage(info);
  }catch(e){setMessage(e instanceof Error?e.message:"Request failed.")}
  finally{setBusy(false)}
 }
 function createSession(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!schedule.startsAt){setMessage("Choose a class start time.");return;}
  let isoStart:string;
  try{isoStart=localDateTimeToUTC(schedule.startsAt.slice(0,10),schedule.startsAt.slice(11,16),studioZone)}
  catch(e){setMessage(e instanceof Error?e.message:"Invalid studio time.");return}
  void perform(async()=>{
   const detail={title:schedule.title,instructor:schedule.instructor,room:schedule.room,startsAt:isoStart,durationMinutes:schedule.durationMinutes,capacity:schedule.capacity};
   if(repeat.enabled){
    if(!repeat.until)throw Error("Select the last day of the series.");
    const result=await api<{classes:ClassRow[]}>("/api/studio/classes/series","POST",{
     ...detail,startDate:schedule.startsAt.slice(0,10),endDate:repeat.until,time:schedule.startsAt.slice(11,16),weekdays:repeat.weekdays
    });
    return result.classes.length+" recurring classes created with transaction-safe conflict checks.";
   }
   await api("/api/studio/classes","POST",detail);
   return "Class created in "+studioZone+" with conflict protection.";
  });
 }
 function book(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!selectedClass||!selectedMember)return;
  void perform(async()=>{
   const result=await api<{booking:{status:string;alreadyExists:boolean}}>("/api/studio/bookings","POST",{
    sessionId:selectedClass,memberId:selectedMember
   });
   return result.booking.alreadyExists?"This member already has a booking/waitlist place.":
    result.booking.status==="waitlisted"?"Class full: added to waiting list; no credit deducted.":
    "Booking confirmed; one class credit deducted if applicable.";
  });
 }
 function cancel(booking:BookingRow){
  if(!window.confirm("Cancel "+booking.member_name+"'s "+booking.status+" entry? An eligible waitlist member may be promoted."))return;
  void perform(async()=>{
   const response=await api<{booking:{promoted:{id:string}|null;alreadyCancelled:boolean}}>(
    "/api/studio/bookings/"+booking.id,"DELETE");
   return response.booking.alreadyCancelled?"Booking was already cancelled.":
    response.booking.promoted?"Cancelled, refunded credit and promoted next eligible waitlisted member.":
    "Booking cancelled. Class credit returned when it was originally deducted.";
  });
 }
 function markAttendance(booking:BookingRow){
  if(booking.attended_at){
   const reason=window.prompt("Why are you correcting this check-in? At least five characters are required.");
   if(!reason)return;
   void perform(async()=>{await api("/api/studio/bookings/"+booking.id+"/attendance","DELETE",{reason});return "Check-in corrected and audited."});
  }else void perform(async()=>{await api("/api/studio/bookings/"+booking.id+"/attendance","POST");return "Class attendance recorded and member last visit updated."});
 }
 function confirm(member:MemberRow){
  if(!owner)return;
  const plan=selectedPlan[member.id]||"10 Class Pack";
  const credits=plan==="Unlimited Monthly"?0:plan==="5 Class Pack"?5:10;
  if(!window.confirm("Manually confirm "+member.full_name+"'s "+plan+
    "? This does NOT charge or verify a payment; it activates "+(plan==="Unlimited Monthly"?"unlimited access":credits+" credits")+"."))return;
  void perform(async()=>{
   await api("/api/studio/members/"+member.id+"/package","POST",{plan,credits});
   return "Package manually confirmed. No payment collected.";
  });
 }
 function adjustCredits(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!owner||!adjust.memberId)return;
  const member=members.find(m=>m.id===adjust.memberId);
  if(!member)return;
  if(!window.confirm((adjust.delta>0?"Add ":"Remove ")+Math.abs(adjust.delta)+" credits "+
    (adjust.delta>0?"to ":"from ")+member.full_name+"? A ledger entry will be stored."))return;
  // One UUID for this explicit operation. Retry of this request is safe server-side.
  const requestKey=crypto.randomUUID();
  void perform(async()=>{
   const reply=await api<{adjustment:{credits:number;alreadyApplied:boolean}}>(
    "/api/studio/members/"+member.id+"/credits","POST",
    {delta:adjust.delta,reason:adjust.reason,requestKey});
   return "Class credits now: "+reply.adjustment.credits+". Reversal requires a new audited correction.";
  });
 }
 function sendInvite(m:MemberRow){
  if(!m.email){setMessage("Member must have an email address.");return;}
  if(!window.confirm("Queue a secure invitation to "+m.email+"? Email dispatch must be configured."))return;
  void perform(async()=>{
   const result=await api<{notice:string}>("/api/studio/invitations","POST",{memberId:m.id});
   return result.notice;
  });
 }
 function openPaymentDashboard(){
  void perform(async()=>{
   const result=await api<{dashboardUrl:string}>("/api/studio/payments/dashboard","POST");
   if(!/^https:\/\/connect\.stripe\.com\//.test(result.dashboardUrl)&&!result.dashboardUrl.startsWith("http://127.0.0.1:"))
    throw Error("Unexpected payment dashboard location.");
   window.location.assign(result.dashboardUrl);
   return "Opening Stripe Express dashboard.";
  });
 }
 function addPack(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const priceCents=Math.round(Number(packForm.price)*100);
  if(!Number.isSafeInteger(priceCents)){setMessage("Invalid price.");return;}
  void perform(async()=>{await api("/api/studio/packages","POST",{...packForm,priceCents});
   return "Studio class package published. Members can see it in their account.";});
 }
 function togglePack(p:StudioPack){
  void perform(async()=>{await api("/api/studio/packages/"+p.id,"PATCH",{active:!p.active});
   return p.active?"Package hidden from new sales. Existing orders remain unchanged.":"Package available again.";});
 }
 function connectStripe(){
  void perform(async()=>{
   const r=await api<{onboardingUrl:string}>("/api/studio/payments/connect","POST",{country});
   if(!/^https:\/\/connect\.stripe\.com\//.test(r.onboardingUrl)&&!r.onboardingUrl.startsWith("http://127.0.0.1:"))
    throw Error("Unexpected account onboarding location.");
   window.location.assign(r.onboardingUrl);
   return "Opening Stripe secure account onboarding.";
  });
 }
 function startCheckout(plan:"monthly"|"annual"){
  if(!billing?.checkoutConfigured){setMessage("Checkout is not configured. No payment was started.");return;}
  void perform(async()=>{
   const result=await api<{checkoutUrl:string}>("/api/studio/subscription","POST",{plan});
   window.location.assign(result.checkoutUrl);
   return "Opening secure payment checkout.";
  });
 }
 function createTaskFor(item:Signal){
  if(!item.personId)return;
  const title=item.kind==="lead_followup"?"Follow up with lead":
   item.kind==="expiring_pass"?"Discuss membership renewal":"Review class pack renewal";
  void perform(async()=>{
   await api("/api/studio/tasks","POST",{
    personId:item.personId,title,
    dueAt:new Date(Date.now()+86400000).toISOString(),
    category:item.kind==="lead_followup"?"Call":"Renewal",priority:item.priority==="high"?"High":"Normal"
   });
   return "Follow-up task added to your action list. No message was sent.";
  });
 }
 function completeTask(task:TaskRow){
  const outcome=taskOutcomes[task.id]||"Contacted";
  if(!window.confirm("Mark this follow-up completed as '"+outcome+"'?"))return;
  void perform(async()=>{
   await api("/api/studio/tasks/"+task.id,"PATCH",{outcome});
   return "Follow-up outcome saved to studio history.";
  });
 }
 return <div className="rd-ops" aria-label="Live studio operations">
  {owner&&<section className="rd-ops-section">
   <div className="rd-ops-section-title"><div><h3>StudioTasker subscription</h3>
    <p>Monthly or annual access managed by the payment provider. This workspace does not collect card details.</p></div></div>
   <p><strong>{billing?.subscription.plan||"No plan"} · {billing?.subscription.status||"Inactive"}</strong>
    {billing?.subscription.periodEnd&&" · Through "+new Date(billing.subscription.periodEnd).toLocaleDateString()}</p>
   {billing?.checkoutConfigured?<div className="rd-contact-actions">
    <button type="button" disabled={busy} onClick={()=>startCheckout("monthly")}>Choose monthly</button>
    <button type="button" disabled={busy} onClick={()=>startCheckout("annual")}>Choose annual</button>
   </div>:<p className="rd-tiny">Payment provider credentials are intentionally absent. Checkout is disabled; no charges can be made.</p>}
  </section>}
  {owner&&<section className="rd-ops-section" aria-labelledby="studio-packs-title">
   <div className="rd-ops-section-title"><div><h3 id="studio-packs-title">Member packages &amp; payments</h3>
    <p>Sell your own class packs. StudioTasker's $49/month SaaS fee is separate; class-pack revenue belongs to your studio.</p></div></div>
   <div className="rd-commerce-status"><strong>Stripe Connect:</strong> {connect?.chargesEnabled?"Ready to accept live member payments":connect?.connected?"Onboarding incomplete — finish setup to accept payments":"Not connected"}
    {!connect?.configured&&<p>Online payments are disabled until secure platform credentials and webhook processing are configured.</p>}</div>
   {connect?.configured&&<div className="rd-connect-row">
    {connect.connected&&<button type="button" disabled={busy} onClick={openPaymentDashboard}>View Stripe payment dashboard ↗</button>}
    {!connect.chargesEnabled&&<><label>Registered country<select value={country} onChange={e=>setCountry(e.target.value)}>
     {["US","GB","CA","AU","DE","FR","IT","ES","IE","NL","BE","AT","PT","FI","SE","NO","DK","PL","CH"].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <button type="button" disabled={busy} onClick={connectStripe}>{connect.connected?"Complete Stripe onboarding":"Connect studio's Stripe account"}</button></>}
   </div>}
   <details className="rd-ops-details"><summary>Member payment history / refunds</summary>
    <div className="rd-member-purchases">
     {orders.length?orders.map(order=><div key={order.id} className={"rd-commerce-order"+(["refunded","disputed"].includes(order.status)?" review":"")}>
      <strong>{order.member_name} · {order.package_name}</strong>
      <span>{(order.amount_cents/100).toFixed(2)} {order.currency.toUpperCase()} · {order.status==="paid"?"Paid & activated":order.status==="pending"?"Checkout pending":order.status==="refunded"?"REFUND — review member credits":"DISPUTE — review member credits"} · {new Date(order.created_at).toLocaleDateString("en-GB")}</span>
     </div>):<p className="rd-tiny">No member package checkout transactions yet.</p>}
    </div>
   </details>
   <details className="rd-ops-details"><summary>Create a class package</summary><form className="rd-form" onSubmit={addPack}>
    <label>Package name<input required minLength={2} maxLength={70} value={packForm.name} onChange={e=>setPackForm({...packForm,name:e.target.value})}/></label>
    <label>Description (optional)<input maxLength={240} value={packForm.description} onChange={e=>setPackForm({...packForm,description:e.target.value})}/></label>
    <div className="rd-ops-pair"><label>Price<input type="number" min="1" max="10000" step="0.01" required value={packForm.price} onChange={e=>setPackForm({...packForm,price:e.target.value})}/></label>
     <label>Currency<select value={packForm.currency} onChange={e=>setPackForm({...packForm,currency:e.target.value})}>{["usd","eur","gbp","cad","aud"].map(x=><option key={x} value={x}>{x.toUpperCase()}</option>)}</select></label></div>
    <div className="rd-ops-pair"><label>Classes included<input type="number" min="1" max="100" required value={packForm.credits} onChange={e=>setPackForm({...packForm,credits:Number(e.target.value)})}/></label>
     <label>Validity (days)<input type="number" min="7" max="365" required value={packForm.validDays} onChange={e=>setPackForm({...packForm,validDays:Number(e.target.value)})}/></label></div>
    <button className="rd-primary" type="submit" disabled={busy}>Publish package</button>
   </form></details>
   <div className="rd-pack-list">{packs.length?packs.map(p=><div key={p.id}><div><strong>{p.name} · {(p.price_cents/100).toFixed(2)} {p.currency.toUpperCase()}</strong>
    <small>{p.credits} classes · {p.valid_days} days · {p.active?"Listed":"Hidden"}</small></div>
    <button type="button" disabled={busy} onClick={()=>togglePack(p)}>{p.active?"Hide":"Republish"}</button>
   </div>):<p className="rd-empty">No paid packages yet. Create one before inviting members to purchase.</p>}</div>
  </section>}
  <div className="rd-ops-heading"><div><p className="rd-eyebrow">DATABASE-BACKED OPERATIONS</p><h2>Studio daily operations</h2><p>All records below are scoped to your authenticated studio. Sample /demo data is separate.</p></div>
   <button type="button" disabled={busy} onClick={()=>void perform(async()=>"Latest workspace records loaded.")}>Refresh</button></div>
  {message&&<div className="rd-feedback" role="status">{message}</div>}
  <section className="rd-ops-section">
   <div className="rd-ops-section-title"><div><h3>Action center</h3><p>Clear reasons, human-controlled follow-ups and no paid AI API.</p></div><span>{actions.length} signals</span></div>
   <div className="rd-action-list">
    {actions.length?actions.slice(0,15).map(item=><article key={item.id} className="rd-action-item">
     <div><span className={"rd-priority "+item.priority}>{item.priority}</span><strong>{item.title}</strong>
      <p>{item.reason}</p><small>Next step: {item.suggestedAction}</small></div>
     {item.personId&&!item.id.startsWith("task:")&&<button type="button" disabled={busy} onClick={()=>createTaskFor(item)}>Create follow-up</button>}
     {item.sessionId&&<button type="button" onClick={()=>{setSelectedClass(item.sessionId||"");setMessage("Class selected in bookings below.");}}>Review class</button>}
    </article>):<p className="rd-empty">No immediate follow-up signals from current studio data.</p>}
   </div>
   <p className="rd-tiny">Signals are deterministic: overdue leads, expiring packages, low credits, overdue tasks and underfilled upcoming classes. No automatic marketing is sent.</p>
  </section>
  <section className="rd-ops-section">
   <div className="rd-ops-section-title"><div><h3>Class schedule</h3><p>Transactional capacity checks and controlled waitlist promotion.</p></div></div>
   {owner&&<details className="rd-ops-details"><summary>Create a class</summary>
    <form className="rd-form" onSubmit={createSession}>
     <label>Class name<input minLength={2} maxLength={100} required value={schedule.title} onChange={e=>setSchedule({...schedule,title:e.target.value})}/></label>
     <label>Instructor<input minLength={2} maxLength={80} required value={schedule.instructor} onChange={e=>setSchedule({...schedule,instructor:e.target.value})}/></label>
     <label>Room<input minLength={2} maxLength={80} required value={schedule.room} onChange={e=>setSchedule({...schedule,room:e.target.value})}/></label>
     <label>Class starts in {studioZone} (studio timezone)<input type="datetime-local" required value={schedule.startsAt} onChange={e=>setSchedule({...schedule,startsAt:e.target.value})}/></label>
     <div className="rd-ops-pair"><label>Duration (minutes)<input type="number" min="15" max="240" required value={schedule.durationMinutes} onChange={e=>setSchedule({...schedule,durationMinutes:Number(e.target.value)})}/></label>
     <label>Capacity<input type="number" min="1" max="100" required value={schedule.capacity} onChange={e=>setSchedule({...schedule,capacity:Number(e.target.value)})}/></label></div>
     <label className="rd-toggle"><input type="checkbox" checked={repeat.enabled} onChange={e=>setRepeat({...repeat,enabled:e.target.checked})}/> Repeat weekly</label>
     {repeat.enabled&&<div className="rd-repeat-config">
      <strong>Repeat on</strong>
      <div className="rd-weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day,index)=><button type="button" aria-pressed={repeat.weekdays.includes(index)} className={repeat.weekdays.includes(index)?"selected":""} key={day} onClick={()=>setRepeat(r=>({...r,weekdays:r.weekdays.includes(index)?r.weekdays.filter(x=>x!==index):[...r.weekdays,index]}))}>{day}</button>)}</div>
      <label>Repeat until (maximum 12 weeks)<input type="date" min={schedule.startsAt.slice(0,10)} required value={repeat.until} onChange={e=>setRepeat({...repeat,until:e.target.value})}/></label>
      <p className="rd-tiny">All occurrences are checked together; if any conflicts, none are created. Daylight-saving transition times that are ambiguous or nonexistent are rejected.</p>
     </div>}
     <button type="submit" className="rd-primary" disabled={busy}>{repeat.enabled?"Create weekly series":"Create class"}</button>
    </form></details>}
   <div className="rd-class-list">{classes.length?classes.slice(0,40).map(c=><button className={"rd-class-choice"+(selectedClass===c.id?" selected":"")} key={c.id} type="button" onClick={()=>setSelectedClass(c.id)}>
    <strong>{classLabel(c,studioZone)}</strong><small>{c.instructor} · {c.room} · {c.duration_minutes} min</small>
    <span>{c.booked_count}/{c.capacity} booked · {c.waitlist_count} waiting</span>
   </button>):<p className="rd-empty">No upcoming classes. Create your first class above.</p>}</div>
   {classes.length>0&&<div className="rd-ops-subsection"><h4>Book or waitlist a member</h4>
    <form className="rd-form" onSubmit={book}>
      <label>Class<select required value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>{classes.map(c=><option key={c.id} value={c.id}>{classLabel(c,studioZone)}</option>)}</select></label>
      <label>Member<select required value={selectedMember} onChange={e=>setSelectedMember(e.target.value)}><option value="">Select a member</option>{members.map(m=><option value={m.id} key={m.id}>{m.full_name} · {m.package_status||"Pending"} · {m.credits===null?"Unlimited":m.credits+" credits"}</option>)}</select></label>
      <button type="submit" className="rd-primary" disabled={busy||!selectedMember}>Book / join waitlist</button>
    </form>
    <div className="rd-booking-list">{bookings.length?bookings.map(b=><div key={b.id}><span><b>{b.member_name}</b><small>{b.attended_at?"Checked in · ":""}{b.status}{b.status==="waitlisted"?" · #"+b.queue_number:""}</small></span>
     <div className="rd-booking-actions">{b.status==="booked"&&<button type="button" disabled={busy} onClick={()=>markAttendance(b)}>{b.attended_at?"Correct check-in":"Check in"}</button>}
     <button type="button" disabled={busy||Boolean(b.attended_at)} onClick={()=>cancel(b)}>Cancel</button></div></div>):<p className="rd-empty">No active bookings or waitlist members in this class.</p>}</div>
   </div>}
  </section>
  {owner&&<section className="rd-ops-section"><h3>Member packages and credits</h3><p className="rd-tiny">Package confirmation is a manual admin acknowledgement, NOT a verified payment.</p>
    <div className="rd-pack-list">{members.length?members.map(m=><div key={m.id}><div><strong>{m.full_name}</strong><small>{m.package_status||"Pending"} · {m.plan||"No pack"} · {m.credits===null?"Unlimited":m.credits+" credits"}</small></div>
     {m.email&&<button type="button" disabled={busy} onClick={()=>sendInvite(m)}>Invite member</button>}
     {m.package_status==="Pending"&&<div className="rd-pack-confirm">
      <label><span>Pack</span><select value={selectedPlan[m.id]||"10 Class Pack"} onChange={e=>setSelectedPlan(prev=>({...prev,[m.id]:e.target.value}))}>
       {["5 Class Pack","10 Class Pack","Unlimited Monthly"].map(x=><option key={x}>{x}</option>)}</select></label>
      <button type="button" disabled={busy} onClick={()=>confirm(m)}>Confirm pack</button>
     </div>}
    </div>):<p className="rd-empty">No members yet. Add a member using the contact form above.</p>}</div>
    {members.some(m=>m.package_status==="Paid"&&m.credits!==null)&&<details className="rd-ops-details"><summary>Adjust credits with an audit entry</summary>
     <form className="rd-form" onSubmit={adjustCredits}>
      <label>Member<select required value={adjust.memberId} onChange={e=>setAdjust({...adjust,memberId:e.target.value})}>
       <option value="">Select confirmed member</option>{members.filter(m=>m.package_status==="Paid"&&m.credits!==null).map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.credits} credits</option>)}</select></label>
      <label>Credits to add (+) or remove (−)<input type="number" required min="-1000" max="1000" step="1" value={adjust.delta} onChange={e=>setAdjust({...adjust,delta:Number(e.target.value)})}/></label>
      <label>Reason<input required minLength={2} maxLength={200} value={adjust.reason} onChange={e=>setAdjust({...adjust,reason:e.target.value})}/></label>
      <button type="submit" className="rd-primary" disabled={busy||!adjust.memberId||adjust.delta===0}>Save audited adjustment</button>
     </form></details>}
  </section>}
  <section className="rd-ops-section"><h3>Open follow-ups</h3>
   <div className="rd-followup-list">{tasks.length?tasks.slice(0,30).map(t=><div key={t.id}><div><strong>{t.title}</strong><small>{t.person_name} · {new Date(t.due_at).toLocaleDateString()} · {t.priority}</small></div>
    <label>Outcome<select value={taskOutcomes[t.id]||"Contacted"} onChange={e=>setTaskOutcomes(prev=>({...prev,[t.id]:e.target.value}))}>
     {["Contacted","No answer","Reschedule","Converted","Completed"].map(x=><option key={x}>{x}</option>)}</select></label>
    <button type="button" disabled={busy} onClick={()=>completeTask(t)}>Complete</button>
   </div>):<p className="rd-empty">No open follow-up tasks.</p>}</div>
  </section>
 </div>;
}
