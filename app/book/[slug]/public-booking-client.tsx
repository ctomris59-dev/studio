"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowRight,CalendarDays,CheckCircle2,ShieldCheck,Users} from "lucide-react";
import {StudioTaskerMark} from "../../../components/studio-tasker-mark";

type Studio={name:string;focus:string;timezone:string;slug:string;selfSignupEnabled:boolean};
type ClassRow={id:string;title:string;instructor:string;room:string;starts_at:string;duration_minutes:number;capacity:number;booked_count:number;waitlist_count:number};
type Pack={id:string;name:string;description:string;price_cents:number;currency:string;credits:number;valid_days:number};
type Data={studio:Studio;classes:ClassRow[];packages:Pack[]};
const previewData:Data={studio:{name:"Willow Studio",focus:"Pilates · Yoga · Barre",timezone:"Europe/London",slug:"preview",selfSignupEnabled:true},
 classes:[
  {id:"preview-morning",title:"Morning Flow",instructor:"Sophie M.",room:"Studio One",starts_at:new Date(Date.now()+86400000).toISOString(),duration_minutes:50,capacity:8,booked_count:6,waitlist_count:0},
  {id:"preview-barre",title:"Barre Foundations",instructor:"Olivia K.",room:"Studio Two",starts_at:new Date(Date.now()+2*86400000).toISOString(),duration_minutes:50,capacity:10,booked_count:7,waitlist_count:0},
  {id:"preview-reset",title:"Evening Reset",instructor:"Sophie M.",room:"Studio One",starts_at:new Date(Date.now()+3*86400000).toISOString(),duration_minutes:60,capacity:8,booked_count:8,waitlist_count:2}
 ],packages:[
  {id:"p1",name:"Starter Pack",description:"A flexible start.",price_cents:7500,currency:"usd",credits:5,valid_days:30},
  {id:"p2",name:"Studio Ten",description:"Build a weekly routine.",price_cents:13500,currency:"usd",credits:10,valid_days:60}
 ]};
