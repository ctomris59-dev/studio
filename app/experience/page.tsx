"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowRight,CalendarDays,Check,CheckCircle2,RotateCcw,ShieldCheck,Ticket,Users,WalletCards} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "./experience.css";
type Step=1|2|3|4|5;
type Session={id:string;name:string;time:string;coach:string;room:string;capacity:number;booked:number;kind:string};
type Pack={id:string;title:string;classes:number;price:number;days:number;detail:string};
const sessions:Session[]=[
 {id:"morn",name:"Morning Flow",time:"MON · 07:30",coach:"Sophie M.",room:"Studio One",capacity:8,booked:6,kind:"Yoga & Pilates"},
 {id:"barre",name:"Barre Foundations",time:"TUE · 09:00",coach:"Olivia K.",room:"Studio Two",capacity:10,booked:7,kind:"Barre"},
 {id:"sculpt",name:"Midday Sculpt",time:"WED · 12:30",coach:"Ava R.",room:"Studio One",capacity:8,booked:5,kind:"Strength"},
 {id:"reset",name:"Evening Reset",time:"THU · 17:30",coach:"Sophie M.",room:"Studio One",capacity:8,booked:6,kind:"Yoga"}
];
const packs:Pack[]=[
 {id:"starter",title:"Starter Pack",classes:5,price:75,days:30,detail:"A flexible start to your practice."},
 {id:"regular",title:"Studio Ten",classes:10,price:135,days:60,detail:"Make movement part of your weekly routine."},
 {id:"routine",title:"Studio Twenty",classes:20,price:240,days:90,detail:"More visits, more momentum."}
];
const titles=["","Choose your class","Find your class pack","Reserve your place","Check in & enjoy","Ready for your next pack"];
const captions=["","Browse an independent studio's live-style class schedule.","Purchase a studio-specific package to unlock class credits.","Secure a place and see your credit update immediately.","See how a class visit becomes part of your member history.","Renew your package and keep the studio journey going."];
const steps=[{n:"01",label:"Choose"},{n:"02",label:"Purchase"},{n:"03",label:"Reserve"},{n:"04",label:"Attend"},{n:"05",label:"Renew"}];
function dollar(n:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)}
export default function Experience(){
 const [step,setStep]=useState<Step>(1);
 const [picked,setPicked]=useState("morn"),[pack,setPack]=useState("regular");
 const [credits,setCredits]=useState(0),[validity,setValidity]=useState(0);
 const [hasPaid,setHasPaid]=useState(false),[booked,setBooked]=useState(false),[attended,setAttended]=useState(false),[renewed,setRenewed]=useState(false);
 const selected=sessions.find(x=>x.id===picked)!;
 const activePack=packs.find(x=>x.id===pack)!;
 const progress=(step/5)*100;
 function buy(){
  if(!hasPaid){setCredits(activePack.classes);setValidity(activePack.days);setHasPaid(true);setStep(3)}
  else{setCredits(x=>x+activePack.classes);setValidity(x=>x+activePack.days);setRenewed(true);setStep(5)}
 }
 function restart(){setStep(1);setPicked("morn");setPack("regular");setCredits(0);setValidity(0);setHasPaid(false);setBooked(false);setAttended(false);setRenewed(false)}
 return <main className="stx">
  <div className="stx-corner-circle" aria-hidden="true"/>
  <header className="stx-header">
   <Link href="/" className="stx-logo"><StudioTaskerMark/><span>studio<strong>tasker</strong>.</span></Link>
   <div className="stx-header-links"><Link href="/demo">Studio CRM demo <ArrowRight size={15}/></Link><Link href="/">Back to website ↗</Link></div>
  </header>
  <section className="stx-intro">
   <div><span className="stx-kicker">INTERACTIVE PRODUCT TOUR / 01—05</span>
    <h1>From first class.<br/><em>To the next one.</em></h1>
    <p>Experience the complete member journey — choosing a class, purchasing a pack, reserving a spot, checking in and renewing, all in one connected flow.</p>
    <div className="stx-demo-alert"><ShieldCheck size={18}/><span><strong>Interactive simulation.</strong> Fictional studio, members, prices and check-ins. No account required. No payments collected.</span></div>
   </div>
   <div className="stx-intro-label"><span>WILLOW STUDIO</span><b>LESS ADMIN.<br/>MORE MOVEMENT.</b><small>POWERED BY STUDIOTASKER</small></div>
  </section>
  <section className="stx-board">
   <div className="stx-board-head"><div className="stx-studio-brand"><span className="stx-studio-emblem">≈</span><div><strong>Willow Studio</strong><small>THE SPACE IS YOURS</small></div></div>
    <div className="stx-member-label"><Users size={16}/><span>Member: Alex Morgan <small>Sample account</small></span></div></div>
   <div className="stx-journey">
    <div className="stx-journey-header"><span>YOUR MEMBER JOURNEY</span><span>{String(step).padStart(2,"0")} / 05</span></div>
    <div className="stx-journey-progress"><div style={{width:progress+"%"}}/></div>
    <nav aria-label="Experience steps" className="stx-stepper">{steps.map((s,i)=><button key={s.n} onClick={()=>{if(i+1<=step)setStep((i+1) as Step)}} aria-current={step===i+1?"step":undefined} disabled={i+1>step} className={i+1===step?"current":i+1<step?"complete":""}>
      <span>{i+1<step?<Check size={14}/>:s.n}</span><b>{s.label}</b>
     </button>)}</nav>
   </div>
   <div className="stx-work-area">
    <div className="stx-work-main">
     <span className="stx-eyebrow">STEP {String(step).padStart(2,"0")} / THE STUDIO JOURNEY</span>
     <h2>{titles[step]}</h2>
     <p className="stx-sub">{captions[step]}</p>
     {step===1&&<div className="stx-class-grid">
      {sessions.map(c=><button type="button" key={c.id} onClick={()=>setPicked(c.id)} className={"stx-class-card"+(picked===c.id?" chosen":"")}>
       <span className="stx-class-time">{c.time}</span><b>{c.name}</b><small>{c.coach} · {c.room}</small>
       <div className="stx-class-meter"><i style={{width:(100*c.booked/c.capacity)+"%"}}/></div>
       <span className="stx-class-spots">{c.booked}/{c.capacity} places booked</span>
       <span className="stx-selected">{picked===c.id?<><CheckCircle2 size={15}/> Selected</>:"Select class ↗"}</span>
      </button>)}
     </div>}
     {step===2&&<div className="stx-pack-grid">{packs.map(p=><button type="button" key={p.id} className={"stx-pack"+(pack===p.id?" chosen":"")} onClick={()=>setPack(p.id)}>
       <span className="stx-pack-amount">{dollar(p.price)}</span><b>{p.title}</b><span className="stx-pack-meta">{p.classes} class credits · {p.days} days</span><small>{p.detail}</small>
       <span className="stx-pack-select">{pack===p.id?"Selected ✓":"Choose pack"}</span>
      </button>)}</div>}
     {step===3&&<div className="stx-confirmation">
      <Ticket size={30}/><h3>Your class pack is active.</h3><p>Payment was simulated successfully. Your new class credits are available for booking.</p>
      <div><span>Class to book</span><strong>{selected.name} · {selected.time}</strong></div>
      <div><span>Available credits</span><strong>{credits} visits</strong></div>
     </div>}
     {step===4&&<div className="stx-confirmation">
      <CalendarDays size={30}/><h3>Your place is reserved.</h3><p>The studio calendar has your booking. After the real class, studio staff record attendance against this reservation.</p>
      <div><span>Upcoming reservation</span><strong>{selected.name} · {selected.time}</strong></div>
      <div><span>Credits after booking</span><strong>{credits} left</strong></div>
      <div className="stx-demo-explanation">For this demo, continue immediately to simulate studio staff checking in the member. The real app checks attendance timing.</div>
     </div>}
     {step===5&&<div className="stx-confirmation">
      <CheckCircle2 size={30}/><h3>{renewed?"Pack renewed. You're ready.":"Attendance recorded."}</h3>
      <p>{renewed?"Your studio package has renewed; remaining credits and new credits now appear together.":"Your visit is logged in your studio record. Need more visits? Add another pack below."}</p>
      <div><span>Completed visits</span><strong>{attended?1:0}</strong></div>
      <div><span>Remaining credits</span><strong>{credits}</strong></div>
      <div><span>Remaining package validity (demo)</span><strong>{validity} days</strong></div>
      <div className="stx-renew-cta"><span>Renew a class pack</span><div>{packs.map(x=><button key={x.id} className={pack===x.id?"active":""} onClick={()=>setPack(x.id)}>{x.classes} classes · {dollar(x.price)}</button>)}</div></div>
     </div>}
     <div className="stx-actions">
      <span className="stx-step-hint">{step===2?"Studio-specific package price. Never the StudioTasker SaaS fee.":step===5?"Credits are added to your current balance on renewal.":"Your studio stays in sync as each step completes."}</span>
      {step===1&&<button className="stx-action" onClick={()=>setStep(2)}>Choose this class <ArrowRight size={17}/></button>}
      {step===2&&<button className="stx-action" onClick={buy}>Simulate secure purchase <WalletCards size={17}/></button>}
      {step===3&&<button className="stx-action" onClick={()=>{if(credits>0){setCredits(x=>x-1);setBooked(true);setStep(4)}}}>Reserve my place <ArrowRight size={17}/></button>}
      {step===4&&<button className="stx-action" onClick={()=>{setAttended(true);setStep(5)}}>Simulate studio check-in <Check size={17}/></button>}
      {step===5&&<button className="stx-action" onClick={buy}>Simulate pack renewal <RotateCcw size={17}/></button>}
     </div>
    </div>
    <aside className="stx-sidebar">
     <span className="stx-sidebar-label">YOUR STUDIO, IN SYNC.</span>
     <div className="stx-side-stat"><small>MY CLASS CREDITS</small><strong>{String(credits).padStart(2,"0")}</strong><span>remaining visits</span></div>
     <div className="stx-side-stat"><small>RESERVATION</small><strong className="stx-side-word">{booked?"CONFIRMED":"—"}</strong><span>{booked?selected.name:"Choose a class to begin"}</span></div>
     <div className="stx-side-stat"><small>MY ATTENDANCE</small><strong>{attended?"01":"00"}</strong><span>completed visits</span></div>
     <div className="stx-sidebar-foot"><span>STUDIOTASKER</span><p>One place for every booking, membership and next step.</p>
      <button onClick={restart}><RotateCcw size={15}/> Restart walkthrough</button></div>
    </aside>
   </div>
  </section>
  <footer className="stx-footer"><div><b>StudioTasker — $49/month per studio</b><span>This is the proposed SaaS price. Class-pack amounts in this walkthrough are fictional.</span></div><Link href="/demo">Explore the CRM dashboard <ArrowRight size={16}/></Link></footer>
 </main>;
}
