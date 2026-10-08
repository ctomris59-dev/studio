"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {
 ArrowRight,BarChart3,CalendarDays,Check,CheckCircle2,ChevronRight,Clock3,LayoutDashboard,LogOut,
 Plus,RefreshCw,Search,Settings2,ShieldCheck,Target,Trash2,Users,X
} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import {DEMO_ACCOUNT,authenticateDemo} from "../../lib/demo-auth";
import "./app-demo.css";

type OwnerView="today"|"leads"|"members"|"classes"|"followups"|"insights"|"settings";
type AddView="leads"|"members"|"classes"|"followups"|null;
type Signal={id:string;priority:"high"|"medium"|"low";title:string;reason:string;next:string;kind:"trial"|"renewal"|"inactive"|"package"|"seat"};
type DemoClass={id:string;title:string;time:string;coach:string;room:string;duration:number;capacity:number;booked:number};
type DemoMember={id:string;name:string;plan:string;credits:number;status:string;lastVisit:string};
type DemoLead={id:string;name:string;source:string;stage:string;nextContact:string;interest:string};
type DemoTask={id:string;priority:"HIGH"|"NORMAL";person:string;title:string;due:string};
type StudioSettings={name:string;focus:string;timezone:string;accentColor:string;memberTerm:string;classTerm:string;creditTerm:string;weekStarts:"monday"|"sunday";timeFormat:"24h"|"12h";defaultView:OwnerView;defaultClassDuration:number;defaultClassCapacity:number;defaultRoom:string;inactiveDays:number;lowCreditsThreshold:number;renewalWindowDays:number;trialFollowupHours:number;packageReviewHours:number;openSeatsThreshold:number;privacyPolicyUrl:string};
const defaultStudioSettings:StudioSettings={name:"Willow Studio",focus:"Pilates",timezone:"Europe/London",accentColor:"#334BDD",memberTerm:"Members",classTerm:"Classes",creditTerm:"Credits",weekStarts:"monday",timeFormat:"24h",defaultView:"today",defaultClassDuration:50,defaultClassCapacity:8,defaultRoom:"Studio One",inactiveDays:21,lowCreditsThreshold:2,renewalWindowDays:14,trialFollowupHours:18,packageReviewHours:24,openSeatsThreshold:2,privacyPolicyUrl:"https://willow.example/privacy"};

const DEMO_ADD_LIMIT=3;
const DEMO_SESSION_SECONDS=60*60;
const DEMO_SESSION_START_KEY="studiotasker-demo-session-start";
const DEMO_SESSION_EXPIRED_KEY="studiotasker-demo-session-expired";
const demoTimeLabel=(seconds:number)=>Math.floor(Math.max(0,seconds)/60)+":"+String(Math.max(0,seconds)%60).padStart(2,"0");
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
const seedClasses:DemoClass[]=[
 {id:"c1",title:"Morning Flow",time:"MON · 07:30",coach:"Sophie M.",room:"Studio One",duration:50,capacity:8,booked:6},
 {id:"c2",title:"Barre Foundations",time:"TUE · 09:00",coach:"Olivia K.",room:"Studio Two",duration:45,capacity:10,booked:7},
 {id:"c3",title:"Midday Sculpt",time:"WED · 12:30",coach:"Ava R.",room:"Studio One",duration:50,capacity:8,booked:5},
 {id:"c4",title:"Evening Reset",time:"THU · 17:30",coach:"Sophie M.",room:"Studio One",duration:50,capacity:8,booked:8}
];
const seedMembers:DemoMember[]=[
 {id:"m1",name:"Emma Wilson",plan:"Studio Ten",credits:4,status:"Confirmed",lastVisit:"24 days ago"},
 {id:"m2",name:"Oliver James",plan:"10 Class Pack",credits:1,status:"Confirmed",lastVisit:"4 days ago"},
 {id:"m3",name:"Ava Reed",plan:"Studio Ten",credits:8,status:"Needs review",lastVisit:"9 days ago"},
 {id:"m4",name:"Noah Martin",plan:"20 Class Pack",credits:13,status:"Confirmed",lastVisit:"Yesterday"},
 {id:"m5",name:"Sofia Lane",plan:"Starter Pack",credits:3,status:"Confirmed",lastVisit:"2 days ago"}
];
const seedTasks:DemoTask[]=[
 {id:"t1",priority:"HIGH",person:"Mia Carter",title:"Follow up after trial",due:"Today"},
 {id:"t2",priority:"HIGH",person:"Oliver James",title:"Discuss membership renewal",due:"Today"},
 {id:"t3",priority:"NORMAL",person:"Emma Wilson",title:"Check in with inactive member",due:"Tomorrow"},
 {id:"t4",priority:"NORMAL",person:"Ava Reed",title:"Review package status",due:"Tomorrow"}
];
const stageOrder=["New","Contacted","Trial booked","Trial attended","Won"];
const pLabel=(p:Signal["priority"])=>p==="high"?"HIGH":p==="medium"?"MEDIUM":"LOW";
const isCreated=(id:string)=>id.startsWith("u-");
const newId=(kind:string)=>"u-"+kind+"-"+Date.now().toString(36);
const singular=(term:string)=>term.endsWith("ies")?term.slice(0,-3)+"y":term.endsWith("sses")?term.slice(0,-2):term.endsWith("s")?term.slice(0,-1):term;
const TOUR_SECONDS=90,TOUR_STEP_SECONDS=15;
const tourSteps:{view:OwnerView;eyebrow:string;title:string;text:string}[]=[
 {view:"today",eyebrow:"00–15 SEC",title:"Start with what needs attention.",text:"StudioTasker Today brings trials, renewals, inactive members, package gaps and open seats into one action list, so the owner knows what to do next."},
 {view:"leads",eyebrow:"15–30 SEC",title:"Turn enquiries into members.",text:"See every lead, where it came from, its current stage and the next contact. Move a lead forward without building a complicated sales pipeline."},
 {view:"members",eyebrow:"30–45 SEC",title:"Keep member context in one place.",text:"Track packages, class credits, status and recent attendance. StudioTasker manages the operational record; member payments stay outside the software."},
 {view:"classes",eyebrow:"45–60 SEC",title:"Run the schedule without spreadsheet drift.",text:"Classes show coach, room, capacity and booked places at a glance. Add a class with the studio defaults already applied."},
 {view:"followups",eyebrow:"60–75 SEC",title:"Make follow-up visible.",text:"Trials, renewals and inactive members become concrete follow-up tasks instead of notes that disappear into inboxes or memory."},
 {view:"settings",eyebrow:"75–90 SEC",title:"Make it feel like your studio.",text:"Change the studio name, logo, accent color, terminology, class defaults and Today rules. The same workspace adapts to Pilates, yoga, barre, gym and other class-based studios."}
];