export function PublicBookingClient({slug}:{slug:string}){
 const preview=slug==="preview";
 const [data,setData]=useState<Data|null>(preview?previewData:null),[loading,setLoading]=useState(!preview),[error,setError]=useState("");
 const [selected,setSelected]=useState(""),[note,setNote]=useState("");
 const [form,setForm]=useState({name:"",email:"",phone:"",termsAccepted:false,marketingConsent:false});
 useEffect(()=>{if(preview)return;void fetch("/api/public/studios/"+encodeURIComponent(slug),{cache:"no-store"})
  .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Booking page unavailable.");setData(j)})
  .catch(e=>setError(e instanceof Error?e.message:"Booking page unavailable.")).finally(()=>setLoading(false))},[slug,preview]);
 const selectedClass=useMemo(()=>data?.classes.find(x=>x.id===selected),[data,selected]);
 function choose(id:string){setSelected(id);window.sessionStorage.setItem("studiotasker:selected-class",id);document.getElementById("join-studio")?.scrollIntoView({behavior:"smooth"});}
 async function register(e:FormEvent){e.preventDefault();setNote("");
  if(preview){setNote("Preview only: in the live product, StudioTasker emails a one-time account setup link. No account was created.");return}
  try{
   const r=await fetch("/api/public/studios/"+encodeURIComponent(slug)+"/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Registration failed.");setNote(j.notice||"Check your email.");
  }catch(e){setNote(e instanceof Error?e.message:"Registration failed.")}
 }
 if(loading)return <main className="stb-shell"><p>Loading studio schedule…</p></main>;
 if(error||!data)return <main className="stb-shell"><div className="stb-error"><StudioTaskerMark/><h1>Booking page unavailable</h1><p>{error}</p><Link href="/">StudioTasker home</Link></div></main>;
 const format=(value:string)=>new Date(value).toLocaleString("en-GB",{timeZone:data.studio.timezone,weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
 return <main className="stb-shell">
  <header className="stb-top"><Link href="/" className="stb-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><Link href="/workspace">Member sign in ↗</Link></header>
  {preview&&<div className="stb-preview"><ShieldCheck size={17}/><b>Preview only.</b> This page uses fictional classes and does not create accounts or take payments.</div>}
  <section className="stb-hero"><div><small>BOOK DIRECT WITH THE STUDIO</small><h1>{data.studio.name}</h1><p>{data.studio.focus} · Times shown in {data.studio.timezone}</p></div><span>Powered by StudioTasker</span></section>
  <section className="stb-layout">
   <div className="stb-main"><div className="stb-section-title"><CalendarDays/><div><h2>Choose your class</h2><p>Select a class first. Your choice stays with you when you create or sign in to your member account.</p></div></div>
    <div className="stb-classes">{data.classes.length?data.classes.map(c=>{const left=Math.max(0,c.capacity-c.booked_count);return <article className={selected===c.id?"selected":""} key={c.id}>
     <div><small>{format(c.starts_at)}</small><h3>{c.title}</h3><p>{c.instructor} · {c.room} · {c.duration_minutes} min</p></div>
     <div className="stb-class-meta"><b>{left>0?left+" spots left":"Waitlist"}</b><span>{c.booked_count}/{c.capacity} booked{c.waitlist_count?" · "+c.waitlist_count+" waiting":""}</span>
      <button type="button" onClick={()=>choose(c.id)}>{selected===c.id?<><CheckCircle2 size={15}/> Selected</>:<>Choose <ArrowRight size={15}/></>}</button></div>
    </article>}):<p>No upcoming classes are published.</p>}</div>
    <div className="stb-section-title stb-packs-title"><Users/><div><h2>Studio class packs</h2><p>Prices are set by {data.studio.name}. Pack purchase happens after secure member sign-in.</p></div></div>
    <div className="stb-packs">{data.packages.map(p=><article key={p.id}><small>{p.credits} classes · {p.valid_days} days</small><h3>{p.name}</h3><p>{p.description}</p><b>{new Intl.NumberFormat("en-US",{style:"currency",currency:p.currency.toUpperCase()}).format(p.price_cents/100)}</b></article>)}</div>
   </div>
   <aside id="join-studio" className="stb-join"><span>YOUR NEXT STEP</span><h2>{selectedClass?"Keep "+selectedClass.title+" selected":"Choose a class to begin"}</h2>
    {selectedClass&&<p className="stb-picked">{format(selectedClass.starts_at)} · {selectedClass.instructor}</p>}
    <Link href="/workspace" className="stb-signin">Already a member? Sign in <ArrowRight size={15}/></Link>
    {data.studio.selfSignupEnabled?<form onSubmit={register}><h3>New to this studio?</h3><p>Create a member account. We verify your email before you can book.</p>
     <label>Name<input required minLength={2} maxLength={80} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
     <label>Email<input required type="email" maxLength={160} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
     <label>Phone (optional)<input type="tel" maxLength={30} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
     <label className="stb-check"><input type="checkbox" required checked={form.termsAccepted} onChange={e=>setForm({...form,termsAccepted:e.target.checked})}/> I agree to create a member account and to the studio's booking terms.</label>
     <label className="stb-check"><input type="checkbox" checked={form.marketingConsent} onChange={e=>setForm({...form,marketingConsent:e.target.checked})}/> Optional: I agree to receive studio marketing emails.</label>
     <button type="submit" disabled={!selected}>Email my secure setup link</button>
     {!selected&&<small>Choose a class above first so StudioTasker can preserve your selection.</small>}
    </form>:<p>Online self-registration is not enabled. Contact the studio or sign in with an existing account.</p>}
    {note&&<p role="status" className="stb-note">{note}</p>}
   </aside>
  </section>
  <footer className="stb-footer"><span>StudioTasker · Less admin. More movement.</span><span>Class-pack prices belong to the studio. StudioTasker software pricing is separate.</span></footer>
 </main>;
}
