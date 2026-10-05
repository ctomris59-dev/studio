"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowRight,BarChart3,CalendarDays,Check,CheckCircle2,ChevronRight,LayoutDashboard,LogOut,RefreshCw,Search,ShieldCheck,Target,Users} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import {DEMO_ACCOUNT,authenticateDemo} from "../../lib/demo-auth";
import "./app-demo.css";

type OwnerView="today"|"members"|"classes"|"followups"|"insights";
type Signal={id:string;priority:"high"|"medium"|"low";title:string;reason:string;next:string;kind:"trial"|"renewal"|"inactive"|"package"|"seat"};
type DemoClass={id:string;title:string;time:string;coach:string;room:string;capacity:number;booked:number};
type DemoMember={id:string;name:string;plan:string;credits:number;status:string;lastVisit:string};

const seedSignals:Signal[]=[
 {id:"s1",priority:"high",kind:"trial",title:"Mia Carter · trial needs a next step",reason:"Trial attended yesterday. No member conversion followed.",next:"Ask whether Mia wants to join"},
 {id:"s2",priority:"high",kind:"renewal",title:"Oliver James · renewal opportunity",reason:"1 class credit remaining. Package expires in 3 days.",next:"Discuss renewal with Oliver"},
 {id:"s3",priority:"medium",kind:"inactive",title:"Emma Wilson · member may be drifting",reason:"No recorded attendance for 24 days.",next:"Check in with Emma"},
 {id:"s4",priority:"medium",kind:"package",title:"Ava Reed · package status needs review",reason:"Member record has remained without a confirmed class package for 2 days.",next:"Review Ava's package status"},
 {id:"s5",priority:"low",kind:"seat",title:"18:30 Barre Foundations · open places",reason:"3 of 8 places are still open tomorrow evening.",next:"Review class roster"}
];
const classes:DemoClass[]=[
 {id:"c1",title:"Morning Flow",time:"MON · 07:30",coach:"Sophie M.",room:"Studio One",capacity:8,booked:6},
 {id:"c2",title:"Barre Foundations",time:"TUE · 09:00",coach:"Olivia K.",room:"Studio Two",capacity:10,booked:7},
 {id:"c3",title:"Midday Sculpt",time:"WED · 12:30",coach:"Ava R.",room:"Studio One",capacity:8,booked:5},
 {id:"c4",title:"Evening Reset",time:"THU · 17:30",coach:"Sophie M.",room:"Studio One",capacity:8,booked:8}
];
const members:DemoMember[]=[
 {id:"m1",name:"Emma Wilson",plan:"Studio Ten",credits:4,status:"Confirmed",lastVisit:"24 days ago"},
 {id:"m2",name:"Oliver James",plan:"10 Class Pack",credits:1,status:"Confirmed",lastVisit:"4 days ago"},
 {id:"m3",name:"Ava Reed",plan:"Studio Ten",credits:8,status:"Needs review",lastVisit:"9 days ago"},
 {id:"m4",name:"Noah Martin",plan:"20 Class Pack",credits:13,status:"Confirmed",lastVisit:"Yesterday"},
 {id:"m5",name:"Sofia Lane",plan:"Starter Pack",credits:3,status:"Confirmed",lastVisit:"2 days ago"}
];
const pLabel=(p:Signal["priority"])=>p==="high"?"HIGH":p==="medium"?"MEDIUM":"LOW";

