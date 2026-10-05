"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowRight,BarChart3,CalendarDays,Check,CheckCircle2,ChevronRight,CreditCard,LayoutDashboard,LogOut,RefreshCw,Search,ShieldCheck,Target,Ticket,Users,WalletCards} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import {DEMO_ACCOUNTS,authenticateDemo} from "../../lib/demo-auth";
import "./app-demo.css";

type Role="owner"|"member";
type OwnerView="today"|"members"|"classes"|"followups"|"insights";
type MemberView="home"|"classes"|"bookings"|"membership";
type Signal={id:string;priority:"high"|"medium"|"low";title:string;reason:string;next:string;kind:"trial"|"renewal"|"inactive"|"checkout"|"seat"};
type DemoClass={id:string;title:string;time:string;coach:string;room:string;capacity:number;booked:number};
type DemoMember={id:string;name:string;plan:string;credits:number;status:string;lastVisit:string};

const OWNER_EMAIL=DEMO_ACCOUNTS.owner.email;
const OWNER_PASSWORD=DEMO_ACCOUNTS.owner.password;
const MEMBER_EMAIL=DEMO_ACCOUNTS.member.email;
const MEMBER_PASSWORD=DEMO_ACCOUNTS.member.password;

const seedSignals:Signal[]=[
 {id:"s1",priority:"high",kind:"trial",title:"Mia Carter · trial needs a next step",reason:"Trial attended yesterday. No package purchase yet.",next:"Ask whether Mia wants to join"},
 {id:"s2",priority:"high",kind:"renewal",title:"Oliver James · renewal opportunity",reason:"1 class credit remaining. Package expires in 3 days.",next:"Offer a renewal"},
 {id:"s3",priority:"medium",kind:"inactive",title:"Emma Wilson · member may be drifting",reason:"No recorded attendance for 24 days.",next:"Check in with Emma"},
 {id:"s4",priority:"medium",kind:"checkout",title:"Ava Reed · checkout still pending",reason:"Studio Ten checkout has been pending for 3 hours.",next:"Confirm whether Ava still wants the package"},
 {id:"s5",priority:"low",kind:"seat",title:"18:30 Barre Foundations · open places",reason:"3 of 8 places are still open tomorrow evening.",next:"Review class and eligible members"}
];
const classes:DemoClass[]=[
 {id:"c1",title:"Morning Flow",time:"MON · 07:30",coach:"Sophie M.",room:"Studio One",capacity:8,booked:6},
 {id:"c2",title:"Barre Foundations",time:"TUE · 09:00",coach:"Olivia K.",room:"Studio Two",capacity:10,booked:7},
 {id:"c3",title:"Midday Sculpt",time:"WED · 12:30",coach:"Ava R.",room:"Studio One",capacity:8,booked:5},
 {id:"c4",title:"Evening Reset",time:"THU · 17:30",coach:"Sophie M.",room:"Studio One",capacity:8,booked:8}
];
const members:DemoMember[]=[
 {id:"m1",name:"Emma Wilson",plan:"Studio Ten",credits:4,status:"Active",lastVisit:"24 days ago"},
 {id:"m2",name:"Oliver James",plan:"10 Class Pack",credits:1,status:"Active",lastVisit:"4 days ago"},
 {id:"m3",name:"Ava Reed",plan:"Studio Ten",credits:8,status:"Pending payment",lastVisit:"9 days ago"},
 {id:"m4",name:"Noah Martin",plan:"20 Class Pack",credits:13,status:"Active",lastVisit:"Yesterday"},
 {id:"m5",name:"Sofia Lane",plan:"Starter Pack",credits:3,status:"Active",lastVisit:"2 days ago"}
];

const pLabel=(p:Signal["priority"])=>p==="high"?"HIGH":p==="medium"?"MEDIUM":"LOW";

