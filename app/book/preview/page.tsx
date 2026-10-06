"use client";
import Link from "next/link";
import {useEffect,useMemo,useState,type CSSProperties,type FormEvent} from "react";
import {ArrowLeft,ArrowRight,CalendarDays,Check,CheckCircle2,Clock3,ShieldCheck,UserRound} from "lucide-react";
import {StudioTaskerMark} from "../../../components/studio-tasker-mark";
import "./booking-preview.css";

type DemoClass={id:string;day:string;date:string;time:string;title:string;coach:string;duration:string;spots:number;capacity:number};
type Stage="choose"|"details"|"confirmed";
type BookingBrand={name:string;focus:string;accentColor:string;memberTerm:string;classTerm:string;creditTerm:string;privacyPolicyUrl:string};
const defaultBrand:BookingBrand={name:"Willow Studio",focus:"Pilates · Yoga · Barre",accentColor:"#334BDD",memberTerm:"Members",classTerm:"Classes",creditTerm:"Credits",privacyPolicyUrl:"https://willow.example/privacy"};
const singular=(term:string)=>term.endsWith("ies")?term.slice(0,-3)+"y":term.endsWith("sses")?term.slice(0,-2):term.endsWith("s")?term.slice(0,-1):term;

const classes:DemoClass[]=[
 {id:"c1",day:"WED",date:"07 OCT",time:"07:30",title:"Morning Flow",coach:"Sophie M.",duration:"50 min",spots:2,capacity:8},
 {id:"c2",day:"WED",date:"07 OCT",time:"12:30",title:"Midday Sculpt",coach:"Ava R.",duration:"50 min",spots:3,capacity:8},
 {id:"c3",day:"THU",date:"08 OCT",time:"09:00",title:"Reformer Foundations",coach:"Olivia K.",duration:"50 min",spots:1,capacity:8},
 {id:"c4",day:"THU",date:"08 OCT",time:"17:30",title:"Evening Reset",coach:"Sophie M.",duration:"50 min",spots:4,capacity:8},
 {id:"c5",day:"FRI",date:"09 OCT",time:"08:00",title:"Barre Foundations",coach:"Olivia K.",duration:"45 min",spots:5,capacity:10},
 {id:"c6",day:"FRI",date:"09 OCT",time:"18:00",title:"Friday Unwind",coach:"Ava R.",duration:"50 min",spots:2,capacity:8},
];

