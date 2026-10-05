"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {
 ArrowRight,BarChart3,CalendarDays,Check,CheckCircle2,ChevronRight,LayoutDashboard,LogOut,
 RefreshCw,Search,Settings2,ShieldCheck,Target,Users
} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import {DEMO_ACCOUNT,authenticateDemo} from "../../lib/demo-auth";
import "./app-demo.css";

type OwnerView="today"|"leads"|"members"|"classes"|"followups"|"insights"|"settings";
type Signal={id:string;priority:"high"|"medium"|"low";title:string;reason:string;next:string;kind:"trial"|"renewal"|"inactive"|"package"|"seat"};
type DemoClass={id:string;title:string;time:string;coach:string;room:string;capacity:number;booked:number};
type DemoMember={id:string;name:string;plan:string;credits:number;status:string;lastVisit:string};
type DemoLead={id:string;name:string;source:string;stage:string;nextContact:string;interest:string};
type StudioSettings={name:string;focus:string;timezone:string};

const seedSignals:Signal[]=[
 {id:"s1",priority:"high",kind:"trial",title:"Mia Carter · trial needs a next step",reason:"Trial attended yesterday. No member conversion followed.",next:"Ask whether Mia wants to join"},
 {id:"s2",priority:"high",kind:"renewal",title:"Oliver James · renewal opportunity",reason:"1 class credit remaining. Package expires in 3 days.",next:"Discuss renewal with Oliver"},
 {id:"s3",priority:"medium",kind:"inactive",title:"Emma Wilson · member may be drifting",reason:"No recorded attendance for 24 days.",next:"Check in with Emma"},
 {id:"s4",priority:"medium",kind:"package",title:"Ava Reed · package status needs review",reason:"Member record has remained without a confirmed class package for 2 days.",next:"Review Ava's package status"},
 {id:"s5",priority:"low",kind:"seat",title:"18:30 Barre Foundations · open places",reason:"3 of 8 places are still open tomorrow evening.",next:"Review class roster"}
];
const seedLeads:DemoLead[]=[
 {id:"l1",name:"Mia Carter",source:"Website",stage:"Trial attended",nextContact:"Today",interest:"Reformer"},
 {id:"l2",name:"Leo Brown",source:"Instagram",stage:"New",nextContact:"Tomorrow",interest:"Yoga"},
 {id:"l3",name:"Nora White",source:"Referral",stage:"Contacted",nextContact:"Wednesday",interest:"Barre"},
 {id:"l4",name:"Ella Hall",source:"Website",stage:"Trial booked",nextContact:"Friday",interest:"Pilates"}
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
const stageOrder=["New","Contacted","Trial booked","Trial attended","Won"];
const pLabel=(p:Signal["priority"])=>p==="high"?"HIGH":p==="medium"?"MEDIUM":"LOW";

export default function AppDemo(){
 const [signedIn,setSignedIn]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState("");
 const [view,setView]=useState<OwnerView>("today"),[signals,setSignals]=useState(seedSignals),[activity,setActivity]=useState<string[]>([]);
 const [query,setQuery]=useState(""),[leadQuery,setLeadQuery]=useState(""),[leads,setLeads]=useState(seedLeads);
 const [settings,setSettings]=useState<StudioSettings>({name:"Willow Studio",focus:"Pilates · Yoga · Barre",timezone:"Europe/London"});
 useEffect(()=>{try{if(sessionStorage.getItem("studiotasker-owner-demo")==="1")setSignedIn(true)}catch{}},[]);
 function login(e:FormEvent){e.preventDefault();setMessage("");if(!authenticateDemo(email,password)){setMessage("Demo email or password is incorrect.");return}
  setSignedIn(true);setPassword("");try{sessionStorage.setItem("studiotasker-owner-demo","1")}catch{}
 }
 function logout(){setSignedIn(false);setEmail("");setPassword("");setMessage("");try{sessionStorage.removeItem("studiotasker-owner-demo")}catch{}}
 function reset(){setSignals(seedSignals);setLeads(seedLeads);setSettings({name:"Willow Studio",focus:"Pilates · Yoga · Barre",timezone:"Europe/London"});setActivity([]);setView("today");setMessage("")}
 function act(signal:Signal,kind:"contacted"|"task"|"tomorrow"){
  const label=kind==="contacted"?"Contact recorded":kind==="task"?"Follow-up task created":"Hidden until tomorrow";
  setSignals(list=>list.filter(x=>x.id!==signal.id));setActivity(x=>[label+" · "+signal.title,...x].slice(0,6));
 }
 function advanceLead(lead:DemoLead){
  const index=stageOrder.indexOf(lead.stage),next=stageOrder[Math.min(stageOrder.length-1,index+1)];
  if(next===lead.stage)return;
  setLeads(list=>list.map(x=>x.id===lead.id?{...x,stage:next,nextContact:next==="Won"?"—":"Tomorrow"}:x));
  setActivity(x=>["Lead moved to "+next+" · "+lead.name,...x].slice(0,6));
 }
 function saveSettings(e:FormEvent){e.preventDefault();setMessage("Demo studio settings saved in this browser session.");setActivity(x=>["Studio settings updated · "+settings.name,...x].slice(0,6))}
 const filteredMembers=useMemo(()=>members.filter(m=>m.name.toLowerCase().includes(query.toLowerCase())||m.plan.toLowerCase().includes(query.toLowerCase())),[query]);
 const filteredLeads=useMemo(()=>leads.filter(l=>[l.name,l.source,l.stage,l.interest].some(v=>v.toLowerCase().includes(leadQuery.toLowerCase()))),[leads,leadQuery]);

 if(!signedIn)return <main className="sad-login">
  <header className="sad-login-top"><Link href="/" className="sad-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><Link href="/">Back to website ↗</Link></header>
  <section className="sad-login-grid">
   <div className="sad-login-story"><span className="sad-kicker">STUDIO OWNER APP / SANDBOX</span><h1>Sign in like a<br/><em>StudioTasker customer.</em></h1>
    <p>One canonical StudioTasker owner workspace: Today, Leads / CRM, Members, Classes, Follow-ups, Insights and Settings.</p>
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

 const nav:[OwnerView,string,typeof LayoutDashboard][]=[
  ["today","Today",LayoutDashboard],["leads","Leads / CRM",Target],["members","Members",Users],["classes","Classes",CalendarDays],
  ["followups","Follow-ups",CheckCircle2],["insights","Insights",BarChart3],["settings","Settings",Settings2]
 ];
 return <main className="sad-app">
  <aside className="sad-sidebar"><Link href="/" className="sad-brand sad-sidebar-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <div className="sad-studio"><span className="sad-avatar">WS</span><div><b>{settings.name}</b><small>{settings.focus}</small></div></div>
   <nav aria-label="StudioTasker owner navigation">{nav.map(([id,label,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon size={19}/>{label}</button>)}</nav>
   <div className="sad-sidebar-bottom"><span>DEMO MODE</span><p>Fictional studio data · browser only</p><button onClick={reset}><RefreshCw size={17}/> Reset demo</button><button onClick={logout}><LogOut size={17}/> Sign out</button></div>
  </aside>
  <section className="sad-main">
   <header className="sad-app-top"><div><span className="sad-kicker">OWNER WORKSPACE</span><h1>{settings.name}</h1></div><div className="sad-user-chip"><span>S</span><div><b>{DEMO_ACCOUNT.email}</b><small>Owner</small></div></div></header>
   <div className="sad-demo-strip"><ShieldCheck size={17}/><span>Studio-only sandbox — member payments and member accounts are intentionally outside StudioTasker.</span><Link href="/today">View Today product tour <ChevronRight size={16}/></Link></div>
   {message&&signedIn&&<p className="sad-app-message" role="status">{message}</p>}

   {view==="today"&&<OwnerToday signals={signals} activity={activity} onAction={act}/>}
   {view==="leads"&&<section className="sad-view"><ViewHead eyebrow="LEADS / CRM" title="Make every enquiry count." text="Track the path from first enquiry to studio member, with the next contact always visible."/>
    <div className="sad-pipeline">{stageOrder.slice(0,4).map(stage=><article key={stage}><small>{stage.toUpperCase()}</small><strong>{leads.filter(l=>l.stage===stage).length}</strong><span>active lead{leads.filter(l=>l.stage===stage).length===1?"":"s"}</span></article>)}</div>
    <div className="sad-search"><Search size={18}/><input aria-label="Search leads" placeholder="Search lead, source, stage or interest" value={leadQuery} onChange={e=>setLeadQuery(e.target.value)}/></div>
    <div className="sad-lead-table"><div className="sad-lead-row sad-lead-head"><span>Lead</span><span>Source</span><span>Stage</span><span>Interest</span><span>Next contact</span><span>Action</span></div>
     {filteredLeads.map(lead=><div className="sad-lead-row" key={lead.id}><span><b>{lead.name}</b><small>{lead.name.toLowerCase().replace(" ",".")}@sample.test</small></span><span>{lead.source}</span><span><i className={"sad-stage "+lead.stage.toLowerCase().replaceAll(" ","-")}>{lead.stage}</i></span><span>{lead.interest}</span><span>{lead.nextContact}</span><span><button type="button" disabled={lead.stage==="Won"} onClick={()=>advanceLead(lead)}>{lead.stage==="Won"?"Converted":"Advance stage"}</button></span></div>)}
    </div>
   </section>}
   {view==="members"&&<section className="sad-view"><ViewHead eyebrow="MEMBERS / INTERNAL CRM" title="Your studio people." text="Track member status, class entitlement and follow-up context without handling how the studio gets paid."/>
    <div className="sad-search"><Search size={18}/><input aria-label="Search members" placeholder="Search members or plans" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="sad-table"><div className="sad-tr sad-th"><span>Member</span><span>Plan</span><span>Credits</span><span>Status</span><span>Last visit</span></div>{filteredMembers.map(m=><div className="sad-tr" key={m.id}><span><b>{m.name}</b><small>member@sample.test</small></span><span>{m.plan}</span><span><b>{m.credits}</b></span><span><i className={m.status==="Confirmed"?"good":"pending"}>{m.status}</i></span><span>{m.lastVisit}</span></div>)}</div>
   </section>}
   {view==="classes"&&<section className="sad-view"><ViewHead eyebrow="CLASSES / CAPACITY" title="Make room for movement." text="See class capacity and studio-managed reservations without a separate consumer booking app."/><DemoClasses/></section>}
   {view==="followups"&&<section className="sad-view"><ViewHead eyebrow="FOLLOW-UPS / WORKFLOW" title="The next action, not another note." text="A small work queue built from studio signals."/>
    <div className="sad-task-list">{[["HIGH","Mia Carter","Follow up after trial","Today"],["HIGH","Oliver James","Discuss membership renewal","Today"],["NORMAL","Emma Wilson","Check in with inactive member","Tomorrow"],["NORMAL","Ava Reed","Review package status","Tomorrow"]].map((t,i)=><article key={i}><span className={t[0]==="HIGH"?"high":"normal"}>{t[0]}</span><div><b>{t[1]}</b><p>{t[2]}</p></div><small>{t[3]}</small><button onClick={()=>setActivity(x=>["Task completed · "+t[1],...x])}><Check size={17}/> Complete</button></article>)}</div>
   </section>}
   {view==="insights"&&<section className="sad-view"><ViewHead eyebrow="INSIGHTS / EXPLAINABLE" title="See what changed." text="Operational metrics that help a studio owner decide what to do next."/>
    <div className="sad-metrics"><article><small>TRIAL → MEMBER</small><strong>41%</strong><span>7 of 17 recent trials</span></article><article><small>AVG. OCCUPANCY</small><strong>78%</strong><span>last 30 days</span></article><article><small>RENEWALS DUE</small><strong>8</strong><span>next 14 days</span></article><article><small>INACTIVE MEMBERS</small><strong>5</strong><span>21+ days without attendance</span></article></div>
    <div className="sad-insight-note"><BarChart3 size={28}/><div><b>Built for action, not vanity.</b><p>These figures are fictional. In the real workspace, StudioTasker Today is calculated from studio-entered members, bookings, attendance, class packages and follow-up records.</p></div></div>
   </section>}
   {view==="settings"&&<section className="sad-view"><ViewHead eyebrow="SETTINGS / STUDIO" title="Keep the workspace yours." text="Studio profile and operational defaults — without member payment configuration."/>
    <div className="sad-settings-grid">
     <form className="sad-settings-card" onSubmit={saveSettings}><h3>Studio profile</h3>
      <label>Studio name<input required minLength={2} maxLength={80} value={settings.name} onChange={e=>setSettings({...settings,name:e.target.value})}/></label>
      <label>Studio focus<select value={settings.focus} onChange={e=>setSettings({...settings,focus:e.target.value})}><option>Pilates · Yoga · Barre</option><option>Pilates</option><option>Yoga</option><option>Barre</option><option>Boutique fitness</option><option>Dance</option></select></label>
      <label>Timezone<input required value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}/></label>
      <button type="submit">Save demo settings</button>
     </form>
     <div className="sad-settings-card"><h3>Internal class packages</h3><p>Operational entitlement templates only. StudioTasker does not price or collect member payments.</p>
      <div className="sad-package-row"><div><b>Starter Pack</b><small>5 classes · 30 days</small></div><span>AVAILABLE</span></div>
      <div className="sad-package-row"><div><b>Studio Ten</b><small>10 classes · 60 days</small></div><span>AVAILABLE</span></div>
     </div>
     <div className="sad-settings-card sad-boundary"><h3>StudioTasker product boundary</h3><ul><li>Staff-facing studio operations</li><li>Member CRM, classes, attendance and follow-ups</li><li>Studio-managed package entitlements and credits</li><li>No member login or member checkout</li><li>No member payment processing or card storage</li></ul></div>
    </div>
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