export default function AppDemo(){
 const [role,setRole]=useState<Role|null>(null);
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState("");
 const [ownerView,setOwnerView]=useState<OwnerView>("today"),[memberView,setMemberView]=useState<MemberView>("home");
 const [signals,setSignals]=useState(seedSignals),[activity,setActivity]=useState<string[]>([]);
 const [query,setQuery]=useState("");
 const [credits,setCredits]=useState(6),[selectedClass,setSelectedClass]=useState("c3"),[booked,setBooked]=useState<string[]>(["c1"]);
 useEffect(()=>{try{const saved=sessionStorage.getItem("studiotasker-demo-role");if(saved==="owner"||saved==="member")setRole(saved)}catch{}},[]);
 function login(e:FormEvent){e.preventDefault();setMessage("");const normalized=email.trim().toLowerCase();
  const next=authenticateDemo(normalized,password);
  if(!next){setMessage("Demo email or password is incorrect.");return}
  setRole(next);try{sessionStorage.setItem("studiotasker-demo-role",next)}catch{} setPassword("");setOwnerView("today");setMemberView("home");
 }
 function logout(){setRole(null);setEmail("");setPassword("");setMessage("");try{sessionStorage.removeItem("studiotasker-demo-role")}catch{}}
 function useAccount(next:Role){if(next==="owner"){setEmail(OWNER_EMAIL);setPassword(OWNER_PASSWORD)}else{setEmail(MEMBER_EMAIL);setPassword(MEMBER_PASSWORD)}setMessage("")}
 function resetOwner(){setSignals(seedSignals);setActivity([]);setOwnerView("today")}
 function ownerAction(signal:Signal,kind:"contacted"|"task"|"tomorrow"){
  const label=kind==="contacted"?"Contact recorded":kind==="task"?"Follow-up task created":"Hidden until tomorrow";
  setSignals(list=>list.filter(x=>x.id!==signal.id));setActivity(x=>[label+" · "+signal.title,...x].slice(0,5));
 }
 function book(id:string){if(booked.includes(id))return;if(credits<1){setMessage("No credits left in this demo membership.");return}
  setBooked(x=>[...x,id]);setCredits(x=>x-1);setSelectedClass(id);setMessage("Class reserved. One demo credit was used.");
 }
 const filteredMembers=useMemo(()=>members.filter(m=>m.name.toLowerCase().includes(query.toLowerCase())||m.plan.toLowerCase().includes(query.toLowerCase())),[query]);

 if(!role)return <main className="sad-login">
  <header className="sad-login-top"><Link href="/" className="sad-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><Link href="/">Back to website ↗</Link></header>
  <section className="sad-login-grid">
   <div className="sad-login-story"><span className="sad-kicker">REAL APP EXPERIENCE / SANDBOX</span><h1>Sign in like a<br/><em>StudioTasker customer.</em></h1>
    <p>A login screen and a role-based workspace: owner operations on one side, member self-service on the other. Everything here is fictional and browser-only.</p>
    <div className="sad-safety"><ShieldCheck size={19}/><span><b>Safe demo environment.</b> No database account is created, no email is sent and no card is charged.</span></div>
    <div className="sad-account-cards">
     <button type="button" onClick={()=>useAccount("owner")}><span>STUDIO OWNER DEMO</span><b>{OWNER_EMAIL}</b><small>Password: {OWNER_PASSWORD}</small><i>Use owner credentials <ArrowRight size={15}/></i></button>
     <button type="button" onClick={()=>useAccount("member")}><span>MEMBER DEMO</span><b>{MEMBER_EMAIL}</b><small>Password: {MEMBER_PASSWORD}</small><i>Use member credentials <ArrowRight size={15}/></i></button>
    </div>
   </div>
   <div className="sad-login-card"><div><StudioTaskerMark/><span>STUDIOTASKER APP</span></div><h2>Welcome back.</h2><p>Sign in to the interactive sandbox.</p>
    {message&&<div className="sad-error" role="status">{message}</div>}
    <form onSubmit={login}><label>Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder={OWNER_EMAIL}/></label>
     <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Demo password"/></label>
     <button type="submit">Sign in to StudioTasker <ArrowRight size={17}/></button></form>
    <small>Demo credentials are intentionally public. Never use them for a real account.</small>
   </div>
  </section>
 </main>;

 const owner=role==="owner";
 return <main className="sad-app">
  <aside className="sad-sidebar"><Link href="/" className="sad-brand sad-sidebar-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <div className="sad-studio"><span className="sad-avatar">{owner?"WS":"AM"}</span><div><b>{owner?"Willow Studio":"Alex Morgan"}</b><small>{owner?"Pilates · Yoga · Barre":"Studio member"}</small></div></div>
   {owner?<nav>{[["today","Today",LayoutDashboard],["members","Members",Users],["classes","Classes",CalendarDays],["followups","Follow-ups",Target],["insights","Insights",BarChart3]].map(([id,label,Icon])=><button key={String(id)} className={ownerView===id?"active":""} onClick={()=>setOwnerView(id as OwnerView)}><Icon size={17}/>{String(label)}</button>)}</nav>:
   <nav>{[["home","My studio",LayoutDashboard],["classes","Classes",CalendarDays],["bookings","My bookings",Ticket],["membership","Membership",CreditCard]].map(([id,label,Icon])=><button key={String(id)} className={memberView===id?"active":""} onClick={()=>setMemberView(id as MemberView)}><Icon size={17}/>{String(label)}</button>)}</nav>}
   <div className="sad-sidebar-bottom"><span>DEMO MODE</span><p>Fictional data · browser only</p>{owner&&<button onClick={resetOwner}><RefreshCw size={15}/> Reset demo</button>}<button onClick={logout}><LogOut size={15}/> Sign out</button></div>
  </aside>
  <section className="sad-main">
   <header className="sad-app-top"><div><span className="sad-kicker">{owner?"OWNER WORKSPACE":"MEMBER PORTAL"}</span><h1>{owner?"Willow Studio":"Hi, Alex."}</h1></div><div className="sad-user-chip"><span>{owner?"S":"A"}</span><div><b>{owner?OWNER_EMAIL:MEMBER_EMAIL}</b><small>{owner?"Owner":"Member"}</small></div></div></header>
   <div className="sad-demo-strip"><ShieldCheck size={15}/><span>Interactive sandbox — changes stay in this browser session only.</span><Link href={owner?"/today":"/experience"}>{owner?"View Today product tour":"View member journey tour"} <ChevronRight size={14}/></Link></div>
   {owner&&ownerView==="today"&&<OwnerToday signals={signals} activity={activity} onAction={ownerAction}/>}
   {owner&&ownerView==="members"&&<section className="sad-view"><ViewHead eyebrow="MEMBERS / RELATIONSHIPS" title="Your studio people." text="A focused member list with the context staff need to act."/>
    <div className="sad-search"><Search size={16}/><input aria-label="Search members" placeholder="Search members or plans" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="sad-table"><div className="sad-tr sad-th"><span>Member</span><span>Plan</span><span>Credits</span><span>Status</span><span>Last visit</span></div>{filteredMembers.map(m=><div className="sad-tr" key={m.id}><span><b>{m.name}</b><small>member@sample.test</small></span><span>{m.plan}</span><span><b>{m.credits}</b></span><span><i className={m.status==="Active"?"good":"pending"}>{m.status}</i></span><span>{m.lastVisit}</span></div>)}</div>
   </section>}
   {owner&&ownerView==="classes"&&<section className="sad-view"><ViewHead eyebrow="CLASSES / RESERVATIONS" title="Make room for movement." text="Capacity and demand, without digging through spreadsheets."/><DemoClasses/></section>}
   {owner&&ownerView==="followups"&&<section className="sad-view"><ViewHead eyebrow="FOLLOW-UPS / WORKFLOW" title="The next action, not another note." text="A small, manageable work queue built from studio signals."/>
    <div className="sad-task-list">{[["HIGH","Mia Carter","Follow up after trial","Today"],["HIGH","Oliver James","Discuss membership renewal","Today"],["NORMAL","Emma Wilson","Check in with inactive member","Tomorrow"],["NORMAL","Ava Reed","Follow up on unfinished checkout","Tomorrow"]].map((t,i)=><article key={i}><span className={t[0]==="HIGH"?"high":"normal"}>{t[0]}</span><div><b>{t[1]}</b><p>{t[2]}</p></div><small>{t[3]}</small><button onClick={()=>setActivity(x=>["Task completed · "+t[1],...x])}><Check size={15}/> Complete</button></article>)}</div>
   </section>}
   {owner&&ownerView==="insights"&&<section className="sad-view"><ViewHead eyebrow="INSIGHTS / EXPLAINABLE" title="See what changed." text="Operational metrics designed to support decisions, not decorate the dashboard."/>
    <div className="sad-metrics"><article><small>TRIAL → MEMBER</small><strong>41%</strong><span>7 of 17 recent trials</span></article><article><small>AVG. OCCUPANCY</small><strong>78%</strong><span>last 30 days</span></article><article><small>RENEWALS DUE</small><strong>8</strong><span>next 14 days</span></article><article><small>INACTIVE MEMBERS</small><strong>5</strong><span>21+ days without attendance</span></article></div>
    <div className="sad-insight-note"><BarChart3 size={24}/><div><b>Built for action, not vanity.</b><p>These demo figures are fictional. The real workspace calculates Today from bookings, attendance, packages and checkout records.</p></div></div>
   </section>}
   {!owner&&memberView==="home"&&<section className="sad-view"><ViewHead eyebrow="MY STUDIO" title="Everything you need for your next class." text="Book, check credits and keep your studio membership moving."/>
    {message&&<p className="sad-member-note">{message}</p>}<div className="sad-member-hero"><div><small>MY CLASS CREDITS</small><strong>{credits}</strong><span>Studio Ten · Active</span></div><div><small>NEXT RESERVATION</small><strong>{booked.length?classes.find(c=>c.id===booked[0])?.title:"None"}</strong><span>{booked.length?classes.find(c=>c.id===booked[0])?.time:"Choose a class below"}</span></div><div><small>ATTENDANCE</small><strong>12</strong><span>visits this membership</span></div></div>
    <h2 className="sad-subhead">Upcoming classes</h2><MemberClasses credits={credits} booked={booked} selected={selectedClass} onSelect={setSelectedClass} onBook={book}/></section>}
   {!owner&&memberView==="classes"&&<section className="sad-view"><ViewHead eyebrow="CLASSES" title="Choose your next class." text="Your credits are ready. Booking is one clear action."/><MemberClasses credits={credits} booked={booked} selected={selectedClass} onSelect={setSelectedClass} onBook={book}/></section>}
   {!owner&&memberView==="bookings"&&<section className="sad-view"><ViewHead eyebrow="MY BOOKINGS" title="Your reserved places." text="All confirmed demo reservations in one place."/><div className="sad-bookings">{booked.length?booked.map(id=>{const c=classes.find(x=>x.id===id)!;return <article key={id}><CalendarDays/><div><small>{c.time}</small><h3>{c.title}</h3><p>{c.coach} · {c.room}</p></div><span>CONFIRMED</span></article>}):<div className="sad-empty">No reservations yet.</div>}</div></section>}
   {!owner&&memberView==="membership"&&<section className="sad-view"><ViewHead eyebrow="MEMBERSHIP" title="Your class pack." text="See credits, status and what renewal looks like."/><div className="sad-membership"><div><small>CURRENT PLAN</small><h3>Studio Ten</h3><p>10 class credits · 60 day validity</p></div><div><small>REMAINING</small><strong>{credits}</strong><span>class credits</span></div><button onClick={()=>{setCredits(x=>x+10);setMessage("Demo renewal completed: 10 credits added. No payment was taken.");}}><WalletCards size={17}/> Simulate renewal · $135</button></div><p className="sad-member-note">Demo only. A live studio would use its own connected payment account; credits appear only after verified payment.</p></section>}
  </section>
 </main>;
}

