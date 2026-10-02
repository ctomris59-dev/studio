"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, CreditCard, FileDown, Heart, LayoutDashboard, Leaf, ListChecks, Plus, RotateCcw, Settings2, ShieldCheck, Sparkles, Users, Waves, X } from "lucide-react";

type Member = { id: string; name: string; email: string; plan: string; credits: number | null; joined: string };
type Session = { id: string; title: string; coach: string; date: string; time: string; capacity: number; booked: string[]; waitlist: string[] };
type Tab = "overview" | "schedule" | "members" | "settings";
type Modal = "class" | "member" | null;

const sampleNames = ["Amelia Hart","Sophia Chen","Mia Oliver","Isabella Reed","Olivia Patel","Grace Taylor","Ella Brooks","Noah Mitchell","Lily James","Ava Williams","Chloe Adams","Charlotte Davis"];
const planOptions = ["5 Class Pack","10 Class Pack","Unlimited Monthly"];
const classOptions = ["Reformer Foundations","Morning Flow","Sculpt & Strength","Stretch & Reset","Evening Reformer","Dynamic Pilates"];

function isoFor(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}
function niceDate(iso: string) {
  return new Date(iso+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
}
function buildSamples(): { members: Member[]; sessions: Session[] } {
  const members: Member[] = sampleNames.map((name,i)=>({id:"m"+(i+1),name,email:name.toLowerCase().replace(" ",".")+"@example.com",plan:i%4===0?"Unlimited Monthly":i%3===0?"5 Class Pack":"10 Class Pack",credits:i%4===0?null:(i%3===0?5:10)-Math.floor(i/4),joined:isoFor(-35+i)}));
  const templates = [
    ["Reformer Foundations","Sophie","07:30",8,0,6],
    ["Morning Flow","Olivia","09:00",8,0,8],
    ["Sculpt & Strength","Ava","12:30",8,0,5],
    ["Evening Reformer","Sophie","17:30",8,0,7],
    ["Stretch & Reset","Ava","08:30",6,1,4],
    ["Reformer Foundations","Olivia","10:00",8,1,6],
    ["Evening Reformer","Sophie","18:00",8,1,3],
    ["Morning Flow","Sophie","08:00",8,2,6],
    ["Sculpt & Strength","Olivia","17:30",8,2,4]
  ] as const;
  const sessions:Session[]=templates.map((a,i)=>({id:"s"+(i+1),title:a[0],coach:a[1],time:a[2],capacity:a[3],date:isoFor(a[4]),booked:members.slice(0,a[5]).map(m=>m.id),waitlist:i===1?["m9","m10"]:[]}));
  return {members,sessions};
}
function Logo() {
  return <Link href="/" className="brand" aria-label="ReformDesk homepage"><span className="brand-symbol"><span/><span/><span/></span><span>reform<span className="brand-bold">desk</span><b>.</b></span></Link>;
}
function initials(name:string) { return name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
function downloadCsv(filename:string,rows:string[][]) {
  const csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const link=document.createElement("a");const url=URL.createObjectURL(blob);link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
export default function DemoPage() {
  const [tab,setTab]=useState<Tab>("overview");
  const [members,setMembers]=useState<Member[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [ready,setReady]=useState(false);
  const [modal,setModal]=useState<Modal>(null);
  const [toast,setToast]=useState("");
  const [chosen,setChosen]=useState<Record<string,string>>({});
  const [classForm,setClassForm]=useState({title:"Reformer Foundations",coach:"Sophie",date:isoFor(1),time:"09:00",capacity:"8"});
  const [memberForm,setMemberForm]=useState({name:"",email:"",plan:"10 Class Pack"});
  useEffect(()=>{
    try {
      const stored=window.localStorage.getItem("reformdesk-demo-v1");
      if(stored){const data=JSON.parse(stored);if(Array.isArray(data.members)&&Array.isArray(data.sessions)){setMembers(data.members);setSessions(data.sessions);}else{const start=buildSamples();setMembers(start.members);setSessions(start.sessions);}}
      else{const start=buildSamples();setMembers(start.members);setSessions(start.sessions);}
    }catch{const start=buildSamples();setMembers(start.members);setSessions(start.sessions);}
    setReady(true);
  },[]);
  useEffect(()=>{if(ready){try{window.localStorage.setItem("reformdesk-demo-v1",JSON.stringify({members,sessions}));}catch{}}},[members,sessions,ready]);
  const byId=useMemo(()=>new Map(members.map(m=>[m.id,m])),[members]);
  const bookedCount=sessions.reduce((acc,s)=>acc+s.booked.length,0);
  const seats=sessions.reduce((acc,s)=>acc+s.capacity,0);
  const waiting=sessions.reduce((acc,s)=>acc+s.waitlist.length,0);
  const sorted=[...sessions].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const todays=sorted.filter(s=>s.date===isoFor(0));
  const recent=members.slice(-4).reverse();
  function message(text:string){setToast(text);}
  function book(sessionId:string){
    const memberId=chosen[sessionId]||members[0]?.id;
    const member=byId.get(memberId);
    const s=sessions.find(x=>x.id===sessionId);
    if(!s||!member)return;
    if(s.booked.includes(memberId)||s.waitlist.includes(memberId)){message(member.name+" is already on this class.");return;}
    if(member.credits!==null&&member.credits<=0){message(member.name+" has no class credits remaining.");return;}
    const full=s.booked.length>=s.capacity;
    setSessions(items=>items.map(item=>item.id!==sessionId?item:{...item,booked:full?item.booked:[...item.booked,memberId],waitlist:full?[...item.waitlist,memberId]:item.waitlist}));
    if(!full&&member.credits!==null){setMembers(items=>items.map(m=>m.id===memberId?{...m,credits:Math.max(0,(m.credits||0)-1)}:m));}
    message(full?member.name+" joined the waitlist.":member.name+" booked successfully. One credit used.");
  }
  function removeBooking(sessionId:string,memberId:string,fromWaitlist=false){
    const s=sessions.find(item=>item.id===sessionId);if(!s)return;
    const cancelled=byId.get(memberId);
    if(fromWaitlist){
      setSessions(items=>items.map(item=>item.id===sessionId?{...item,waitlist:item.waitlist.filter(id=>id!==memberId)}:item));
      message((cancelled?.name||"Member")+" removed from waitlist.");return;
    }
    let nextWait=[...s.waitlist];let promoteId:string|undefined;
    while(nextWait.length){
      const id=nextWait.shift()!;
      const potential=byId.get(id);
      if(potential&&(potential.credits===null||potential.credits>0)){promoteId=id;break;}
    }
    setSessions(items=>items.map(item=>item.id!==sessionId?item:{...item,booked:[...item.booked.filter(id=>id!==memberId),...(promoteId?[promoteId]:[])],waitlist:nextWait}));
    setMembers(items=>items.map(m=>{
      if(m.id===memberId&&m.credits!==null)return {...m,credits:m.credits+1};
      if(m.id===promoteId&&m.credits!==null)return {...m,credits:Math.max(0,m.credits-1)};
      return m;
    }));
    message((cancelled?.name||"Member")+" cancelled."+ (promoteId?" Next waitlisted member promoted.":""));
  }
  function addClass(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const capacity=Number(classForm.capacity);
    if(!Number.isInteger(capacity)||capacity<1||capacity>30){message("Enter a capacity from 1 to 30.");return;}
    const id="s-"+Date.now().toString(36);
    setSessions(items=>[...items,{id,title:classForm.title,coach:classForm.coach,date:classForm.date,time:classForm.time,capacity,booked:[],waitlist:[]}]);
    setModal(null);setTab("schedule");message("New class added to your demo schedule.");
  }
  function addMember(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const name=memberForm.name.trim();const email=memberForm.email.trim().toLowerCase();
    if(name.length<2||!email.includes("@")){message("Please enter a name and valid email.");return;}
    if(members.some(m=>m.email===email)){message("This email already exists.");return;}
    const credits=memberForm.plan==="Unlimited Monthly"?null:memberForm.plan==="5 Class Pack"?5:10;
    setMembers(items=>[...items,{id:"m-"+Date.now().toString(36),name,email,plan:memberForm.plan,credits,joined:isoFor(0)}]);
    setMemberForm({name:"",email:"",plan:"10 Class Pack"});setModal(null);setTab("members");message(name+" added to your demo.");
  }
  function reset(){const samples=buildSamples();setSessions(samples.sessions);setMembers(samples.members);setChosen({});message("Demo data reset to original sample.");}
  function exportMembers(){downloadCsv("reformdesk-members-demo.csv",[["Name","Email","Plan","Credits","Joined"],...members.map(m=>[m.name,m.email,m.plan,m.credits===null?"Unlimited":String(m.credits),m.joined])]);message("Sample member CSV exported.");}
  function exportClasses(){downloadCsv("reformdesk-classes-demo.csv",[["Date","Time","Class","Instructor","Capacity","Bookings","Waitlist"],...sorted.map(s=>[s.date,s.time,s.title,s.coach,String(s.capacity),String(s.booked.length),String(s.waitlist.length)])]);message("Sample schedule CSV exported.");}
  const navigation:[Tab,typeof LayoutDashboard][]=[["overview",LayoutDashboard],["schedule",CalendarDays],["members",Users],["settings",Settings2]];
  const names:Record<Tab,string>={overview:"Overview",schedule:"Schedule",members:"Members",settings:"Settings"};
  function showOverview(){
    return <>
      <div className="demo-stats">
        {([["Active members",String(members.length),Users,"Your studio community"],["Scheduled classes",String(sessions.length),CalendarDays,"Current sample timetable"],["Total bookings",String(bookedCount),CheckCircle2,"Across all sample classes"],["Seat occupancy",seats?Math.round(bookedCount/seats*100)+"%":"0%",Waves,waiting+" members waitlisted"]] as const).map(([label,value,Icon,desc])=><div className="stat-card" key={label as string}><div className="stat-card-head"><span>{label as string}</span><span><Icon size={17}/></span></div><strong>{value as string}</strong><small>{desc as string}</small></div>)}
      </div>
      <div className="demo-grid">
        <section className="panel"><div className="panel-heading"><div><h2>Upcoming classes</h2><p>Your classes, all in one calm place.</p></div><button onClick={()=>setTab("schedule")}>Full schedule <ArrowRight size={14}/></button></div>{sorted.slice(0,5).map(s=><div key={s.id} className="demo-class-row"><span className="class-time">{s.time}</span><span className="class-details"><b>{s.title}</b><small>{niceDate(s.date)} · {s.coach}</small></span><div className="class-capacity">{s.booked.length}/{s.capacity} spots<div className="class-meter"><div style={{width:Math.min(100,s.booked.length/s.capacity*100)+"%"}}/></div></div><span className={"status-pill"+(s.booked.length>=s.capacity?" full":"")}>{s.booked.length>=s.capacity?"Full":"Open"}</span></div>)}</section>
        <div><section className="panel"><div className="panel-heading"><div><h2>Our community</h2><p>Recently added members</p></div><button onClick={()=>setTab("members")}>View all <ArrowRight size={14}/></button></div><div className="panel-body">{recent.map(m=><div className="activity-row" key={m.id}><span className="activity-avatar">{initials(m.name)}</span><span><b>{m.name}</b><small>{m.plan}</small></span><span>{m.credits===null?"∞":m.credits} left</span></div>)}</div></section><div className="demo-help-card"><Sparkles size={24}/><h3>A little less admin.</h3><p>Add a class or member, try booking the final spot, then see how the waitlist behaves.</p><button className="demo-secondary" onClick={()=>setTab("schedule")}>Try a booking <ArrowRight size={14}/></button></div></div>
      </div>
    </>;
  }
  function showSchedule(){
    return <div className="table-panel"><div className="table-title"><div><h2>Your class schedule</h2><small>Book sample members to test credits and waitlists.</small></div><button className="demo-secondary" onClick={exportClasses}><FileDown size={14}/> Export CSV</button></div><div className="table-wrap"><table className="data"><thead><tr><th>CLASS / INSTRUCTOR</th><th>DATE</th><th>SPOTS</th><th>BOOK A MEMBER</th><th>WAITLIST</th></tr></thead><tbody>{sorted.map(s=><tr key={s.id}><td><strong>{s.title}</strong><small>{s.coach} · {s.time}</small></td><td>{niceDate(s.date)}</td><td><strong>{s.booked.length} / {s.capacity}</strong><small>{s.capacity-s.booked.length} available</small></td><td><div className="book-controls"><select aria-label={"Choose member for "+s.title} value={chosen[s.id]||members[0]?.id||""} onChange={e=>setChosen({...chosen,[s.id]:e.target.value})}>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><button className="table-action" disabled={!members.length} onClick={()=>book(s.id)}>{s.booked.length>=s.capacity?"Waitlist":"Book"}</button></div><small>{s.booked.slice(-3).map(id=>byId.get(id)?.name.split(" ")[0]).filter(Boolean).join(", ")||"No bookings yet"}</small>{s.booked.length>0&&<button style={{marginTop:6,display:"block"}} className="table-action danger" onClick={()=>removeBooking(s.id,s.booked[s.booked.length-1])}>Cancel last booking</button>}</td><td>{s.waitlist.length?<><strong>{s.waitlist.length} waiting</strong><small>{s.waitlist.map(id=>byId.get(id)?.name.split(" ")[0]).join(", ")}</small><button style={{marginTop:6}} className="table-action danger" onClick={()=>removeBooking(s.id,s.waitlist[0],true)}>Remove next</button></>:<span className="status-pill">Clear</span>}</td></tr>)}</tbody></table></div>{!sorted.length&&<div className="table-empty">No classes yet. Add your first class to get started.</div>}</div>;
  }
  function showMembers(){
    return <div className="table-panel"><div className="table-title"><div><h2>Studio members</h2><small>Sample member profiles. No real personal information.</small></div><button className="demo-secondary" onClick={exportMembers}><FileDown size={14}/> Export CSV</button></div><div className="table-wrap"><table className="data"><thead><tr><th>MEMBER</th><th>CLASS PACK</th><th>REMAINING CREDITS</th><th>JOINED</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td><strong>{m.name}</strong><small>{m.email}</small></td><td>{m.plan}</td><td><strong>{m.credits===null?"Unlimited":m.credits}</strong></td><td>{niceDate(m.joined)}</td></tr>)}</tbody></table></div></div>;
  }
  function showSettings(){
    return <div><div className="setting-card"><h3>Demo workspace</h3><p>Everything you change is saved in this browser only. Reset whenever you want a fresh studio preview. This is not a hosted customer account.</p><div className="setting-actions"><button className="demo-secondary" onClick={reset}><RotateCcw size={15}/> Reset sample data</button><button className="demo-secondary" onClick={exportMembers}><ArrowDownToLine size={15}/> Export members</button><button className="demo-secondary" onClick={exportClasses}><ArrowDownToLine size={15}/> Export classes</button></div></div><div className="setting-card"><h3>Before the real launch</h3><p>A production release requires secure sign-in, a database for each studio, server-validated bookings, payment billing, email notifications, backups and privacy controls. These are intentionally not part of this demo.</p><div className="setting-actions"><Link className="demo-secondary" href="/"><ArrowLeft size={15}/> Visit the website</Link></div></div></div>;
  }
  return <div className="demo-shell">
    <aside className="demo-aside"><Logo/><h4>YOUR WORKSPACE</h4><nav className="side-links" aria-label="Demo navigation">{navigation.map(([id,Icon])=><button key={id} className={"side-button"+(tab===id?" active":"")} onClick={()=>setTab(id)}><Icon size={18}/>{names[id]}</button>)}</nav><div className="side-bottom"><div className="demo-profile"><span className="profile-circle">AR</span><span><strong>Alex Rivera</strong><small>Studio owner · Demo</small></span></div><Link style={{display:"block",fontSize:11,margin:"22px 0 0 4px",color:"#b0cfb4"}} href="/">← Back to website</Link></div></aside>
    <div className="demo-main"><header className="demo-topbar"><div><span className="demo-breadcrumb">ReformDesk /</span><strong>{names[tab]}</strong></div><div><span style={{fontSize:11,color:"#8ba293"}}>Willow Pilates Studio</span><span className="demo-icon-circle"><Leaf size={17}/></span></div></header><div className="demo-mobile-nav">{navigation.map(([id])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{names[id]}</button>)}<Link style={{color:"#d5ead5",padding:"10px"}} href="/">Website</Link></div>
    <main className="demo-content"><div className="demo-alert"><span><ShieldCheck size={18}/> <span><b>Interactive sample workspace.</b> No payments, real customer accounts or online bookings are enabled.</span></span><Link href="/">About ReformDesk</Link></div>
    {toast&&<div className="demo-toast"><span>{toast}</span><button onClick={()=>setToast("")} aria-label="Dismiss notification"><X size={16}/></button></div>}
    <div className="demo-pagehead"><div><div className="kicker">WILLOW PILATES STUDIO · DEMO</div><h1>{tab==="overview"?"Good morning, Alex.":tab==="schedule"?"Your schedule.":tab==="members"?"Your community.":"Studio settings."}</h1><p>{tab==="overview"?"Here's how your studio is moving today.":tab==="schedule"?"A beautiful rhythm for every class.":tab==="members"?"People are what make your studio special.":"Keep things simple and in your control."}</p></div>{tab==="overview"||tab==="schedule"?<button className="demo-primary" onClick={()=>{setClassForm({...classForm,date:isoFor(1)});setModal("class");}}><Plus size={16}/> Add a class</button>:tab==="members"?<button className="demo-primary" onClick={()=>setModal("member")}><Plus size={16}/> Add a member</button>:null}</div>
    {!ready?<div className="table-empty">Preparing your sample studio…</div>:tab==="overview"?showOverview():tab==="schedule"?showSchedule():tab==="members"?showMembers():showSettings()}
    </main></div>
    {modal&&<div className="modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal" role="dialog" aria-modal="true" aria-label={modal==="class"?"Add a new class":"Add a new member"}><div className="modal-title"><h2>{modal==="class"?"Add a new class":"Meet a new member"}</h2><button type="button" aria-label="Close" onClick={()=>setModal(null)}><X size={18}/></button></div><p>{modal==="class"?"Create a sample class in the schedule.":"Add a sample person to your studio community."}</p>{modal==="class"?<form className="modal-form" onSubmit={addClass}><div className="field full"><label htmlFor="class-title">Class name</label><select id="class-title" value={classForm.title} onChange={e=>setClassForm({...classForm,title:e.target.value})}>{classOptions.map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label htmlFor="class-coach">Instructor</label><input id="class-coach" required minLength={2} maxLength={40} value={classForm.coach} onChange={e=>setClassForm({...classForm,coach:e.target.value})}/></div><div className="field"><label htmlFor="class-size">Reformer capacity</label><input id="class-size" type="number" min="1" max="30" required value={classForm.capacity} onChange={e=>setClassForm({...classForm,capacity:e.target.value})}/></div><div className="field"><label htmlFor="class-date">Date</label><input id="class-date" type="date" required value={classForm.date} onChange={e=>setClassForm({...classForm,date:e.target.value})}/></div><div className="field"><label htmlFor="class-time">Time</label><input id="class-time" type="time" required value={classForm.time} onChange={e=>setClassForm({...classForm,time:e.target.value})}/></div><div className="form-actions"><button type="button" className="demo-secondary" onClick={()=>setModal(null)}>Cancel</button><button type="submit" className="demo-primary"><Plus size={16}/> Add class</button></div></form>:<form className="modal-form" onSubmit={addMember}><div className="field full"><label htmlFor="member-name">Full name</label><input id="member-name" required minLength={2} maxLength={80} placeholder="Taylor Morgan" value={memberForm.name} onChange={e=>setMemberForm({...memberForm,name:e.target.value})}/></div><div className="field full"><label htmlFor="member-email">Email address (sample data only)</label><input id="member-email" type="email" required placeholder="taylor@example.com" value={memberForm.email} onChange={e=>setMemberForm({...memberForm,email:e.target.value})}/></div><div className="field full"><label htmlFor="member-plan">Class package</label><select id="member-plan" value={memberForm.plan} onChange={e=>setMemberForm({...memberForm,plan:e.target.value})}>{planOptions.map(x=><option key={x}>{x}</option>)}</select></div><div className="form-actions"><button type="button" className="demo-secondary" onClick={()=>setModal(null)}>Cancel</button><button type="submit" className="demo-primary"><Plus size={16}/> Add member</button></div></form>}</div></div>}
  </div>;
}
