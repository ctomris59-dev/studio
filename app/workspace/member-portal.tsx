"use client";
import {useCallback,useEffect,useState} from "react";
type Session={
 id:string;title:string;starts_at:string;room:string;duration_minutes:number;
 capacity:number;booked_count:number;waitlist_count:number;
};
type Reservation={id:string;class_id:string;title:string;starts_at:string;status:"booked"|"waitlisted";queue_number:number|null};
type MemberProfile={id:string;full_name:string;plan:string|null;credits:number|null;package_status:string;member_status:string;expiry_date:string|null};
async function api<T>(path:string,method="GET",payload?:Record<string,unknown>):Promise<T>{
 const r=await fetch(path,{method,headers:payload?{"Content-Type":"application/json"}:undefined,
 credentials:"same-origin",cache:"no-store",body:payload?JSON.stringify(payload):undefined});
 const json=await r.json();
 if(!r.ok)throw new Error(json.error||"Request failed.");
 return json;
}
export function MemberPortal(){
 const [me,setMe]=useState<MemberProfile|null>(null),[bookings,setBookings]=useState<Reservation[]>([]);
 const [classes,setClasses]=useState<Session[]>([]);
 const [timezone,setTimezone]=useState("UTC");
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  const [m,c]=await Promise.all([
   api<{member:MemberProfile;bookings:Reservation[];timezone:string}>("/api/member/me"),
   api<{classes:Session[]}>("/api/member/classes")
  ]);
  setMe(m.member);setBookings(m.bookings);setClasses(c.classes);setTimezone(m.timezone||"UTC");
 },[]);
 useEffect(()=>{void load().catch(e=>setMessage(e instanceof Error?e.message:"Unable to load member profile."))},[load]);
 async function mutate(run:()=>Promise<string>){
  if(busy)return;setBusy(true);setMessage("");
  try{const result=await run();await load();setMessage(result)}
  catch(e){setMessage(e instanceof Error?e.message:"Request failed")}
  finally{setBusy(false)}
 }
 const format=(start:string)=>new Date(start).toLocaleString("en-GB",{
  timeZone:timezone,weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"
 });
 return <section className="rd-ops" aria-label="My class bookings">
  {message&&<p role="status" className="rd-feedback">{message}</p>}
  <p className="rd-tiny">All class times are displayed in the studio timezone: <strong>{timezone}</strong>.</p>
  <div className="rd-ops-section"><h2>My class pack</h2>
   <p><strong>{me?.full_name||"Your membership"}</strong></p>
   <p>{me?.plan||"No package"} · {me?.package_status||"Pending approval"}
   {" · "}{me?.credits===null?"Unlimited access":(me?.credits??0)+" credits remaining"}</p>
   {me?.expiry_date&&<p>Valid through: {me.expiry_date}</p>}
   <p className="rd-tiny">If your class pass is pending, expired or paused, contact your studio.</p>
  </div>
  <div className="rd-ops-section"><h3>My reservations</h3>
   {bookings.length?bookings.map(b=><article key={b.id} className="rd-action-item">
    <div><strong>{b.title}</strong><p>{format(b.starts_at)} · {b.status==="waitlisted"?"Waitlist #"+b.queue_number:"Confirmed"}</p></div>
    <button type="button" disabled={busy} onClick={()=>{
     if(!window.confirm("Cancel your class reservation?"))return;
     void mutate(async()=>{
      await api("/api/member/bookings/"+b.id,"DELETE");
      return "Reservation cancelled. Any eligible class credit has been returned.";
     });
    }}>Cancel</button>
   </article>):<p className="rd-empty">No upcoming bookings.</p>}
  </div>
  <div className="rd-ops-section"><h3>Available classes</h3>
   <div className="rd-class-list">
    {classes.length?classes.filter(c=>new Date(c.starts_at).getTime()>Date.now()).map(c=><article key={c.id} className="rd-class-choice">
     <strong>{c.title} · {format(c.starts_at)}</strong>
     <small>{c.room} · {c.duration_minutes} minutes</small>
     <span>{c.booked_count}/{c.capacity} confirmed · {c.waitlist_count} on waitlist</span>
     <button type="button" disabled={busy||me?.package_status!=="Paid"||me?.member_status!=="Active"}
      className="rd-primary" onClick={()=>void mutate(async()=>{
       const response=await api<{booking:{status:string;alreadyExists:boolean}}>("/api/member/bookings","POST",{sessionId:c.id});
       return response.booking.alreadyExists?"You already have a booking in this class.":
        response.booking.status==="waitlisted"?"Added to the class waitlist.":"Your class reservation is confirmed.";
      })}>Book class</button>
    </article>):<p className="rd-empty">No upcoming classes available.</p>}
   </div>
  </div>
 </section>;
}