function ViewHead({eyebrow,title,text}:{eyebrow:string;title:string;text:string}){return <div className="sad-view-head"><span className="sad-kicker">{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>}

function OwnerToday({signals,activity,onAction}:{signals:Signal[];activity:string[];onAction:(s:Signal,k:"contacted"|"task"|"tomorrow")=>void}){
 return <section className="sad-view"><ViewHead eyebrow="STUDIOTASKER TODAY" title="What needs attention." text="A daily operating view with reasons and next actions."/>
  <div className="sad-owner-stats"><article><small>CLASSES TODAY</small><strong>6</strong><span>07:30 → 19:30</span></article><article><small>BOOKINGS</small><strong>42</strong><span>across today</span></article><article><small>OCCUPANCY</small><strong>83%</strong><span>42 / 51 places</span></article><article><small>WAITLISTED</small><strong>2</strong><span>promotion monitored</span></article></div>
  <div className="sad-rescue"><div><span className="sad-kicker">REVENUE RESCUE</span><h3>{signals.length} opportunities to review</h3><p>Observed operational signals — not speculative revenue claims.</p></div><div className="sad-rescue-badges"><span><b>{signals.filter(x=>x.kind==="trial").length}</b> trials</span><span><b>{signals.filter(x=>x.kind==="renewal").length}</b> renewals</span><span><b>{signals.filter(x=>x.kind==="inactive").length}</b> inactive</span><span><b>{signals.filter(x=>x.kind==="checkout").length}</b> checkout</span><span><b>{signals.filter(x=>x.kind==="seat").length}</b> open class</span></div></div>
  <div className="sad-signals">{signals.length?signals.map(s=><article key={s.id} className={s.kind}><div><div className="sad-signal-meta"><span className={s.priority}>{pLabel(s.priority)}</span><small>{s.kind}</small></div><h3>{s.title}</h3><p>{s.reason}</p><small>Suggested: <b>{s.next}</b></small></div><div className="sad-signal-buttons">{s.kind!=="seat"&&<button onClick={()=>onAction(s,"contacted")}><Check size={15}/> Mark contacted</button>}<button onClick={()=>onAction(s,"task")}>{s.kind==="seat"?"Review class":"Make task"}</button><button onClick={()=>onAction(s,"tomorrow")}>Tomorrow</button></div></article>):<div className="sad-empty"><CheckCircle2 size={28}/><b>You&apos;re clear for now.</b><span>Reset the demo to restore the sample signals.</span></div>}</div>
  {activity.length>0&&<div className="sad-activity"><span className="sad-kicker">RECENT DEMO ACTIONS</span>{activity.map((a,i)=><p key={i}>{a}</p>)}</div>}
 </section>;
}
function DemoClasses(){return <div className="sad-class-grid">{classes.map(c=><article key={c.id}><small>{c.time}</small><h3>{c.title}</h3><p>{c.coach} · {c.room}</p><div><span style={{width:(c.booked/c.capacity*100)+"%"}}/></div><b>{c.booked}/{c.capacity} booked</b><em>{Math.max(0,c.capacity-c.booked)} places left</em></article>)}</div>}
function MemberClasses({credits,booked,selected,onSelect,onBook}:{credits:number;booked:string[];selected:string;onSelect:(id:string)=>void;onBook:(id:string)=>void}){return <div className="sad-class-grid">{classes.map(c=><article key={c.id} className={selected===c.id?"selected":""} onClick={()=>onSelect(c.id)}><small>{c.time}</small><h3>{c.title}</h3><p>{c.coach} · {c.room}</p><div className="sad-capacity"><i style={{width:(c.booked/c.capacity*100)+"%"}}/></div><span>{Math.max(0,c.capacity-c.booked)} places left</span>{booked.includes(c.id)?<button disabled><Check size={15}/> Booked</button>:<button disabled={credits<1} onClick={e=>{e.stopPropagation();onBook(c.id)}}>Book class <ArrowRight size={15}/></button>}</article>)}</div>}