export default function BookingPreview(){
 const [selectedDay,setSelectedDay]=useState("WED 07 OCT");
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [stage,setStage]=useState<Stage>("choose");
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [credits,setCredits]=useState(4);
 const [brand,setBrand]=useState<BookingBrand>(defaultBrand),[logoUrl,setLogoUrl]=useState<string|null>(null),[demoBookings,setDemoBookings]=useState(0);
 useEffect(()=>{try{const saved=sessionStorage.getItem("studiotasker-demo-settings");if(saved)setBrand({...defaultBrand,...JSON.parse(saved)});const logo=sessionStorage.getItem("studiotasker-demo-logo");if(logo)setLogoUrl(logo);const booked=Number(sessionStorage.getItem("studiotasker-booking-demo-count")||"0");const left=Number(sessionStorage.getItem("studiotasker-booking-demo-credits")||"4");setDemoBookings(Number.isFinite(booked)?Math.max(0,Math.min(3,booked)):0);setCredits(Number.isFinite(left)?Math.max(0,Math.min(4,left)):4)}catch{}},[]);
 const selected=classes.find(x=>x.id===selectedId)??null;
 const visible=useMemo(()=>classes.filter(x=>(x.day+" "+x.date)===selectedDay),[selectedDay]);

 function continueToDetails(){
  if(!selected)return;
  setStage("details");
 }
 function confirm(e:FormEvent){
  e.preventDefault();
  if(!selected||name.trim().length<2||!email.includes("@")||credits<1||demoBookings>=3)return;
  const nextCredits=credits-1,nextBookings=demoBookings+1;setCredits(nextCredits);setDemoBookings(nextBookings);try{sessionStorage.setItem("studiotasker-booking-demo-count",String(nextBookings));sessionStorage.setItem("studiotasker-booking-demo-credits",String(nextCredits))}catch{}setStage("confirmed");
 }
 function reset(){
  setSelectedId(null);setStage("choose");setName("");setEmail("");
 }
 const pageStyle={"--sbp-accent":brand.accentColor} as CSSProperties;
 return <main className="sbp-page" style={pageStyle}>
  <header className="sbp-top">
   <Link href="/" className="sbp-product"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <div className="sbp-demo-pill"><ShieldCheck size={15}/> SAMPLE BOOKING DEMO · NO PAYMENT</div>
   <Link href="/app-demo" className="sbp-owner-link">Owner app demo <ArrowRight size={15}/></Link>
  </header>

  <section className="sbp-shell">
   <aside className="sbp-studio-card">
    <span className="sbp-kicker">PUBLIC BOOKING PREVIEW</span>
    <div className={"sbp-studio-mark"+(logoUrl?" has-logo":"")}>{logoUrl?<img src={logoUrl} alt={brand.name+" logo"}/>:brand.name.slice(0,1).toUpperCase()}</div>
    <h1>{brand.name}</h1>
    <p>{brand.focus}</p>
    <div className="sbp-rule"/>
    <dl>
     <div><dt>LOCATION</dt><dd>42 Willow Lane · London</dd></div>
     <div><dt>YOUR DEMO {brand.creditTerm.toUpperCase()}</dt><dd><strong>{credits}</strong> {brand.creditTerm.toLowerCase()}</dd></div>
     <div><dt>PAYMENTS</dt><dd>Handled by the studio outside StudioTasker</dd></div>
    </dl>
    <div className="sbp-note"><ShieldCheck size={18}/><span>This is fictional sample data. Nothing here creates a real booking or charge. Demo limit: 3 booking confirmations per browser tab.</span></div>
   </aside>

   <section className="sbp-booking">
    {stage==="choose"&&<>
     <div className="sbp-heading"><span>01 / CHOOSE A {singular(brand.classTerm).toUpperCase()}</span><h2>Book your next<br/><em>{singular(brand.classTerm).toLowerCase()}.</em></h2><p>Select a day, then choose one available {singular(brand.classTerm).toLowerCase()}.</p></div>
     <div className="sbp-days">
      {["WED 07 OCT","THU 08 OCT","FRI 09 OCT"].map((d,i)=><button key={d} className={selectedDay===d?"active":""} onClick={()=>{setSelectedDay(d);setSelectedId(null)}}>
       <small>{["WED","THU","FRI"][i]}</small><strong>{["07","08","09"][i]}</strong><span>OCT</span>
      </button>)}
     </div>
     <div className="sbp-list">
      {visible.map(c=><button key={c.id} className={"sbp-class "+(selectedId===c.id?"selected":"")} onClick={()=>setSelectedId(c.id)}>
       <span className="sbp-time">{c.time}</span>
       <span className="sbp-class-main"><b>{c.title}</b><small>with {c.coach} · {c.duration}</small></span>
       <span className="sbp-spots"><b>{c.spots}</b><small>spots left</small></span>
       <span className="sbp-select">{selectedId===c.id?<Check size={17}/>:<ArrowRight size={17}/>}</span>
      </button>)}
     </div>
     <div className="sbp-action-row"><span>{selected?<><CheckCircle2 size={17}/> {selected.title} selected</>:"Choose one class to continue"}</span><button disabled={!selected} onClick={continueToDetails}>Continue <ArrowRight size={17}/></button></div>
    </>}

    {stage==="details"&&selected&&<>
     <button className="sbp-back" onClick={()=>setStage("choose")}><ArrowLeft size={15}/> Change class</button>
     <div className="sbp-heading"><span>02 / YOUR DETAILS</span><h2>One {singular(brand.creditTerm).toLowerCase()}.<br/><em>That&apos;s it.</em></h2><p>No checkout. This preview simply demonstrates the reservation flow.</p></div>
     <div className="sbp-summary">
      <div><CalendarDays size={20}/><span><small>CLASS</small><b>{selected.title}</b></span></div>
      <div><Clock3 size={20}/><span><small>WHEN</small><b>{selected.day} · {selected.date} · {selected.time}</b></span></div>
      <div><UserRound size={20}/><span><small>COACH</small><b>{selected.coach}</b></span></div>
     </div>
     <form className="sbp-form" onSubmit={confirm}>
      <label>Your name<input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="Jamie Taylor"/></label>
      <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jamie@example.com"/></label>
      <div className="sbp-credit-check"><span><CheckCircle2 size={19}/><span><b>1 {singular(brand.creditTerm).toLowerCase()} will be used</b><small>{credits} demo {brand.creditTerm.toLowerCase()} currently available · {3-demoBookings} demo bookings left</small></span></span><strong>1 {singular(brand.creditTerm).toUpperCase()}</strong></div>
      <button type="submit" disabled={demoBookings>=3||credits<1}>{demoBookings>=3?"Demo booking limit reached":"Confirm demo booking"} <ArrowRight size={18}/></button>
     </form>
     <div className="sbp-privacy-note"><ShieldCheck size={17}/><p><strong>Privacy:</strong> {brand.name} is responsible for the personal information you enter for this booking. StudioTasker processes that information on the studio&apos;s behalf. {brand.privacyPolicyUrl&&<a href={brand.privacyPolicyUrl} target="_blank" rel="noreferrer">Read the studio&apos;s Privacy Policy.</a>}</p></div><p className="sbp-fineprint">No card details are requested. StudioTasker does not process member payments in this flow.</p>
    </>}

    {stage==="confirmed"&&selected&&<div className="sbp-confirmed">
     <span className="sbp-confirm-icon"><Check size={32}/></span>
     <span className="sbp-kicker">DEMO BOOKING CONFIRMED</span>
     <h2>You&apos;re on the list.</h2>
     <p>In a real studio workspace, this reservation would appear in the class roster and reduce the member&apos;s confirmed class-credit balance.</p>
     <div className="sbp-ticket">
      <div><small>{singular(brand.classTerm).toUpperCase()}</small><b>{selected.title}</b></div>
      <div><small>WHEN</small><b>{selected.day} · {selected.date} · {selected.time}</b></div>
      <div><small>{singular(brand.memberTerm).toUpperCase()}</small><b>{name}</b></div>
      <div><small>{brand.creditTerm.toUpperCase()} LEFT</small><b>{credits}</b></div>
     </div>
     <div className="sbp-confirm-actions"><button onClick={reset} disabled={demoBookings>=3||credits<1}>Book another demo {singular(brand.classTerm).toLowerCase()}</button><Link href="/app-demo">See the owner side <ArrowRight size={16}/></Link></div>
    </div>}
   </section>
  </section>
 </main>;
}