export default function AppDemo(){
 const [signedIn,setSignedIn]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState("");
 const [view,setView]=useState<OwnerView>("today"),[adding,setAdding]=useState<AddView>(null),[signals,setSignals]=useState(seedSignals),[activity,setActivity]=useState<string[]>([]);
 const [query,setQuery]=useState(""),[leadQuery,setLeadQuery]=useState("");
 const [leads,setLeads]=useState(seedLeads),[memberList,setMemberList]=useState(seedMembers),[classList,setClassList]=useState(seedClasses),[tasks,setTasks]=useState(seedTasks);
 const [settings,setSettings]=useState<StudioSettings>(defaultStudioSettings),[logoUrl,setLogoUrl]=useState<string|null>(null),[customizationSaves,setCustomizationSaves]=useState(0),[logoUploads,setLogoUploads]=useState(0);
 const [leadForm,setLeadForm]=useState({name:"",source:"Website",interest:"Pilates"});
 const [memberForm,setMemberForm]=useState({name:"",plan:"10 Class Pack",credits:10});
 const [classForm,setClassForm]=useState({title:"",time:"FRI · 18:00",coach:"Sophie M.",room:defaultStudioSettings.defaultRoom,duration:defaultStudioSettings.defaultClassDuration,capacity:defaultStudioSettings.defaultClassCapacity});
 const [taskForm,setTaskForm]=useState({person:"",title:"",due:"Tomorrow",priority:"NORMAL" as DemoTask["priority"]});
 const [tourActive,setTourActive]=useState(false),[tourElapsed,setTourElapsed]=useState(0);
 const [demoRemaining,setDemoRemaining]=useState(DEMO_SESSION_SECONDS),[demoExpired,setDemoExpired]=useState(false);
 const tourStepIndex=Math.min(tourSteps.length-1,Math.floor(tourElapsed/TOUR_STEP_SECONDS)),tourStep=tourSteps[tourStepIndex];

 function beginDemoSession(){
  try{
   if(sessionStorage.getItem(DEMO_SESSION_EXPIRED_KEY)==="1"){setDemoExpired(true);setDemoRemaining(0);return false}
   const stored=Number(sessionStorage.getItem(DEMO_SESSION_START_KEY)||"0"),now=Date.now(),started=stored>0?stored:now;
   if(!stored)sessionStorage.setItem(DEMO_SESSION_START_KEY,String(started));
   const remaining=Math.max(0,DEMO_SESSION_SECONDS-Math.floor((now-started)/1000));
   setDemoRemaining(remaining);
   if(remaining<=0){expireDemo();return false}
  }catch{}
  return true;
 }
 function clearDemoSandbox(){
  setSignals(seedSignals);setLeads(seedLeads);setMemberList(seedMembers);setClassList(seedClasses);setTasks(seedTasks);
  setTourActive(false);setSettings(defaultStudioSettings);setLogoUrl(null);setCustomizationSaves(0);setLogoUploads(0);
  setClassForm({title:"",time:"FRI · 18:00",coach:"Sophie M.",room:defaultStudioSettings.defaultRoom,duration:defaultStudioSettings.defaultClassDuration,capacity:defaultStudioSettings.defaultClassCapacity});
  setActivity([]);setView("today");setAdding(null);
  try{["studiotasker-demo-settings","studiotasker-demo-logo","studiotasker-demo-customization-saves","studiotasker-demo-logo-uploads","studiotasker-booking-demo-count","studiotasker-booking-demo-credits"].forEach(k=>sessionStorage.removeItem(k))}catch{}
 }
 function expireDemo(){
  clearDemoSandbox();setSignedIn(false);setDemoExpired(true);setDemoRemaining(0);setEmail("");setPassword("");setMessage("");
  try{sessionStorage.setItem(DEMO_SESSION_EXPIRED_KEY,"1");sessionStorage.removeItem("studiotasker-owner-demo")}catch{}
 }

 useEffect(()=>{try{
  const stored=Number(sessionStorage.getItem(DEMO_SESSION_START_KEY)||"0"),expired=sessionStorage.getItem(DEMO_SESSION_EXPIRED_KEY)==="1";
  if(expired||(stored>0&&Date.now()-stored>=DEMO_SESSION_SECONDS*1000)){setDemoExpired(true);setDemoRemaining(0);sessionStorage.setItem(DEMO_SESSION_EXPIRED_KEY,"1");sessionStorage.removeItem("studiotasker-owner-demo");return}
  if(stored>0)setDemoRemaining(Math.max(0,DEMO_SESSION_SECONDS-Math.floor((Date.now()-stored)/1000)));
  if(sessionStorage.getItem("studiotasker-owner-demo")==="1")setSignedIn(true);
  const saved=sessionStorage.getItem("studiotasker-demo-settings");if(saved)setSettings({...defaultStudioSettings,...JSON.parse(saved)});
  const logo=sessionStorage.getItem("studiotasker-demo-logo");if(logo)setLogoUrl(logo);
  setCustomizationSaves(Number(sessionStorage.getItem("studiotasker-demo-customization-saves")||"0"));
  setLogoUploads(Number(sessionStorage.getItem("studiotasker-demo-logo-uploads")||"0"));
  if(new URLSearchParams(window.location.search).get("tour")==="1"&&beginDemoSession()){setSignedIn(true);setTourElapsed(0);setTourActive(true);sessionStorage.setItem("studiotasker-owner-demo","1")}
 }catch{}},[]);
 useEffect(()=>{if(!signedIn||demoExpired)return;const tick=()=>{try{
   const started=Number(sessionStorage.getItem(DEMO_SESSION_START_KEY)||"0");if(!started)return;
   const remaining=Math.max(0,DEMO_SESSION_SECONDS-Math.floor((Date.now()-started)/1000));setDemoRemaining(remaining);if(remaining<=0)expireDemo();
  }catch{}};tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer)},[signedIn,demoExpired]);
 useEffect(()=>{if(!tourActive)return;const timer=window.setInterval(()=>setTourElapsed(value=>Math.min(TOUR_SECONDS,value+1)),1000);return()=>window.clearInterval(timer)},[tourActive]);
 useEffect(()=>{if(!tourActive)return;setView(tourStep.view);setAdding(null);setMessage("")},[tourActive,tourStep.view]);
 useEffect(()=>{if(tourActive&&tourElapsed>=TOUR_SECONDS){setTourActive(false);setView("today");setMessage("90-second guided tour complete. The sandbox is now yours to explore.")}},[tourActive,tourElapsed]);

 function startTour(){if(!beginDemoSession())return;setSignedIn(true);setTourElapsed(0);setTourActive(true);setView("today");setAdding(null);setMessage("");try{sessionStorage.setItem("studiotasker-owner-demo","1")}catch{}}
 function jumpTour(direction:-1|1){const target=Math.max(0,Math.min(tourSteps.length-1,tourStepIndex+direction));setTourElapsed(target*TOUR_STEP_SECONDS)}
 function finishTour(){setTourActive(false);setView("today");setMessage("90-second guided tour complete. The sandbox is now yours to explore.")}
 function login(e:FormEvent){e.preventDefault();setMessage("");if(!authenticateDemo(email,password)){setMessage("Demo email or password is incorrect.");return}
  if(!beginDemoSession())return;
  setSignedIn(true);setView(settings.defaultView);setPassword("");try{sessionStorage.setItem("studiotasker-owner-demo","1")}catch{}
 }
 function logout(){setTourActive(false);setSignedIn(false);setEmail("");setPassword("");setMessage("");try{sessionStorage.removeItem("studiotasker-owner-demo")}catch{}}
 function reset(){clearDemoSandbox();setMessage("Demo restored to its original sample data. The 60-minute session timer continues.")}
 function act(signal:Signal,kind:"contacted"|"task"|"tomorrow"){
  const label=kind==="contacted"?"Contact recorded":kind==="task"?"Follow-up task created":"Hidden until tomorrow";
  if(kind==="task"&&signal.kind!=="seat")setTasks(list=>[{id:newId("task"),priority:signal.priority==="high"?"HIGH":"NORMAL",person:signal.title.split(" · ")[0],title:signal.next,due:"Tomorrow"},...list]);
  setSignals(list=>list.filter(x=>x.id!==signal.id));setActivity(x=>[label+" · "+signal.title,...x].slice(0,6));
 }
 function advanceLead(lead:DemoLead){
  const index=stageOrder.indexOf(lead.stage),next=stageOrder[Math.min(stageOrder.length-1,index+1)];if(next===lead.stage)return;
  setLeads(list=>list.map(x=>x.id===lead.id?{...x,stage:next,nextContact:next==="Won"?"Not scheduled":"Tomorrow"}:x));
  setActivity(x=>["Lead moved to "+next+" · "+lead.name,...x].slice(0,6));
 }
 function removeLead(id:string){setLeads(x=>x.filter(v=>v.id!==id));setActivity(x=>["Lead removed in demo",...x].slice(0,6))}
 function removeMember(id:string){setMemberList(x=>x.filter(v=>v.id!==id));setActivity(x=>["Member removed in demo",...x].slice(0,6))}
 function removeClass(id:string){setClassList(x=>x.filter(v=>v.id!==id));setActivity(x=>["Class removed in demo",...x].slice(0,6))}
 function removeTask(id:string){setTasks(x=>x.filter(v=>v.id!==id));setActivity(x=>["Follow-up removed in demo",...x].slice(0,6))}
 function completeTask(task:DemoTask){setTasks(x=>x.filter(v=>v.id!==task.id));setActivity(x=>["Task completed · "+task.person,...x].slice(0,6))}
 function atLimit<T extends {id:string}>(items:T[]){return items.filter(x=>isCreated(x.id)).length>=DEMO_ADD_LIMIT}
 function addLead(e:FormEvent){e.preventDefault();if(atLimit(leads)){setMessage("Demo limit reached: up to 3 new leads.");return}
  const name=leadForm.name.trim();if(name.length<2)return;
  setLeads(x=>[{id:newId("lead"),name,source:leadForm.source,stage:"New",nextContact:"Tomorrow",interest:leadForm.interest},...x]);
  setLeadForm({name:"",source:"Website",interest:"Pilates"});setAdding(null);setMessage("Demo lead added.");setActivity(x=>["Lead added · "+name,...x].slice(0,6));
 }
 function addMember(e:FormEvent){e.preventDefault();if(atLimit(memberList)){setMessage("Demo limit reached: up to 3 new members.");return}
  const name=memberForm.name.trim();if(name.length<2)return;
  setMemberList(x=>[{id:newId("member"),name,plan:memberForm.plan,credits:Math.max(0,Math.min(100,memberForm.credits)),status:"Confirmed",lastVisit:"New member"},...x]);
  setMemberForm({name:"",plan:"10 Class Pack",credits:10});setAdding(null);setMessage("Demo member added. No payment was processed.");setActivity(x=>["Member added · "+name,...x].slice(0,6));
 }
 function addClass(e:FormEvent){e.preventDefault();if(atLimit(classList)){setMessage("Demo limit reached: up to 3 new classes.");return}
  const title=classForm.title.trim();if(title.length<2)return;
  setClassList(x=>[{id:newId("class"),title,time:classForm.time,coach:classForm.coach.trim()||"Studio Coach",room:classForm.room.trim()||settings.defaultRoom,duration:Math.max(15,Math.min(240,classForm.duration)),capacity:Math.max(1,Math.min(30,classForm.capacity)),booked:0},...x]);
  setClassForm({title:"",time:"FRI · 18:00",coach:"Sophie M.",room:settings.defaultRoom,duration:settings.defaultClassDuration,capacity:settings.defaultClassCapacity});setAdding(null);setMessage("Demo class added using your current class defaults.");setActivity(x=>["Class added · "+title,...x].slice(0,6));
 }
 function addTask(e:FormEvent){e.preventDefault();if(atLimit(tasks)){setMessage("Demo limit reached: up to 3 new follow-ups.");return}
  const person=taskForm.person.trim(),title=taskForm.title.trim();if(person.length<2||title.length<2)return;
  setTasks(x=>[{id:newId("task"),priority:taskForm.priority,person,title,due:taskForm.due},...x]);
  setTaskForm({person:"",title:"",due:"Tomorrow",priority:"NORMAL"});setAdding(null);setMessage("Demo follow-up added.");setActivity(x=>["Follow-up added · "+person,...x].slice(0,6));
 }
 function saveSettings(e:FormEvent){e.preventDefault();if(customizationSaves>=5){setMessage("Demo customization limit reached: reset the demo to try again.");return}const nextCount=customizationSaves+1;setCustomizationSaves(nextCount);setClassForm(v=>({...v,room:settings.defaultRoom,duration:settings.defaultClassDuration,capacity:settings.defaultClassCapacity}));try{sessionStorage.setItem("studiotasker-demo-settings",JSON.stringify(settings));sessionStorage.setItem("studiotasker-demo-customization-saves",String(nextCount))}catch{}setMessage("Demo customization saved for this browser tab. "+(5-nextCount)+" demo saves remaining.");setActivity(x=>["Studio customization updated · "+settings.name,...x].slice(0,6))}
 function uploadDemoLogo(file:File){if(logoUploads>=2){setMessage("Demo logo upload limit reached: reset the demo to try another logo.");return}if(file.size>200000){setMessage("Demo logo must be 200 KB or smaller.");return}if(!["image/png","image/jpeg","image/webp"].includes(file.type)){setMessage("Use PNG, JPEG or WebP for the demo logo.");return}const reader=new FileReader();reader.onload=()=>{const value=typeof reader.result==="string"?reader.result:"";if(!value)return;const nextUploads=logoUploads+1;setLogoUploads(nextUploads);setLogoUrl(value);try{sessionStorage.setItem("studiotasker-demo-logo",value);sessionStorage.setItem("studiotasker-demo-logo-uploads",String(nextUploads))}catch{}setMessage("Demo logo added. It now appears in the sidebar, preview and booking page.")};reader.readAsDataURL(file)}
 function removeDemoLogo(){setLogoUrl(null);try{sessionStorage.removeItem("studiotasker-demo-logo")}catch{}setMessage("Demo logo removed.")}
 const filteredMembers=useMemo(()=>memberList.filter(m=>m.name.toLowerCase().includes(query.toLowerCase())||m.plan.toLowerCase().includes(query.toLowerCase())),[memberList,query]);
 const filteredLeads=useMemo(()=>leads.filter(l=>[l.name,l.source,l.stage,l.interest].some(v=>v.toLowerCase().includes(leadQuery.toLowerCase()))),[leads,leadQuery]);

 if(demoExpired)return <main className="sad-demo-expired">
  <header className="sad-login-top"><Link href="/" className="sad-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><Link href="/">Back to website ↗</Link></header>
  <section className="sad-expired-card"><span className="sad-kicker">60-MINUTE DEMO COMPLETE</span><Clock3 size={42}/><h1>Ready for the<br/><em>real workspace?</em></h1><p>Your demo sandbox has been reset. Choose a StudioTasker plan to keep real studio data, settings and day-to-day operations in a private customer workspace.</p>
   <div className="sad-expired-actions"><Link href="/start">CHOOSE A PLAN <ArrowRight size={18}/></Link><Link href="/">RETURN TO WEBSITE</Link></div>
   <small>The interactive demo is temporary and never becomes a free customer workspace.</small>
  </section>
 </main>;

 if(!signedIn)return <main className="sad-login">
  <header className="sad-login-top"><Link href="/" className="sad-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><Link href="/">Back to website ↗</Link></header>
  <section className="sad-login-grid">
   <div className="sad-login-story"><span className="sad-kicker">STUDIO OWNER APP / SANDBOX</span><h1>Sign in like a<br/><em>StudioTasker customer.</em></h1>
    <p>One canonical StudioTasker owner workspace: Today, Leads / CRM, Members, Classes, Follow-ups, Insights and Settings.</p>
    <div className="sad-safety"><ShieldCheck size={20}/><span><b>Safe 60-minute demo.</b> Add, edit the flow and remove fictional records. The session expires and resets automatically; no real data or payments.</span></div>
    <button className="sad-demo-account" type="button" onClick={()=>{setEmail(DEMO_ACCOUNT.email);setPassword(DEMO_ACCOUNT.password)}}>
     <span>STUDIO OWNER DEMO</span><b>{DEMO_ACCOUNT.email}</b><small>Password: {DEMO_ACCOUNT.password}</small><i>Use demo credentials <ArrowRight size={17}/></i>
    </button>
    <button className="sad-watch-tour" type="button" onClick={startTour}><span>90-SECOND GUIDED TOUR</span><b>Watch StudioTasker run a studio</b><i>No sign-in · starts instantly <ArrowRight size={17}/></i></button>
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
  ["today","Today",LayoutDashboard],["leads","Leads / CRM",Target],["members",settings.memberTerm,Users],["classes",settings.classTerm,CalendarDays],
  ["followups","Follow-ups",CheckCircle2],["insights","Insights",BarChart3],["settings","Settings",Settings2]
 ];
 return <main className="sad-app">
  <aside className="sad-sidebar"><Link href="/" className="sad-brand sad-sidebar-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <div className="sad-studio">{logoUrl?<span className="sad-avatar sad-avatar-logo"><img src={logoUrl} alt={settings.name+" logo"}/></span>:<span className="sad-avatar" style={{background:settings.accentColor}}>{settings.name.split(/\\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}</span>}<div><b>{settings.name}</b><small>{settings.focus}</small></div></div>
   <nav aria-label="StudioTasker owner navigation">{nav.map(([id,label,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>{setTourActive(false);setView(id);setAdding(null);setMessage("")}}><Icon size={19}/>{label}</button>)}</nav>
   <div className="sad-sidebar-bottom"><span>DEMO MODE</span><p>Fictional studio data · browser only</p><button onClick={reset}><RefreshCw size={17}/> Reset demo</button><button onClick={logout}><LogOut size={17}/> Sign out</button></div>
  </aside>
  <section className="sad-main">
   <header className="sad-app-top"><div><span className="sad-kicker">OWNER WORKSPACE</span><h1>{settings.name}</h1></div><div className="sad-user-chip"><span>S</span><div><b>{DEMO_ACCOUNT.email}</b><small>Owner</small></div></div></header>
   <div className="sad-demo-strip"><ShieldCheck size={17}/><span>60-minute sandbox · {demoTimeLabel(demoRemaining)} left · max 3 new records per section.</span><button type="button" className="sad-tour-start" onClick={startTour}>Watch 90-sec demo <ChevronRight size={16}/></button></div>
   {tourActive&&<aside className="sad-tour-card" role="dialog" aria-live="polite" aria-label="90-second StudioTasker guided tour">
    <div className="sad-tour-card-top"><span>{tourStep.eyebrow} · GUIDED TOUR</span><button type="button" aria-label="Close guided tour" onClick={()=>setTourActive(false)}><X size={18}/></button></div>
    <div className="sad-tour-progress" aria-hidden="true"><i style={{width:Math.min(100,(tourElapsed/TOUR_SECONDS)*100)+"%"}}/></div>
    <div className="sad-tour-meta"><span>STEP {tourStepIndex+1} / {tourSteps.length}</span><span>{tourElapsed}s / {TOUR_SECONDS}s</span></div>
    <h2>{tourStep.title}</h2><p>{tourStep.text}</p>
    <div className="sad-tour-actions"><button type="button" disabled={tourStepIndex===0} onClick={()=>jumpTour(-1)}>Back</button><button type="button" onClick={()=>tourStepIndex===tourSteps.length-1?finishTour():jumpTour(1)}>{tourStepIndex===tourSteps.length-1?"Finish":"Next"} <ArrowRight size={16}/></button></div>
   </aside>}
   {message&&signedIn&&<p className="sad-app-message" role="status">{message}</p>}

   {view==="today"&&<OwnerToday signals={signals} activity={activity} settings={settings} onAction={act}/>}
   {view==="leads"&&<section className="sad-view"><ViewHead eyebrow="LEADS / CRM" title="Make every enquiry count." text="Track the path from first enquiry to studio member, with the next contact always visible."/>
    <DemoToolbar label="+ Add lead" count={leads.filter(x=>isCreated(x.id)).length} open={adding==="leads"} onToggle={()=>setAdding(adding==="leads"?null:"leads")}/>
    {adding==="leads"&&<form className="sad-quick-form" onSubmit={addLead}><button type="button" className="sad-form-close" aria-label="Close add lead" onClick={()=>setAdding(null)}><X size={17}/></button>
     <label>Name<input autoFocus required minLength={2} maxLength={60} value={leadForm.name} onChange={e=>setLeadForm({...leadForm,name:e.target.value})} placeholder="Jamie Taylor"/></label>
     <label>Source<select value={leadForm.source} onChange={e=>setLeadForm({...leadForm,source:e.target.value})}><option>Website</option><option>Instagram</option><option>Referral</option><option>Walk-in</option></select></label>
     <label>Interest<select value={leadForm.interest} onChange={e=>setLeadForm({...leadForm,interest:e.target.value})}><option>Pilates</option><option>Reformer</option><option>Yoga</option><option>Barre</option></select></label>
     <button type="submit" disabled={atLimit(leads)}><Plus size={16}/> Add demo lead</button></form>}
    <div className="sad-pipeline">{stageOrder.slice(0,4).map(stage=><article key={stage}><small>{stage.toUpperCase()}</small><strong>{leads.filter(l=>l.stage===stage).length}</strong><span>active lead{leads.filter(l=>l.stage===stage).length===1?"":"s"}</span></article>)}</div>
    <div className="sad-search"><Search size={18}/><input aria-label="Search leads" placeholder="Search lead, source, stage or interest" value={leadQuery} onChange={e=>setLeadQuery(e.target.value)}/></div>
    <div className="sad-lead-table"><div className="sad-lead-row sad-lead-head"><span>Lead</span><span>Source</span><span>Stage</span><span>Interest</span><span>Next contact</span><span>Actions</span></div>
     {filteredLeads.map(lead=><div className="sad-lead-row" key={lead.id}><span><b>{lead.name}</b><small>{isCreated(lead.id)?"Added in demo":lead.name.toLowerCase().replace(" ",".")+"@sample.test"}</small></span><span>{lead.source}</span><span><i className={"sad-stage "+lead.stage.toLowerCase().replaceAll(" ","-")}>{lead.stage}</i></span><span>{lead.interest}</span><span>{lead.nextContact}</span><span className="sad-row-actions"><button type="button" disabled={lead.stage==="Won"} onClick={()=>advanceLead(lead)}>{lead.stage==="Won"?"Converted":"Advance"}</button><button type="button" className="danger" aria-label={"Remove "+lead.name} onClick={()=>removeLead(lead.id)}><Trash2 size={15}/></button></span></div>)}
    </div>
   </section>}
   {view==="members"&&<section className="sad-view"><ViewHead eyebrow={settings.memberTerm.toUpperCase()+" / INTERNAL CRM"} title={"Your studio "+settings.memberTerm.toLowerCase()+"."} text="Track status, class entitlement and follow-up context without handling how the studio gets paid."/>
    <DemoToolbar label="+ Add member" count={memberList.filter(x=>isCreated(x.id)).length} open={adding==="members"} onToggle={()=>setAdding(adding==="members"?null:"members")}/>
    {adding==="members"&&<form className="sad-quick-form" onSubmit={addMember}><button type="button" className="sad-form-close" aria-label="Close add member" onClick={()=>setAdding(null)}><X size={17}/></button>
     <label>Name<input autoFocus required minLength={2} maxLength={60} value={memberForm.name} onChange={e=>setMemberForm({...memberForm,name:e.target.value})} placeholder="Alex Morgan"/></label>
     <label>Class package<select value={memberForm.plan} onChange={e=>setMemberForm({...memberForm,plan:e.target.value})}><option>Starter Pack</option><option>10 Class Pack</option><option>Studio Ten</option><option>20 Class Pack</option></select></label>
     <label>Credits<input type="number" min={0} max={100} value={memberForm.credits} onChange={e=>setMemberForm({...memberForm,credits:Number(e.target.value)})}/></label>
     <button type="submit" disabled={atLimit(memberList)}><Plus size={16}/> Add demo member</button></form>}
    <div className="sad-search"><Search size={18}/><input aria-label="Search members" placeholder="Search members or plans" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="sad-table"><div className="sad-tr sad-th sad-tr-actions"><span>Member</span><span>Plan</span><span>Credits</span><span>Status</span><span>Last visit</span><span>Actions</span></div>{filteredMembers.map(m=><div className="sad-tr sad-tr-actions" key={m.id}><span><b>{m.name}</b><small>{isCreated(m.id)?"Added in demo":"member@sample.test"}</small></span><span>{m.plan}</span><span><b>{m.credits}</b></span><span><i className={m.status==="Confirmed"?"good":"pending"}>{m.status}</i></span><span>{m.lastVisit}</span><span className="sad-row-actions"><button type="button" className="danger" aria-label={"Remove "+m.name} onClick={()=>removeMember(m.id)}><Trash2 size={15}/></button></span></div>)}</div>
   </section>}
   {view==="classes"&&<section className="sad-view"><ViewHead eyebrow={settings.classTerm.toUpperCase()+" / CLASS OPERATIONS"} title="Make room for movement." text="Recurring schedules, waitlists, check-in, no-show handling and numbered equipment spots live in the real workspace."/>
    <div className="sad-class-os-strip"><span>RECURRING</span><span>WAITLIST</span><span>CHECK-IN</span><span>NO-SHOW</span><span>EQUIPMENT SPOTS</span><span>STAFF / SUBS</span></div>
    <DemoToolbar label={"+ Add "+singular(settings.classTerm).toLowerCase()} count={classList.filter(x=>isCreated(x.id)).length} open={adding==="classes"} onToggle={()=>setAdding(adding==="classes"?null:"classes")}/>
    {adding==="classes"&&<form className="sad-quick-form sad-class-form" onSubmit={addClass}><button type="button" className="sad-form-close" aria-label="Close add class" onClick={()=>setAdding(null)}><X size={17}/></button>
     <label>{singular(settings.classTerm)} name<input autoFocus required minLength={2} maxLength={70} value={classForm.title} onChange={e=>setClassForm({...classForm,title:e.target.value})} placeholder="Friday Flow"/></label>
     <label>Day & time<input required maxLength={30} value={classForm.time} onChange={e=>setClassForm({...classForm,time:e.target.value})}/></label>
     <label>Coach<input required maxLength={50} value={classForm.coach} onChange={e=>setClassForm({...classForm,coach:e.target.value})}/></label>
     <label>Room<input required maxLength={50} value={classForm.room} onChange={e=>setClassForm({...classForm,room:e.target.value})}/></label>
     <label>Duration<input type="number" min={15} max={240} value={classForm.duration} onChange={e=>setClassForm({...classForm,duration:Number(e.target.value)})}/></label>
     <label>Capacity<input type="number" min={1} max={30} value={classForm.capacity} onChange={e=>setClassForm({...classForm,capacity:Number(e.target.value)})}/></label>
     <button type="submit" disabled={atLimit(classList)}><Plus size={16}/> Add demo class</button></form>}
    <DemoClasses items={classList} onRemove={removeClass}/></section>}
   {view==="followups"&&<section className="sad-view"><ViewHead eyebrow="FOLLOW-UPS / WORKFLOW" title="The next action, not another note." text="A small work queue built from studio signals."/>
    <DemoToolbar label="+ Add follow-up" count={tasks.filter(x=>isCreated(x.id)).length} open={adding==="followups"} onToggle={()=>setAdding(adding==="followups"?null:"followups")}/>
    {adding==="followups"&&<form className="sad-quick-form" onSubmit={addTask}><button type="button" className="sad-form-close" aria-label="Close add follow-up" onClick={()=>setAdding(null)}><X size={17}/></button>
     <label>Person<input autoFocus required minLength={2} maxLength={60} value={taskForm.person} onChange={e=>setTaskForm({...taskForm,person:e.target.value})} placeholder="Jamie Taylor"/></label>
     <label>Follow-up<input required minLength={2} maxLength={100} value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} placeholder="Check in after trial"/></label>
     <label>Due<select value={taskForm.due} onChange={e=>setTaskForm({...taskForm,due:e.target.value})}><option>Today</option><option>Tomorrow</option><option>This week</option></select></label>
     <label>Priority<select value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value as DemoTask["priority"]})}><option>NORMAL</option><option>HIGH</option></select></label>
     <button type="submit" disabled={atLimit(tasks)}><Plus size={16}/> Add demo follow-up</button></form>}
    <div className="sad-task-list">{tasks.map(task=><article key={task.id}><span className={task.priority==="HIGH"?"high":"normal"}>{task.priority}</span><div><b>{task.person}</b><p>{task.title}</p>{isCreated(task.id)&&<small>Added in demo</small>}</div><small>{task.due}</small><span className="sad-row-actions"><button onClick={()=>completeTask(task)}><Check size={17}/> Complete</button><button className="danger" aria-label={"Remove follow-up for "+task.person} onClick={()=>removeTask(task.id)}><Trash2 size={15}/></button></span></article>)}</div>
   </section>}
   {view==="insights"&&<section className="sad-view"><ViewHead eyebrow="INSIGHTS / EXPLAINABLE" title="See what changed." text="Operational metrics that help a studio owner decide what to do next."/>
    <div className="sad-metrics"><article><small>TRIAL → MEMBER</small><strong>41%</strong><span>7 of 17 recent trials</span></article><article><small>AVG. OCCUPANCY</small><strong>78%</strong><span>last 30 days</span></article><article><small>RENEWALS DUE</small><strong>8</strong><span>next 14 days</span></article><article><small>INACTIVE MEMBERS</small><strong>5</strong><span>21+ days without attendance</span></article></div>
    <div className="sad-insight-note"><BarChart3 size={28}/><div><b>Built for action, not vanity.</b><p>These figures are fictional. In the real workspace, StudioTasker Today is calculated from studio-entered members, bookings, attendance, class packages and follow-up records.</p></div></div>
   </section>}
   {view==="settings"&&<section className="sad-view"><ViewHead eyebrow="SETTINGS / CUSTOMIZE" title="Make StudioTasker yours." text="This is where a studio customizes its identity, terminology and booking experience after purchase."/>
    <div className="sad-customize-preview">
     <div className="sad-brand-preview" style={{borderColor:settings.accentColor}}>{logoUrl?<img src={logoUrl} alt="Studio logo preview"/>:<span style={{background:settings.accentColor}}>{settings.name.split(/\\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}</span>}<div><small>LIVE BRAND PREVIEW</small><b>{settings.name}</b><em>{settings.memberTerm} · {settings.classTerm} · {settings.creditTerm}</em></div></div>
     <div><span className="sad-kicker">CUSTOMER WORKSPACE</span><h3>One product. Their studio identity.</h3><p>Customers do not receive a separate codebase. These settings personalize their own StudioTasker workspace and public booking page.</p></div>
    </div>
    <form className="sad-settings-grid" onSubmit={saveSettings}>
     <div className="sad-settings-card"><h3>Identity & branding</h3><p>Studio owners upload their logo and choose the main brand color here.</p>
      <label>Studio name<input required minLength={2} maxLength={80} value={settings.name} onChange={e=>setSettings({...settings,name:e.target.value})}/></label>
      <label>Studio focus<select value={settings.focus} onChange={e=>setSettings({...settings,focus:e.target.value})}><option>Pilates</option><option>Yoga</option><option>Barre</option><option>Dance</option><option>Indoor cycling</option><option>Fitness &amp; Gym</option><option>Boutique fitness</option></select></label>
      <label>Primary brand color<div className="sad-color-row"><input aria-label="Brand color picker" type="color" value={settings.accentColor} onChange={e=>setSettings({...settings,accentColor:e.target.value.toUpperCase()})}/><input aria-label="Brand color hex" pattern="^#[0-9A-Fa-f]{6}$" maxLength={7} value={settings.accentColor} onChange={e=>setSettings({...settings,accentColor:e.target.value})}/></div></label>
      <label>Studio logo <small>PNG / JPEG / WebP · max 200 KB</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)uploadDemoLogo(file);e.currentTarget.value=""}}/></label>
      {logoUrl&&<button type="button" className="sad-remove-logo" onClick={removeDemoLogo}><Trash2 size={15}/> Remove demo logo</button>}
     </div>
     <div className="sad-settings-card"><h3>Terminology & display</h3><p>Studios can make the wording match how they actually operate.</p>
      <label>People label<select value={settings.memberTerm} onChange={e=>setSettings({...settings,memberTerm:e.target.value})}>{["Members","Clients","Students","Customers"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Class label<select value={settings.classTerm} onChange={e=>setSettings({...settings,classTerm:e.target.value})}>{["Classes","Sessions","Lessons"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Credit label<select value={settings.creditTerm} onChange={e=>setSettings({...settings,creditTerm:e.target.value})}>{["Credits","Visits","Sessions"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Timezone<input required value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}/></label>
     </div>
     <div className="sad-settings-card"><h3>Workspace display</h3><p>These settings control how staff see dates, navigation and the first screen after sign-in.</p>
      <label>Default landing page<select value={settings.defaultView} onChange={e=>setSettings({...settings,defaultView:e.target.value as OwnerView})}>{["today","leads","members","classes","followups","insights","settings"].map(x=><option key={x} value={x}>{x==="members"?settings.memberTerm:x==="classes"?settings.classTerm:x==="leads"?"Leads / CRM":x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label>
      <label>Week starts<select value={settings.weekStarts} onChange={e=>setSettings({...settings,weekStarts:e.target.value as "monday"|"sunday"})}><option value="monday">Monday</option><option value="sunday">Sunday</option></select></label>
      <label>Time format<select value={settings.timeFormat} onChange={e=>setSettings({...settings,timeFormat:e.target.value as "24h"|"12h"})}><option value="24h">24-hour</option><option value="12h">12-hour</option></select></label>
      <div className="sad-display-preview"><span><b>WEEK</b>{settings.weekStarts==="monday"?"MON → SUN":"SUN → SAT"}</span><span><b>TIME</b>{settings.timeFormat==="24h"?"17:30":"5:30 PM"}</span><span><b>LANDING</b>{settings.defaultView==="members"?settings.memberTerm:settings.defaultView==="classes"?settings.classTerm:settings.defaultView==="leads"?"Leads / CRM":settings.defaultView.charAt(0).toUpperCase()+settings.defaultView.slice(1)}</span></div><p className="sad-settings-hint">The selected landing page is used the next time you sign in to this demo.</p>
     </div>
     <div className="sad-settings-card"><h3>{settings.classTerm} defaults</h3><p>New demo {settings.classTerm.toLowerCase()} pick up these starting values after you save customization.</p>
      <label>Default duration (minutes)<input type="number" min={15} max={240} value={settings.defaultClassDuration} onChange={e=>setSettings({...settings,defaultClassDuration:Number(e.target.value)})}/></label>
      <label>Default capacity<input type="number" min={1} max={30} value={settings.defaultClassCapacity} onChange={e=>setSettings({...settings,defaultClassCapacity:Number(e.target.value)})}/></label>
      <label>Default room<input required minLength={1} maxLength={50} value={settings.defaultRoom} onChange={e=>setSettings({...settings,defaultRoom:e.target.value})}/></label>
     </div>
     <div className="sad-settings-card"><h3>StudioTasker Today rules</h3><p>Change when operational signals appear. The Today screen shows your saved demo rule values.</p>
      <label>Inactive after (days)<input type="number" min={7} max={90} value={settings.inactiveDays} onChange={e=>setSettings({...settings,inactiveDays:Number(e.target.value)})}/></label>
      <label>Low {settings.creditTerm.toLowerCase()} at or below<input type="number" min={0} max={10} value={settings.lowCreditsThreshold} onChange={e=>setSettings({...settings,lowCreditsThreshold:Number(e.target.value)})}/></label>
      <label>Renewal window (days)<input type="number" min={1} max={60} value={settings.renewalWindowDays} onChange={e=>setSettings({...settings,renewalWindowDays:Number(e.target.value)})}/></label>
      <label>Trial follow-up after (hours)<input type="number" min={1} max={168} value={settings.trialFollowupHours} onChange={e=>setSettings({...settings,trialFollowupHours:Number(e.target.value)})}/></label>
      <label>Package review after (hours)<input type="number" min={1} max={168} value={settings.packageReviewHours} onChange={e=>setSettings({...settings,packageReviewHours:Number(e.target.value)})}/></label>
      <label>Open-seat signal from<input type="number" min={1} max={30} value={settings.openSeatsThreshold} onChange={e=>setSettings({...settings,openSeatsThreshold:Number(e.target.value)})}/></label>
     </div>
     <div className="sad-settings-card sad-booking-settings"><h3>Public booking page</h3><p>The studio gets its own customer-facing booking link. Logo, studio name and brand color come from these settings; member payments stay outside StudioTasker.</p><label>Studio Privacy Policy URL<input type="url" maxLength={500} value={settings.privacyPolicyUrl} onChange={e=>setSettings({...settings,privacyPolicyUrl:e.target.value})}/><small>Shown in the booking privacy notice.</small></label>
      <div className="sad-booking-mini" style={{borderColor:settings.accentColor}}><div>{logoUrl?<img src={logoUrl} alt="Booking page logo"/>:<span style={{background:settings.accentColor}}>{settings.name.slice(0,1).toUpperCase()}</span>}<b>{settings.name}</b></div><small>{settings.focus}</small><strong style={{color:settings.accentColor}}>Book a {singular(settings.classTerm).toLowerCase()}</strong></div>
      <Link className="sad-preview-link" href="/book/preview">Open self-service booking preview <ArrowRight size={16}/></Link>
     </div>
     <div className="sad-settings-card"><h3>Internal class packages</h3><p>Operational entitlement templates only. StudioTasker does not price or collect member payments.</p>
      <div className="sad-package-row"><div><b>Starter Pack</b><small>5 {settings.classTerm.toLowerCase()} · 30 days</small></div><span>AVAILABLE</span></div>
      <div className="sad-package-row"><div><b>Studio Ten</b><small>10 {settings.classTerm.toLowerCase()} · 60 days</small></div><span>AVAILABLE</span></div>
     </div>
     <div className="sad-demo-limit-card"><ShieldCheck size={18}/><div><b>DEMO LIMITS</b><span>Customization saves: {customizationSaves}/5 · Logo uploads: {logoUploads}/2 · CRUD additions: max {DEMO_ADD_LIMIT} per section.</span><small>Demo data is temporary to this browser tab. Resetting data does not restart the 60-minute session.</small></div></div>
     <button className="sad-settings-save" type="submit" disabled={customizationSaves>=5}>{customizationSaves>=5?"Demo customization limit reached":"Save demo customization"}</button>
     <div className="sad-settings-card sad-boundary"><h3>What the customer can customize</h3><ul><li>Studio name, type and timezone</li><li>Logo and primary brand color</li><li>Member / client terminology</li><li>Class / session terminology</li><li>Credit / visit terminology</li><li>Public booking page identity</li><li>Landing page, week start and time format</li><li>Class defaults and Today signal rules</li><li>No member payment processing or card storage</li></ul></div>
    </form>
   </section>}
  </section>
 </main>;
}
function ViewHead({eyebrow,title,text}:{eyebrow:string;title:string;text:string}){return <div className="sad-view-head"><span className="sad-kicker">{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>}
function DemoToolbar({label,count,open,onToggle}:{label:string;count:number;open:boolean;onToggle:()=>void}){return <div className="sad-demo-toolbar"><button type="button" onClick={onToggle}>{open?<X size={16}/>:<Plus size={16}/>} {open?"Close":label}</button><span>DEMO LIMIT · {count}/{DEMO_ADD_LIMIT} NEW RECORDS</span></div>}
function OwnerToday({signals,activity,settings,onAction}:{signals:Signal[];activity:string[];settings:StudioSettings;onAction:(s:Signal,k:"contacted"|"task"|"tomorrow")=>void}){
 return <section className="sad-view"><ViewHead eyebrow="STUDIOTASKER TODAY" title="What needs attention." text="A daily operating view with reasons and next actions."/>
  <div className="sad-owner-stats"><article><small>CLASSES TODAY</small><strong>6</strong><span>07:30 → 19:30</span></article><article><small>BOOKINGS</small><strong>42</strong><span>across today</span></article><article><small>OCCUPANCY</small><strong>83%</strong><span>42 / 51 places</span></article><article><small>WAITLISTED</small><strong>2</strong><span>roster monitored</span></article></div>
  <div className="sad-rescue"><div><span className="sad-kicker">FOLLOW-UP OPPORTUNITIES</span><h3>{signals.length} opportunities to review</h3><p>Operational follow-up signals only. StudioTasker does not process member payments.</p></div><div className="sad-rescue-badges"><span><b>{signals.filter(x=>x.kind==="trial").length}</b> trials</span><span><b>{signals.filter(x=>x.kind==="renewal").length}</b> renewals</span><span><b>{signals.filter(x=>x.kind==="inactive").length}</b> inactive</span><span><b>{signals.filter(x=>x.kind==="package").length}</b> package review</span><span><b>{signals.filter(x=>x.kind==="seat").length}</b> open class</span></div></div>
  <div className="sad-signals">{signals.length?signals.map(s=><article key={s.id} className={s.kind}><div><div className="sad-signal-meta"><span className={s.priority}>{pLabel(s.priority)}</span><small>{s.kind}</small></div><h3>{s.title}</h3><p>{s.reason}</p><small>Suggested: <b>{s.next}</b></small></div><div className="sad-signal-buttons">{s.kind!=="seat"&&<button onClick={()=>onAction(s,"contacted")}><Check size={17}/> Mark contacted</button>}<button onClick={()=>onAction(s,"task")}>{s.kind==="seat"?"Review class":"Make task"}</button><button onClick={()=>onAction(s,"tomorrow")}>Tomorrow</button></div></article>):<div className="sad-empty"><CheckCircle2 size={30}/><b>You&apos;re clear for now.</b><span>Reset the demo to restore the sample signals.</span></div>}</div>
  <div className="sad-rule-strip"><b>YOUR DEMO RULES</b><span>Inactive {settings.inactiveDays}d</span><span>Low {settings.creditTerm.toLowerCase()} ≤ {settings.lowCreditsThreshold}</span><span>Renewal {settings.renewalWindowDays}d</span><span>Trial {settings.trialFollowupHours}h</span><span>Package {settings.packageReviewHours}h</span><span>Open seats {settings.openSeatsThreshold}+</span></div>
  {activity.length>0&&<div className="sad-activity"><span className="sad-kicker">RECENT DEMO ACTIONS</span>{activity.map((a,i)=><p key={i}>{a}</p>)}</div>}
 </section>;
}
function DemoClasses({items,onRemove}:{items:DemoClass[];onRemove:(id:string)=>void}){return <div className="sad-class-grid">{items.map(c=><article key={c.id}><small>{c.time}</small><h3>{c.title}</h3><p>{c.coach} · {c.room} · {c.duration} min</p><div><span style={{width:(c.booked/c.capacity*100)+"%"}}/></div><b>{c.booked}/{c.capacity} booked</b><em>{Math.max(0,c.capacity-c.booked)} places left</em>{isCreated(c.id)&&<small className="sad-demo-created">ADDED IN DEMO</small>}<button type="button" className="sad-card-remove" aria-label={"Remove "+c.title} onClick={()=>onRemove(c.id)}><Trash2 size={15}/> Remove</button></article>)}</div>}
