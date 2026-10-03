"use client";
import {useCallback,useEffect,useState} from "react";
type Session={
 id:string;title:string;starts_at:string;room:string;duration_minutes:number;
 capacity:number;booked_count:number;waitlist_count:number;
};
type Reservation={id:string;class_id:string;title:string;starts_at:string;status:"booked"|"waitlisted";queue_number:number|null};
type MemberProfile={id:string;full_name:string;plan:string|null;credits:number|null;package_status:string;member_status:string;expiry_date:string|null};
type Pack={id:string;name:string;description:string;price_cents:number;currency:string;credits:number;valid_days:number};
type Purchase={id:string;name:string;status:string;created_at:string;amount_cents:number;currency:string};
type Visit={id:string;title:string;starts_at:string;attended_at:string};
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
 const [packages,setPackages]=useState<Pack[]>([]),[purchases,setPurchases]=useState<Purchase[]>([]);
 const [visits,setVisits]=useState<Visit[]>([]),[checkoutAvailable,setCheckoutAvailable]=useState(false);
 const [selectedClass,setSelectedClass]=useState<string>("");
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  const [m,c,p]=await Promise.all([
   api<{member:MemberProfile;bookings:Reservation[];timezone:string;visits:Visit[]}>("/api/member/me"),
   api<{classes:Session[]}>("/api/member/classes"),
   api<{packages:Pack[];purchases:Purchase[];checkoutAvailable:boolean}>("/api/member/packages")
  ]);
  setMe(m.member);setBookings(m.bookings);setClasses(c.classes);setTimezone(m.timezone||"UTC");
  setPackages(p.packages);setPurchases(p.purchases);setCheckoutAvailable(p.checkoutAvailable);setVisits(m.visits||[]);
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
 const hasValidPass=me?.package_status==="Paid"&&me?.member_status==="Active"&&
  (me?.credits===null||(me?.credits??0)>0)&&(!me?.expiry_date||me.expiry_date>=new Date().toLocaleDateString("en-CA",{timeZone:timezone}));
 function buy(pack:Pack){
  if(!checkoutAvailable){setMessage("Payments are not enabled by your studio yet. Contact the studio to buy a package.");return;}
  void mutate(async()=>{
   const res=await api<{checkoutUrl:string}>("/api/member/packages/checkout","POST",{packageId:pack.id});
   if(!/^https:\/\/checkout\.stripe\.com\//.test(res.checkoutUrl)&&!res.checkoutUrl.startsWith("http://127.0.0.1:"))throw Error("Unexpected payment provider address.");
   window.location.assign(res.checkoutUrl);
   return "Redirecting to secure payment checkout.";
  });
 }
 return <section className="rd-ops" aria-label="My class bookings">
  <div className="rd-member-journey" aria-label="Your studio experience">
   {["1 · Pick a class","2 · Buy a class pack","3 · Book your spot","4 · Attend your class","5 · Renew your pack"].map(label=><span key={label}>{label}</span>)}
  </div>
  {message&&<p role="status" className="rd-feedback">{message}</p>}
  <p className="rd-tiny">All class times are displayed in the studio timezone: <strong>{timezone}</strong>.</p>
  <div className="rd-ops-section"><h2>My class pack</h2>
   <p><strong>{me?.full_name||"Your membership"}</strong></p>
   <p>{me?.plan||"No package"} · {me?.package_status||"Pending approval"}
   {" · "}{me?.credits===null?"Unlimited access":(me?.credits??0)+" credits remaining"}</p>
   {me?.expiry_date&&<p>Valid through: {me.expiry_date}</p>}
   <p className="rd-tiny">{hasValidPass?"Your pass is ready to use. Book a class below.":"Choose a package below, complete secure checkout, then return to reserve a class."} Buying or renewing a pack is separate from the studio's StudioTasker software subscription.</p>
  </div>
  <div className="rd-ops-section"><div className="rd-ops-section-title"><div><h3>Buy or renew a class pack</h3><p>Sold by your studio. Credit is added only after verified payment.</p></div></div>
   {!checkoutAvailable&&<p className="rd-feedback">Online checkout is not enabled for this studio. Prices below are illustrative studio listings until payment setup is complete.</p>}
   <div className="rd-packages-grid">{packages.length?packages.map(pack=><article className="rd-package-card" key={pack.id}>
    <small>{pack.credits} classes · {pack.valid_days} days validity</small><h4>{pack.name}</h4>{pack.description&&<p>{pack.description}</p>}
    <strong>{new Intl.NumberFormat("en-US",{style:"currency",currency:pack.currency.toUpperCase()}).format(pack.price_cents/100)}</strong>
    <button className="rd-primary" type="button" disabled={busy||!checkoutAvailable} onClick={()=>buy(pack)}>{hasValidPass?"Renew / Add credits":"Buy package"}</button>
   </article>):<p className="rd-empty">Your studio has not published any packages yet.</p>}</div>
   {purchases.length>0&&<details className="rd-ops-details"><summary>My purchases and payment status</summary><div className="rd-member-purchases">
    {purchases.map(order=><p key={order.id}><b>{order.name}</b> · {order.status==="paid"?"Payment verified":order.status==="pending"?"Awaiting payment":order.status==="refunded"?"Refunded — studio review required":"Payment disputed — studio review required"} · {new Date(order.created_at).toLocaleDateString()}</p>)}
    </div></details>}
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
  <div className="rd-ops-section"><h3>Class attendance history</h3>
   {visits.length?visits.map(v=><p key={v.id} className="rd-member-visit"><strong>{v.title}</strong><span>{format(v.starts_at)} · Attended</span></p>):<p className="rd-empty">Once your studio checks you in, attended classes appear here.</p>}
  </div>
  <div className="rd-ops-section"><h3>Available classes</h3>
   <p className="rd-tiny">Choose a class first. If you need credits, buy a pack above and return here after payment confirmation.</p>
   <div className="rd-class-list">
    {classes.length?classes.filter(c=>new Date(c.starts_at).getTime()>Date.now()).map(c=><article key={c.id} className={"rd-class-choice"+(selectedClass===c.id?" selected":"")}>
     <strong>{c.title} · {format(c.starts_at)}</strong>
     <small>{c.room} · {c.duration_minutes} minutes</small>
     <span>{c.booked_count}/{c.capacity} confirmed · {c.waitlist_count} on waitlist</span>
     <button type="button" disabled={busy||!hasValidPass}
      className="rd-primary" onClick={()=>{setSelectedClass(c.id);void mutate(async()=>{
       const response=await api<{booking:{status:string;alreadyExists:boolean}}>("/api/member/bookings","POST",{sessionId:c.id});
       return response.booking.alreadyExists?"You already have a booking in this class.":
        response.booking.status==="waitlisted"?"Added to the class waitlist.":"Your class reservation is confirmed.";
      })}}>{!hasValidPass?"Buy pass first":"Book class"}</button>
    </article>):<p className="rd-empty">No upcoming classes available.</p>}
   </div>
  </div>
 </section>;
}