export default function AppDemo(){
 const [signedIn,setSignedIn]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState("");
 const [view,setView]=useState<OwnerView>("today"),[signals,setSignals]=useState(seedSignals),[activity,setActivity]=useState<string[]>([]),[query,setQuery]=useState("");
 useEffect(()=>{try{if(sessionStorage.getItem("studiotasker-owner-demo")==="1")setSignedIn(true)}catch{}},[]);
 function login(e:FormEvent){e.preventDefault();setMessage("");if(!authenticateDemo(email,password)){setMessage("Demo email or password is incorrect.");return}
  setSignedIn(true);setPassword("");try{sessionStorage.setItem("studiotasker-owner-demo","1")}catch{}
 }
 function logout(){setSignedIn(false);setEmail("");setPassword("");setMessage("");try{sessionStorage.removeItem("studiotasker-owner-demo")}catch{}}
 function reset(){setSignals(seedSignals);setActivity([]);setView("today")}
 function act(signal:Signal,kind:"contacted"|"task"|"tomorrow"){
  const label=kind==="contacted"?"Contact recorded":kind==="task"?"Follow-up task created":"Hidden until tomorrow";
  setSignals(list=>list.filter(x=>x.id!==signal.id));setActivity(x=>[label+" · "+signal.title,...x].slice(0,5));
 }
 const filtered=useMemo(()=>members.filter(m=>m.name.toLowerCase().includes(query.toLowerCase())||m.plan.toLowerCase().includes(query.toLowerCase())),[query]);

 if(!signedIn)return <main className="sad-login">
  <header className="sad-login-top"><Link href="/" className="sad-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><Link href="/">Back to website ↗</Link></header>
  <section className="sad-login-grid">
   <div className="sad-login-story"><span className="sad-kicker">STUDIO OWNER APP / SANDBOX</span><h1>Sign in like a<br/><em>StudioTasker customer.</em></h1>
    <p>StudioTasker is sold to studios only. This sandbox shows the owner/manager workspace: daily priorities, members, classes, follow-ups and operational insights.</p>
    <div className="sad-safety"><ShieldCheck size={20}/><span><b>Safe demo environment.</b> No member login, payment processing, email sending or real customer data.</span></div>
    <button className="sad-demo-account" type="button" onClick={()=>{setEmail(DEMO_ACCOUNT.email);setPassword(DEMO_ACCOUNT.password)}}>
     <span>STUDIO OWNER DEMO</span><b>{DEMO_ACCOUNT.email}</b><small>Password: {DEMO_ACCOUNT.password}</small><i>Use demo credentials <ArrowRight size={17}/></i>
    </button>
   </div>
   <div className="sad-login-card"><div><StudioTaskerMark/><span>STUDIOTASKER APP</span></div><h2>Welcome back.</h2><p>Sign in to the owner workspace sandbox.</p>
    {message&&<div className="sad-error" role="status">{message}</div>}
    <form onSubmit={login}><label>Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder={DEMO_ACCOUNT.email}/></label>
     <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Demo password"/></label>
     <button type="submit">Sign in to StudioTasker <ArrowRight size={18}/></button></form>
    <small>These credentials are intentionally public and work only in this browser-based demo.</small>
   </div>
  </section>
 </main>;

 return <main className="sad-app">
  <aside className="sad-sidebar"><Link href="/" className="sad-brand sad-sidebar-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <div className="sad-studio"><span className="sad-avatar">WS</span><div><b>Willow Studio</b><small>Pilates · Yoga · Barre</small></div></div>
   <nav>{[["today","Today",LayoutDashboard],["members","Members",Users],["classes","Classes",CalendarDays],["followups","Follow-ups",Target],["insights","Insights",BarChart3]].map(([id,label,Icon])=><button key={String(id)} className={view===id?"active":""} onClick={()=>setView(id as OwnerView)}><Icon size={19}/>{String(label)}</button>)}</nav>
   <div className="sad-sidebar-bottom"><span>DEMO MODE</span><p>Fictional studio data · browser only</p><button onClick={reset}><RefreshCw size={17}/> Reset demo</button><button onClick={logout}><LogOut size={17}/> Sign out</button></div>
  </aside>
  <section className="sad-main">
   <header className="sad-app-top"><div><span className="sad-kicker">OWNER WORKSPACE</span><h1>Willow Studio</h1></div><div className="sad-user-chip"><span>S</span><div><b>{DEMO_ACCOUNT.email}</b><small>Owner</small></div></div></header>
   <div className="sad-demo-strip"><ShieldCheck size={17}/><span>Studio-only sandbox — member payments and member accounts are intentionally outside StudioTasker.</span><Link href="/today">View Today product tour <ChevronRight size={16}/></Link></div>

   {view==="today"&&<OwnerToday signals={signals} activity={activity} onAction={act}/>}
   {view==="members"&&<section className="sad-view"><ViewHead eyebrow="MEMBERS / INTERNAL CRM" title="Your studio people." text="Track member status, class entitlement and follow-up context without handling how the studio gets paid."/>
    <div className="sad-search"><Search size={18}/><input aria-label="Search members" placeholder="Search members or plans" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="sad-table"><div className="sad-tr sad-th"><span>Member</span><span>Plan</span><span>Credits</span><span>Status</span><span>Last visit</span></div>{filtered.map(m=><div className="sad-tr" key={m.id}><span><b>{m.name}</b><small>member@sample.test</small></span><span>{m.plan}</span><span><b>{m.credits}</b></span><span><i className={m.status==="Confirmed"?"good":"pending"}>{m.status}</i></span><span>{m.lastVisit}</span></div>)}</div>
   </section>}
   {view==="classes"&&<section className="sad-view"><ViewHead eyebrow="CLASSES / CAPACITY" title="Make room for movement." text="See class capacity and studio-managed reservations without a separate consumer booking app."/><DemoClasses/></section>}
   {view==="followups"&&<section className="sad-view"><ViewHead eyebrow="FOLLOW-UPS / WORKFLOW" title="The next action, not another note." text="A small work queue built from studio signals."/>
    <div className="sad-task-list">{[["HIGH","Mia Carter","Follow up after trial","Today"],["HIGH","Oliver James","Discuss membership renewal","Today"],["NORMAL","Emma Wilson","Check in with inactive member","Tomorrow"],["NORMAL","Ava Reed","Review package status","Tomorrow"]].map((t,i)=><article key={i}><span className={t[0]==="HIGH"?"high":"normal"}>{t[0]}</span><div><b>{t[1]}</b><p>{t[2]}</p></div><small>{t[3]}</small><button onClick={()=>setActivity(x=>["Task completed · "+t[1],...x])}><Check size={17}/> Complete</button></article>)}</div>
   </section>}
   {view==="insights"&&<section className="sad-view"><ViewHead eyebrow="INSIGHTS / EXPLAINABLE" title="See what changed." text="Operational metrics that help a studio owner decide what to do next."/>
    <div className="sad-metrics"><article><small>TRIAL → MEMBER</small><strong>41%</strong><span>7 of 17 recent trials</span></article><article><small>AVG. OCCUPANCY</small><strong>78%</strong><span>last 30 days</span></article><article><small>RENEWALS DUE</small><strong>8</strong><span>next 14 days</span></article><article><small>INACTIVE MEMBERS</small><strong>5</strong><span>21+ days without attendance</span></article></div>
    <div className="sad-insight-note"><BarChart3 size={28}/><div><b>Built for action, not vanity.</b><p>These figures are fictional. In the real workspace, StudioTasker Today is calculated from studio-entered members, bookings, attendance, class packages and follow-up records.</p></div></div>
   </section>}
  </section>
 </main>;
}
function ViewHead({eyebrow,title,text}:{eyebrow:string;title:string;text:string}){return <div className="sad-view-head"><span className="sad-kicker">{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>}
function OwnerToday({signals,activity,onAction}:{signals:Signal[];activity:string[];onAction:(s:Signal,k:"contacted"|"task"|"tomorrow")=>void}){
 return <section className="sad-view"><ViewHead eyebrow="STUDIOTASKER TODAY" title="What needs attention." text="A daily operating view with reasons and next actions."/>
  <div className="sad-owner-stats"><article><small>CLASSES TODAY</small><strong>6</strong><span>07:30 → 19:30</span></article><article><small>BOOKINGS</small><strong>42</strong><span>across today</span></article><article><small>OCCUPANCY</small><strong>83%</strong><span>42 / 51 places</span></article><article><small>WAITLISTED</small><strong>2</strong><span>roster monitored</span></article></div>
  <div className="sad-rescue"><div><span className="sad-kicker">REVENUE RESCUE</span><h3>{signals.length} opportunities to review</h3><p>Operational follow-up signals only. StudioTasker does not process member payments.</p></div><div className="sad-rescue-badges"><span><b>{signals.filter(x=>x.kind==="trial").length}</b> trials</span><span><b>{signals.filter(x=>x.kind==="renewal").length}</b> renewals</span><span><b>{signals.filter(x=>x.kind==="inactive").length}</b> inactive</span><span><b>{signals.filter(x=>x.kind==="package").length}</b> package review</span><span><b>{signals.filter(x=>x.kind==="seat").length}</b> open class</span></div></div>
  <div className="sad-signals">{signals.length?signals.map(s=><article key={s.id} className={s.kind}><div><div className="sad-signal-meta"><span className={s.priority}>{pLabel(s.priority)}</span><small>{s.kind}</small></div><h3>{s.title}</h3><p>{s.reason}</p><small>Suggested: <b>{s.next}</b></small></div><div className="sad-signal-buttons">{s.kind!=="seat"&&<button onClick={()=>onAction(s,"contacted")}><Check size={17}/> Mark contacted</button>}<button onClick={()=>onAction(s,"task")}>{s.kind==="seat"?"Review class":"Make task"}</button><button onClick={()=>onAction(s,"tomorrow")}>Tomorrow</button></div></article>):<div className="sad-empty"><CheckCircle2 size={30}/><b>You&apos;re clear for now.</b><span>Reset the demo to restore the sample signals.</span></div>}</div>
  {activity.length>0&&<div className="sad-activity"><span className="sad-kicker">RECENT DEMO ACTIONS</span>{activity.map((a,i)=><p key={i}>{a}</p>)}</div>}
 </section>;
}
function DemoClasses(){return <div className="sad-class-grid">{classes.map(c=><article key={c.id}><small>{c.time}</small><h3>{c.title}</h3><p>{c.coach} · {c.room}</p><div><span style={{width:(c.booked/c.capacity*100)+"%"}}/></div><b>{c.booked}/{c.capacity} booked</b><em>{Math.max(0,c.capacity-c.booked)} places left</em></article>)}</div>}
