"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {ArrowRight,BarChart3,CalendarDays,Check,Clock3,RotateCcw,ShieldCheck,Users} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "./today.css";

type Priority="high"|"medium"|"low";
type Kind="trial"|"renewal"|"inactive"|"package"|"seat";
type Item={id:string;kind:Kind;priority:Priority;title:string;reason:string;action:string;value?:string};

const initial:Item[]=[
 {id:"trial-mia",kind:"trial",priority:"high",title:"Mia Carter · trial follow-up",reason:"Trial class attended 22 hours ago. No membership or package purchase followed.",action:"Ask whether Mia wants to join"},
 {id:"renew-oliver",kind:"renewal",priority:"high",title:"Oliver James · renewal opportunity",reason:"1 class credit remaining. Package expires in 3 days.",action:"Offer a renewal"},
 {id:"inactive-emma",kind:"inactive",priority:"medium",title:"Emma Wilson · member may be drifting",reason:"No recorded attendance for 24 days. Membership is still active.",action:"Check in with Emma"},
 {id:"package-ava",kind:"package",priority:"medium",title:"Ava Reed · package status needs review",reason:"No class package has been confirmed for Ava for 2 days.",action:"Review Ava's package status"},
 {id:"seat-barre",kind:"seat",priority:"low",title:"18:30 Barre Foundations · open places",reason:"3 of 8 places are still open for tomorrow evening.",action:"Review the class and eligible members"}
];
const names:Record<Kind,string>={trial:"Trial rescue",renewal:"Renewal",inactive:"Member rescue",package:"Package review",seat:"Seat rescue"};

export default function TodayPreview(){
 const [items,setItems]=useState(initial);
 const [history,setHistory]=useState<string[]>([]);
 const [filter,setFilter]=useState<"all"|Kind>("all");
 const shown=filter==="all"?items:items.filter(x=>x.kind===filter);
 const counts=useMemo(()=>({
  trials:items.filter(x=>x.kind==="trial").length,
  renewals:items.filter(x=>x.kind==="renewal").length,
  inactive:items.filter(x=>x.kind==="inactive").length,
  package:items.filter(x=>x.kind==="package").length,
  seats:items.filter(x=>x.kind==="seat").length
 }),[items]);
 function act(item:Item,action:"contacted"|"task"|"tomorrow"){
  const label=action==="contacted"?"Contact recorded":action==="task"?"Follow-up task created":"Hidden until tomorrow";
  setHistory(h=>[label+" · "+item.title,...h].slice(0,6));
  setItems(list=>list.filter(x=>x.id!==item.id));
 }
 function reset(){setItems(initial);setHistory([]);setFilter("all")}
 return <main className="std">
  <header className="std-top">
   <Link href="/" className="std-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <nav><Link href="/app-demo">Owner app demo</Link><Link href="/app-demo">Owner app demo</Link><Link href="/">Website ↗</Link></nav>
  </header>
  <section className="std-hero">
   <div><span className="std-kicker">STUDIOTASKER TODAY / INTERACTIVE PREVIEW</span>
    <h1>Know what your<br/><em>studio needs today.</em></h1>
    <p>Your team keeps the studio records current. StudioTasker watches those operational signals and brings the next actions into one clear daily view.</p>
    <div className="std-preview-note"><ShieldCheck size={17}/><span><b>Fictional preview.</b> No customer data, messages or payments are used. Buttons below only change this browser demonstration.</span></div>
   </div>
   <aside><small>TODAY / WEDNESDAY</small><strong>{String(items.length).padStart(2,"0")}</strong><span>things still need attention</span><button onClick={reset}><RotateCcw size={15}/> Reset preview</button></aside>
  </section>

  <section className="std-board">
   <div className="std-board-head"><div><span>WILLOW STUDIO</span><h2>Good morning, Sophie.</h2><p>Here&apos;s what deserves attention before the day gets busy.</p></div><span className="std-sync">RULE-BASED · EXPLAINABLE · HUMAN CONTROLLED</span></div>
   <div className="std-today-stats">
    <article><CalendarDays/><small>CLASSES TODAY</small><strong>6</strong><span>07:30 → 19:30</span></article>
    <article><Users/><small>BOOKINGS</small><strong>42</strong><span>across today&apos;s classes</span></article>
    <article><BarChart3/><small>OCCUPANCY</small><strong>83%</strong><span>42 / 51 available places</span></article>
    <article><Clock3/><small>WAITLISTED</small><strong>2</strong><span>promotion rules monitored</span></article>
   </div>

   <section className="std-rescue" aria-labelledby="revenue-rescue">
    <div className="std-rescue-head"><div><span>FOLLOW-UP OPPORTUNITIES</span><h2 id="revenue-rescue">{items.length} opportunities to review</h2></div>
     <p>Operational signals only. Studio staff decide whether and how to follow up.</p></div>
    <div className="std-rescue-cards">
     <button onClick={()=>setFilter(filter==="trial"?"all":"trial")} className={filter==="trial"?"active":""}><b>{counts.trials}</b><span>Trial follow-ups</span></button>
     <button onClick={()=>setFilter(filter==="renewal"?"all":"renewal")} className={filter==="renewal"?"active":""}><b>{counts.renewals}</b><span>Renewals</span></button>
     <button onClick={()=>setFilter(filter==="inactive"?"all":"inactive")} className={filter==="inactive"?"active":""}><b>{counts.inactive}</b><span>Inactive members</span></button>
     <button onClick={()=>setFilter(filter==="package"?"all":"package")} className={filter==="package"?"active":""}><b>{counts.package}</b><span>Package reviews</span></button>
     <button onClick={()=>setFilter(filter==="seat"?"all":"seat")} className={filter==="seat"?"active":""}><b>{counts.seats}</b><span>Underfilled classes</span></button>
    </div>
    
   </section>

   <section className="std-actions">
    <div className="std-actions-head"><div><span>NEXT ACTIONS</span><h2>{filter==="all"?"What needs attention":names[filter]}</h2></div>{filter!=="all"&&<button onClick={()=>setFilter("all")}>Show everything</button>}</div>
    <div className="std-action-list">
     {shown.length?shown.map(item=><article key={item.id} className={"std-action "+item.kind}>
      <div className="std-action-copy"><div><span className={"std-priority "+item.priority}>{item.priority}</span><small>{names[item.kind]}</small></div>
       <h3>{item.title}</h3><p>{item.reason}</p><span>Suggested next step: <b>{item.action}</b></span>{item.value&&<em>{item.value}</em>}</div>
      <div className="std-buttons">{item.kind!=="seat"&&<button onClick={()=>act(item,"contacted")}><Check size={15}/> Mark contacted</button>}
       {item.kind!=="seat"&&<button onClick={()=>act(item,"task")}>Make task</button>}
       {item.kind==="seat"&&<button onClick={()=>act(item,"task")}>Review class</button>}
       <button onClick={()=>act(item,"tomorrow")}>Tomorrow</button></div>
     </article>):<div className="std-clear"><Check size={31}/><h3>{filter==="all"?"You&apos;re clear for now.":"No items in this category."}</h3><p>As studio-entered bookings, visits, trials, credits and package status change, StudioTasker Today recalculates what deserves attention.</p></div>}
    </div>
   </section>

   <aside className="std-history"><div><span>WHAT JUST HAPPENED</span><h3>Human action, recorded.</h3></div>
    <div>{history.length?history.map((x,i)=><p key={i}>{x}</p>):<p>Try an action above. StudioTasker will remove the signal from this preview and show the recorded outcome here.</p>}</div></aside>
  </section>

  <section className="std-principles"><div><span>WHY THIS IS DIFFERENT</span><h2>Not another dashboard<br/>you have to interpret.</h2></div>
   <div>{[
    ["01","Explain the reason","Every alert says why it appeared."],
    ["02","Give the next action","Turn a signal into a contact, task or review."],
    ["03","Avoid alert noise","Related renewal signals are de-duplicated and actions can be snoozed."],
    ["04","Keep humans in control","No automatic marketing blast and no paid AI dependency."],
    ["05","Stay out of payments","StudioTasker tracks studio operations; member payment collection stays with the studio."]
   ].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><p>{x[2]}</p></article>)}</div>
  </section>
  <footer className="std-footer"><div><StudioTaskerMark/><span><b>StudioTasker</b><small>Less admin. More movement.</small></span></div><Link href="/book/preview">Next: try the self-service booking experience <ArrowRight size={17}/></Link></footer>
 </main>;
}
