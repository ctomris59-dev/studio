"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check, CheckCheck,
  ChevronDown, ClipboardList, Clock3, CreditCard, Download, FileText, HeartHandshake, LayoutDashboard,
  Mail, Plus, RotateCcw, Search, Send, Settings2, ShieldCheck, Sparkles, Target, UserPlus, Users, X
} from "lucide-react";
import {
  bookMember, cancelBooking, compactDate, convertPercent, creditsFor, dateLabel, day, daysSince, downloadCsv,
  draftFor, focusClasses, focuses, initials, isStudioData, leadStages, makeSeed, opportunities, person, planOptions,
  report, sortedSessions, studioNameByFocus, uid,
  type Lead, type LeadStage, type Member, type Opportunity, type StudioData, type StudioFocus, type Task, type View
} from "../../lib/studio-crm";
import "./crm.css";

type Modal = "lead"|"member"|"class"|"task"|null;
type Draft = {personName:string;email:string;subject:string;body:string;consent:boolean;category:string}|null;
const storageKey="reformdesk-crm-v3";
const navItems:{id:View;name:string;icon:typeof LayoutDashboard}[]=[
  {id:"overview",name:"Overview",icon:LayoutDashboard},{id:"leads",name:"Leads / CRM",icon:Target},
  {id:"members",name:"Members",icon:Users},{id:"schedule",name:"Classes",icon:CalendarDays},
  {id:"followups",name:"Follow-ups",icon:HeartHandshake},{id:"reports",name:"Insights",icon:BarChart3},
  {id:"client",name:"Client booking",icon:CreditCard},{id:"settings",name:"Settings",icon:Settings2}
];
const pageNames:Record<View,{title:string;description:string;eyebrow:string}>={
  overview:{title:"The desk, in focus.",description:"Every useful action, without the noise.",eyebrow:"YOUR STUDIO TODAY"},
  leads:{title:"Make every enquiry count.",description:"From first hello to a member who keeps coming back.",eyebrow:"CRM / CUSTOMER JOURNEY"},
  members:{title:"Your studio people.",description:"Member profiles, attendance, class packs and notes.",eyebrow:"MEMBERS / RELATIONSHIPS"},
  schedule:{title:"Make room for movement.",description:"Classes, capacity, bookings and a fair waitlist.",eyebrow:"CLASSES / RESERVATIONS"},
  followups:{title:"The right message. Right time.",description:"Review suggestions, prepare messages and tick off follow-ups.",eyebrow:"FOLLOW-UPS / WORKFLOW"},
  reports:{title:"Look beyond the numbers.",description:"See where enquiries convert and classes fill up.",eyebrow:"INSIGHTS / REPORTS"},
  client:{title:"Booking, from their side.",description:"Try your member's self-service booking experience.",eyebrow:"CLIENT VIEW / SIMULATION"},
  settings:{title:"Your space, your way.",description:"Choose a studio type and manage this sample workspace.",eyebrow:"DEMO / WORKSPACE"}
};
function safeText(value:string,max=120){return value.trim().slice(0,max);}
function Notice({children}:{children:React.ReactNode}){return <div className="crm-notice"><ShieldCheck size={18}/><span>{children}</span></div>}
function Stat({label,value,sub,icon:Icon}:{label:string;value:string|number;sub:string;icon:typeof Users}) {
  return <div className="stat-card"><div className="stat-card-head"><span>{label}</span><span><Icon size={18}/></span></div><strong>{value}</strong><small>{sub}</small></div>;
}
function StatusTag({value}:{value:string}) {
  const kind=value==="Won"||value==="Active"||value==="Done"||value==="Open"?"positive":value==="Lost"||value==="Full"?"negative":value==="Trial attended"||value==="At risk"?"warm":"neutral";
  return <span className={"crm-tag "+kind}>{value}</span>;
}
function ActionButton({children,onClick,variant="solid",disabled=false}:{children:React.ReactNode;onClick:()=>void;variant?:"solid"|"outline"|"quiet";disabled?:boolean}){
  return <button type="button" className={"crm-button "+variant} onClick={onClick} disabled={disabled}>{children}</button>;
}
function SectionTitle({title,caption,extra}:{title:string;caption?:string;extra?:React.ReactNode}){
  return <div className="crm-section-title"><div><h2>{title}</h2>{caption&&<p>{caption}</p>}</div>{extra}</div>;
}
function Empty({text}:{text:string}){return <div className="crm-empty">{text}</div>;}

export default function Demo() {
  const [data,setData]=useState<StudioData>(()=>makeSeed());
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState<View>("overview");
  const [modal,setModal]=useState<Modal>(null);
  const [notification,setNotification]=useState("");
  const [query,setQuery]=useState("");
  const [leadForm,setLeadForm]=useState({name:"",email:"",source:"Website",consent:true});
  const [memberForm,setMemberForm]=useState({name:"",email:"",plan:"10 Class Pack",consent:true});
  const [classForm,setClassForm]=useState({title:focusClasses.Pilates[0],coach:"Sophie",date:day(1),time:"09:00",capacity:"8"});
  const [taskForm,setTaskForm]=useState({personKind:"lead" as "lead"|"member",personId:"l1",reason:"Follow up",due:day(1)});
  const [selectedLead,setSelectedLead]=useState("");
  const [note,setNote]=useState("");
  const [bookingChoice,setBookingChoice]=useState<Record<string,string>>({});
  const [portalMember,setPortalMember]=useState("m1");
  const [draft,setDraft]=useState<Draft>(null);
  const [taskFilter,setTaskFilter]=useState<"Open"|"All"|"Done">("Open");

  useEffect(()=>{
    try {const raw=localStorage.getItem(storageKey);if(raw){const parsed:unknown=JSON.parse(raw);if(isStudioData(parsed))setData(parsed);}}
    catch { /* Demo keeps its sample state if browser storage is unavailable. */ }
    setReady(true);
  },[]);
  useEffect(()=>{if(ready){try{localStorage.setItem(storageKey,JSON.stringify(data));}catch{/* browser-only demo */}}},[data,ready]);

  const insights=useMemo(()=>report(data),[data]);
  const suggestions=useMemo(()=>opportunities(data),[data]);
  const ordered=useMemo(()=>sortedSessions(data.sessions),[data.sessions]);
  const filteredLeads=useMemo(()=>data.leads.filter(l=>[l.name,l.email,l.stage,l.source].some(t=>t.toLowerCase().includes(query.toLowerCase()))),[data.leads,query]);

  function say(msg:string){setNotification(msg);}
  function log(kind:"lead"|"member",id:string,text:string){setData(prev=>({...prev,activities:[{id:uid("a"),personKind:kind,personId:id,text,date:day()},...prev.activities]}));}
  function createLead(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const name=safeText(leadForm.name,80),email=safeText(leadForm.email,160).toLowerCase();
    if(name.length<2||!email.includes("@")){say("A name and email are required.");return;}
    if([...data.leads,...data.members].some(x=>x.email===email)){say("This email is already in the demo CRM.");return;}
    const l:Lead={id:uid("l"),name,email,stage:"New",source:leadForm.source,created:day(),nextContact:day(1),consent:leadForm.consent,notes:""};
    setData(p=>({...p,leads:[l,...p.leads],activities:[{id:uid("a"),personKind:"lead",personId:l.id,text:"Lead added via "+l.source,date:day()},...p.activities]}));
    setLeadForm({name:"",email:"",source:"Website",consent:true});setModal(null);setTab("leads");setSelectedLead(l.id);say("New lead added.");
  }
  function createMember(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const name=safeText(memberForm.name,80),email=safeText(memberForm.email,160).toLowerCase();
    if(name.length<2||!email.includes("@")){say("Please enter a valid name and email.");return;}
    if(data.members.some(m=>m.email===email)){say("This member already exists.");return;}
    const m:Member={id:uid("m"),name,email,plan:memberForm.plan,credits:creditsFor(memberForm.plan),joined:day(),lastVisit:null,consent:memberForm.consent,status:"Active",notes:""};
    setData(p=>({...p,members:[m,...p.members],activities:[{id:uid("a"),personKind:"member",personId:m.id,text:"Member joined the studio",date:day()},...p.activities]}));
    setMemberForm({name:"",email:"",plan:"10 Class Pack",consent:true});setModal(null);setTab("members");say("New member added.");
  }
  function createClass(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const cap=Number(classForm.capacity);
    if(!Number.isInteger(cap)||cap<1||cap>30){say("Choose a class size from 1–30.");return;}
    setData(p=>({...p,sessions:[...p.sessions,{id:uid("s"),title:classForm.title,coach:safeText(classForm.coach,60),date:classForm.date,time:classForm.time,capacity:cap,booked:[],waitlist:[]}]}));
    setModal(null);setTab("schedule");say("Class added to the sample timetable.");
  }
  function createTask(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const reason=safeText(taskForm.reason,240);
    if(!reason){say("Enter a follow-up reason.");return;}
    const target=person(data,taskForm.personKind,taskForm.personId);
    if(!target){say("Choose a customer.");return;}
    setData(p=>({...p,tasks:[{id:uid("t"),personKind:taskForm.personKind,personId:taskForm.personId,reason,due:taskForm.due,created:day(),completed:false},...p.tasks]}));
    setModal(null);setTab("followups");say("Follow-up task created.");
  }
  function transitionLead(id:string,stage:LeadStage){
    const target=data.leads.find(l=>l.id===id);if(!target||target.stage===stage)return;
    if(stage==="Won"&&!data.members.some(m=>m.email===target.email)){
      const m:Member={id:uid("m"),name:target.name,email:target.email,plan:"10 Class Pack",credits:10,joined:day(),lastVisit:target.trialAttended||null,consent:target.consent,status:"Active",notes:"Converted from CRM lead. Demo starter credits; no payment processed."};
      setData(p=>({...p,leads:p.leads.map(l=>l.id===id?{...l,stage}:l),members:[m,...p.members],activities:[{id:uid("a"),personKind:"lead",personId:id,text:"Moved from "+target.stage+" to "+stage,date:day()},...p.activities]}));
      say("Lead converted into a member (sample 10-class pack). No payment collected.");return;
    }
    setData(p=>({...p,leads:p.leads.map(l=>l.id===id?{...l,stage,trialAttended:stage==="Trial attended"?day():l.trialAttended}:l),activities:[{id:uid("a"),personKind:"lead",personId:id,text:"Stage changed from "+target.stage+" to "+stage,date:day()},...p.activities]}));
    say("Lead moved to "+stage+".");
  }
  function addNote(lead:Lead){
    const text=safeText(note,500);if(!text)return;
    setData(p=>({...p,leads:p.leads.map(l=>l.id===lead.id?{...l,notes:((l.notes?l.notes+"\n":"")+text).slice(-1600)}:l),activities:[{id:uid("a"),personKind:"lead",personId:lead.id,text:"Note: "+text,date:day()},...p.activities]}));
    setNote("");say("Note saved to the demo CRM.");
  }
  function trackAttendance(m:Member){
    setData(p=>({...p,members:p.members.map(x=>x.id===m.id?{...x,lastVisit:day()}:x),activities:[{id:uid("a"),personKind:"member",personId:m.id,text:"Attendance marked manually",date:day()},...p.activities]}));
    say(m.name+" marked as attended today.");
  }
  function addPack(m:Member){
    if(m.credits===null){say("Unlimited member does not need extra credits.");return;}
    setData(p=>({...p,members:p.members.map(x=>x.id===m.id&&x.credits!==null?{...x,credits:x.credits+5}:x),activities:[{id:uid("a"),personKind:"member",personId:m.id,text:"Manager manually added 5 class credits; no payment collected",date:day()},...p.activities]}));
    say("Five sample credits added manually; no payment processed.");
  }
  function performBook(sessionId:string,memberId:string){
    const result=bookMember(data,sessionId,memberId);
    if(result.success)setData(result.data);
    say(result.message);
  }
  function performCancel(sessionId:string,memberId:string){
    const result=cancelBooking(data,sessionId,memberId);
    if(result.success)setData(result.data);
    say(result.message);
  }
  function prepareMessage(kind:"lead"|"member",id:string,category:string){
    const target=person(data,kind,id);if(!target)return;
    const copy=draftFor(target.name,category,data.studioName);
    setDraft({personName:target.name,email:target.email,consent:target.consent,subject:copy.subject,body:copy.body,category});
  }
  function addOpportunityTask(item:Opportunity){
    if(data.tasks.some(t=>!t.completed&&t.reason===item.label&&t.personId===item.personId)){say("An open task already exists for this opportunity.");return;}
    setData(p=>({...p,tasks:[{id:uid("t"),personKind:item.personKind,personId:item.personId,reason:item.label,due:day(),completed:false,created:day()},...p.tasks]}));
    say("Added to follow-up tasks.");
  }
  function dismissOpportunity(id:string){setData(p=>({...p,closedOpportunities:[...p.closedOpportunities,id]}));say("Suggestion dismissed in this demo.");}
  function taskDone(t:Task){
    setData(p=>({...p,tasks:p.tasks.map(x=>x.id===t.id?{...x,completed:!x.completed}:x),activities:!t.completed?[{id:uid("a"),personKind:t.personKind,personId:t.personId,text:"Follow-up marked complete: "+t.reason,date:day()},...p.activities]:p.activities}));
    say(t.completed?"Follow-up reopened.":"Follow-up marked complete.");
  }
  function resetFocus(focus:StudioFocus){
    if(!window.confirm("Switching studio type resets this browser's demo CRM data. Continue?"))return;
    setData(makeSeed(focus));setSelectedLead("");setPortalMember("m1");setClassForm(f=>({...f,title:focusClasses[focus][0]}));say("Loaded fresh "+focus+" demo data.");
  }
  function reset(){if(!window.confirm("Reset the browser demo and lose its current sample changes?"))return;resetDirect();}
  function resetDirect(){setData(makeSeed(data.studioFocus));setSelectedLead("");setPortalMember("m1");setTab("overview");say("Demo workspace reset.");}
  function exportData(){
    downloadCsv("reformdesk-crm-leads.csv",[["Name","Email","Stage","Source","Next contact","Consent"],...data.leads.map(l=>[l.name,l.email,l.stage,l.source,l.nextContact,l.consent?"Yes":"No"])]);
    say("Leads exported to CSV (sample data).");
  }

  function renderOverview(){
    return <>
      <div className="crm-stat-grid">
        <Stat label="Active members" value={insights.active} sub="Part of your studio" icon={Users}/>
        <Stat label="Active leads" value={data.leads.filter(l=>!["Won","Lost"].includes(l.stage)).length} sub="Potential new members" icon={Target}/>
        <Stat label="Studio occupancy" value={insights.occupancy+"%"} sub={insights.booked+" / "+insights.seats+" booked spots"} icon={CalendarDays}/>
        <Stat label="To follow up" value={suggestions.length} sub={insights.openTasks+" tasks still open"} icon={HeartHandshake}/>
      </div>
      <div className="crm-two-col">
        <section className="crm-panel">
          <SectionTitle title="Today's opportunities" caption="Real actions suggested by your sample member and lead data." extra={<ActionButton variant="quiet" onClick={()=>setTab("followups")}>See follow-ups <ArrowRight size={15}/></ActionButton>}/>
          {suggestions.length===0?<Empty text="You're all caught up. Add leads or members to see new opportunities."/>:suggestions.slice(0,6).map(o=>
            <div className="crm-op-row" key={o.id}>
              <span className={"crm-op-marker "+o.category.toLowerCase().replaceAll(" ","-")}></span>
              <div className="crm-op-text"><b>{o.personName}</b><span>{o.label} · {o.detail}</span></div>
              <ActionButton variant="outline" onClick={()=>prepareMessage(o.personKind,o.personId,o.category)}>Prepare <ArrowUpRight size={14}/></ActionButton>
            </div>)}
        </section>
        <div className="crm-stack">
          <section className="crm-panel">
            <SectionTitle title="Your customer journey" caption="How many people are at each stage."/>
            {leadStages.slice(0,5).map(stage=>{const n=data.leads.filter(l=>l.stage===stage).length;return <div className="crm-stage-mini" key={stage}><span>{stage}</span><div><i style={{width:convertPercent(n,Math.max(1,data.leads.length))+"%"}}/></div><b>{n}</b></div>})}
            <ActionButton variant="quiet" onClick={()=>setTab("leads")}>Open the CRM <ArrowRight size={15}/></ActionButton>
          </section>
          <section className="crm-accent-panel"><Sparkles size={24}/><h3>Good business is personal.</h3><p>Keep the little follow-ups from falling through the cracks.</p><ActionButton variant="outline" onClick={()=>setTab("leads")}>See your leads <ArrowRight size={15}/></ActionButton></section>
        </div>
      </div>
      <section className="crm-panel crm-panel-spaced"><SectionTitle title="Next classes" caption="A quick look at your studio schedule." extra={<ActionButton variant="quiet" onClick={()=>setTab("schedule")}>Full schedule <ArrowRight size={15}/></ActionButton>}/>
        {ordered.slice(0,4).map(s=><div className="crm-class-list-row" key={s.id}><span className="crm-time">{s.time}</span><div className="crm-class-caption"><b>{s.title}</b><small>{compactDate(s.date)} · {s.coach}</small></div><div className="crm-fill"><b>{s.booked.length}/{s.capacity} spots</b><i><i style={{width:convertPercent(s.booked.length,s.capacity)+"%"}}/></i></div><StatusTag value={s.booked.length>=s.capacity?"Full":"Open"}/></div>)}
      </section>
    </>;
  }

  function renderLeads(){
    const lead=data.leads.find(l=>l.id===selectedLead);
    return <>
      <div className="crm-toolbar"><label className="crm-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find leads, stages, sources…" aria-label="Search leads"/></label><div className="crm-toolbar-actions"><ActionButton variant="outline" onClick={exportData}><Download size={16}/> CSV</ActionButton><ActionButton onClick={()=>setModal("lead")}><Plus size={17}/> Add lead</ActionButton></div></div>
      <div className="crm-two-col lead-split"><section className="crm-panel">
        <SectionTitle title="The lead pipeline" caption="Select a name to see notes, activity and next steps."/>
        <div className="crm-scroll">
          <table className="crm-table">
            <thead><tr><th>LEAD</th><th>STAGE</th><th>NEXT CONTACT</th><th></th></tr></thead>
            <tbody>{filteredLeads.map(l=><tr key={l.id} className={selectedLead===l.id?"is-selected":""}><td><b>{l.name}</b><small>{l.source} · {l.email}</small></td><td><StatusTag value={l.stage}/></td><td>{compactDate(l.nextContact)}</td><td><button className="crm-row-action" onClick={()=>{setSelectedLead(l.id);setNote("");}}>Open <ArrowRight size={13}/></button></td></tr>)}</tbody>
          </table>{filteredLeads.length===0&&<Empty text="No leads match your search."/>}
        </div>
      </section>
      <section className="crm-panel crm-lead-detail">
        {lead?<><SectionTitle title={lead.name} caption={lead.email}/><div className="crm-field"><label htmlFor="lead-stage">Customer journey stage</label><select id="lead-stage" value={lead.stage} onChange={e=>transitionLead(lead.id,e.target.value as LeadStage)}>{leadStages.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="crm-detail-pair"><span>Source</span><b>{lead.source}</b><span>Next contact</span><b>{compactDate(lead.nextContact)}</b><span>Email consent</span><b>{lead.consent?"Yes":"No"}</b></div>
          <div className="crm-detail-actions"><ActionButton onClick={()=>prepareMessage("lead",lead.id,lead.stage==="Trial attended"?"Trial":"Lead")}><Mail size={16}/> Prepare email</ActionButton><ActionButton variant="outline" onClick={()=>{setTaskForm({personKind:"lead",personId:lead.id,reason:"Follow up with "+lead.name,due:day(1)});setModal("task");}}>Add task</ActionButton></div>
          <div className="crm-field"><label htmlFor="lead-note">Add a CRM note</label><textarea id="lead-note" rows={3} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="What did they ask about? What should happen next?"/></div><ActionButton variant="outline" onClick={()=>addNote(lead)} disabled={!note.trim()}>Save note</ActionButton>
          <h3 className="crm-detail-heading">Activity history</h3>{data.activities.filter(a=>a.personKind==="lead"&&a.personId===lead.id).slice(0,5).map(a=><div className="crm-activity-item" key={a.id}><small>{compactDate(a.date)}</small><span>{a.text}</span></div>)}{!data.activities.some(a=>a.personKind==="lead"&&a.personId===lead.id)&&<p className="crm-muted">No history yet.</p>}
        </>:<div className="crm-detail-empty"><Target size={30}/><h3>Select a lead</h3><p>Open a customer to see their journey, conversations and next steps.</p></div>}
      </section></div>
    </>;
  }

  function renderMembers(){
    return <section className="crm-panel">
      <SectionTitle title="Your community" caption="Credits, visit history and personal follow-ups." extra={<ActionButton onClick={()=>setModal("member")}><Plus size={16}/> Add member</ActionButton>}/>
      <div className="crm-scroll"><table className="crm-table">
        <thead><tr><th>MEMBER</th><th>CLASS PACK</th><th>CLASS CREDITS</th><th>LAST VISIT</th><th>ACTIONS</th></tr></thead>
        <tbody>{data.members.map(m=><tr key={m.id}><td><b>{m.name}</b><small>{m.email}</small></td><td><span>{m.plan}</span><small>{m.consent?"Email permitted":"Email not opted in"}</small></td><td><b>{m.credits===null?"Unlimited":m.credits}</b>{m.credits!==null&&m.credits<=2&&<small className="crm-warn">Renewal suggested</small>}</td><td>{m.lastVisit?compactDate(m.lastVisit):"No visit yet"}{m.lastVisit&&daysSince(m.lastVisit)>=14&&<small className="crm-warn">Inactive {daysSince(m.lastVisit)} days</small>}</td><td><div className="crm-inline-actions"><ActionButton variant="outline" onClick={()=>trackAttendance(m)}>Mark attended</ActionButton><ActionButton variant="outline" onClick={()=>prepareMessage("member",m.id,m.credits!==null&&m.credits<=2?"Renewal":"Re-engage")}>Email draft</ActionButton>{m.credits!==null&&<ActionButton variant="quiet" onClick={()=>addPack(m)}>+5 credits</ActionButton>}</div></td></tr>)}</tbody>
      </table></div>
      <div className="crm-table-foot">Credit adjustments are manual demo records. No payments are collected or verified.</div>
    </section>;
  }

  function renderSchedule(){
    return <section className="crm-panel">
      <SectionTitle title="Your class schedule" caption="Book, cancel and automatically promote eligible waitlisted members." extra={<ActionButton onClick={()=>{setClassForm(x=>({...x,date:day(1),title:focusClasses[data.studioFocus][0]}));setModal("class");}}><Plus size={16}/> New class</ActionButton>}/>
      <div className="crm-scroll"><table className="crm-table crm-schedule-table">
        <thead><tr><th>CLASS / INSTRUCTOR</th><th>DATE</th><th>SPOTS</th><th>BOOK A MEMBER</th><th>WAITLIST</th></tr></thead>
        <tbody>{ordered.map(s=><tr key={s.id}><td><b>{s.title}</b><small>{s.coach} · {s.time}</small></td><td>{compactDate(s.date)}</td><td><b>{s.booked.length} / {s.capacity}</b><small>{s.capacity-s.booked.length} available</small></td><td><div className="crm-book-actions"><select aria-label={"Choose member for "+s.title} value={bookingChoice[s.id]||data.members[0]?.id||""} onChange={e=>setBookingChoice(p=>({...p,[s.id]:e.target.value}))}>{data.members.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select><ActionButton variant="outline" disabled={data.members.length===0} onClick={()=>performBook(s.id,bookingChoice[s.id]||data.members[0].id)}>{s.booked.length>=s.capacity?"Waitlist":"Book"}</ActionButton>{s.booked.length>0&&<ActionButton variant="outline" onClick={()=>performCancel(s.id,s.booked[s.booked.length-1])}>Cancel last</ActionButton>}</div><small>{s.booked.slice(-3).map(id=>data.members.find(m=>m.id===id)?.name.split(" ")[0]).filter(Boolean).join(", ")||"No bookings yet"}</small></td><td>{s.waitlist.length?<><b>{s.waitlist.length} waiting</b><small>{s.waitlist.map(id=>data.members.find(m=>m.id===id)?.name.split(" ")[0]).join(", ")}</small><ActionButton variant="quiet" onClick={()=>performCancel(s.id,s.waitlist[0])}>Remove next</ActionButton></>:<StatusTag value="Open"/>}</td></tr>)}</tbody>
      </table></div>
      <div className="crm-table-foot">This is a shared-browser demonstration. For a live SaaS, every booking and credit update must be validated transactionally on the server.</div>
    </section>;
  }

  function renderFollowups(){
    const shown=data.tasks.filter(t=>taskFilter==="All"||t.completed===(taskFilter==="Done"));
    return <div className="crm-two-col"><section className="crm-panel">
      <SectionTitle title="Suggested follow-ups" caption="Rules-based alerts from class packs, lead stages and attendance."/>
      {suggestions.length? suggestions.map(o=><div className="crm-follow-row" key={o.id}><div><StatusTag value={o.category}/><h3>{o.personName}</h3><p>{o.label}</p><small>{o.detail}</small></div><div className="crm-follow-buttons"><ActionButton onClick={()=>prepareMessage(o.personKind,o.personId,o.category)}><Mail size={15}/> Draft</ActionButton><ActionButton variant="outline" onClick={()=>addOpportunityTask(o)}>Create task</ActionButton><ActionButton variant="quiet" onClick={()=>dismissOpportunity(o.id)}>Dismiss</ActionButton></div></div>):<Empty text="No suggestions at the moment."/>}
    </section><section className="crm-panel">
      <SectionTitle title="Follow-up tasks" caption="Mark work complete as you make contact." extra={<ActionButton variant="outline" onClick={()=>{setTaskForm({personKind:"lead",personId:data.leads[0]?.id||"",reason:"Follow up",due:day(1)});setModal("task");}}><Plus size={15}/> New task</ActionButton>}/>
      <div className="crm-filter-pills">{(["Open","Done","All"] as const).map(x=><button className={taskFilter===x?"active":""} key={x} onClick={()=>setTaskFilter(x)}>{x}</button>)}</div>
      {shown.length?shown.sort((a,b)=>a.due.localeCompare(b.due)).map(t=>{const p=person(data,t.personKind,t.personId);return <div className="crm-task-row" key={t.id}><button className={"crm-task-check"+(t.completed?" done":"")} aria-label={t.completed?"Reopen task":"Complete task"} onClick={()=>taskDone(t)}>{t.completed?<Check size={16}/>:null}</button><div><b>{t.reason}</b><span>{p?.name||"Unknown person"} · Due {compactDate(t.due)}</span></div><button aria-label={"Draft message for "+(p?.name||"person")} className="crm-row-action" onClick={()=>prepareMessage(t.personKind,t.personId,"General")}><Mail size={17}/></button></div>}):<Empty text="No tasks in this view."/>}
    </section></div>;
  }

  function renderReports(){
    const stages=leadStages.map(name=>({name,count:data.leads.filter(l=>l.stage===name).length}));
    const stageMax=Math.max(1,...stages.map(s=>s.count));
    const ranked=sortedSessions(data.sessions).map(s=>({...s,rate:convertPercent(s.booked.length,s.capacity)})).sort((a,b)=>b.rate-a.rate);
    return <>
      <div className="crm-stat-grid">
        <Stat label="Trial → member conversion" value={insights.conversion+"%"} sub={insights.won+" won from "+insights.trials+" trial/won leads"} icon={Target}/>
        <Stat label="Member check-ins needed" value={insights.atRisk} sub="No visit for 14+ days" icon={HeartHandshake}/>
        <Stat label="Packs near renewal" value={insights.renewals} sub="Two or fewer credits left" icon={CreditCard}/>
        <Stat label="Total seat occupancy" value={insights.occupancy+"%"} sub={insights.booked+" of "+insights.seats+" bookable places"} icon={BarChart3}/>
      </div>
      <div className="crm-two-col"><section className="crm-panel"><SectionTitle title="Customer journey" caption="Live counts from the sample lead pipeline."/>
        <div className="crm-chart-list">{stages.map(s=><div className="crm-bar-row" key={s.name}><span>{s.name}</span><div><i style={{width:convertPercent(s.count,stageMax)+"%"}}/></div><b>{s.count}</b></div>)}</div>
        <div className="crm-chart-note">Conversion is based on leads marked Trial attended or Won. This is a simple snapshot, not a cohort report.</div>
      </section><section className="crm-panel"><SectionTitle title="Class occupancy" caption="Which sessions are filling up?"/>
        <div className="crm-chart-list">{ranked.slice(0,8).map(s=><div className="crm-bar-row" key={s.id}><span>{s.title}<small>{compactDate(s.date)}</small></span><div><i style={{width:s.rate+"%"}}/></div><b>{s.rate}%</b></div>)}</div>
      </section></div>
      <section className="crm-panel crm-panel-spaced"><SectionTitle title="Activity and follow-through" caption="Actions actually recorded in this browser demo."/>
        <div className="crm-report-bottom"><div><span>OPEN FOLLOW-UPS</span><b>{insights.openTasks}</b></div><div><span>COMPLETED FOLLOW-UPS</span><b>{insights.completedTasks}</b></div><div><span>ACTIVITY EVENTS</span><b>{data.activities.length}</b></div><div><span>LEADS TRACKED</span><b>{insights.leads}</b></div></div>
        <div className="crm-table-foot">Revenue is intentionally not shown: the demonstration has no payment data and cannot claim collected income.</div>
      </section>
    </>;
  }

  function renderClient(){
    const m=data.members.find(x=>x.id===portalMember)||data.members[0];
    return <>
      <Notice>This is a simulated client experience in the same browser. There is no real client login or public booking link yet.</Notice>
      <section className="crm-panel"><SectionTitle title="Pretend you're a client" caption="Choose a sample member to experience self-service bookings."/>
        <div className="crm-client-selector"><label htmlFor="client-member">Viewing as</label><select id="client-member" value={m?.id||""} onChange={e=>setPortalMember(e.target.value)}>{data.members.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><span className="crm-client-credit">{m?m.credits===null?"Unlimited classes":m.credits+" class credits left":"No members"}</span></div>
      </section>
      {m&&<div className="crm-client-layout"><section className="crm-panel"><SectionTitle title="Available classes" caption="Book a place or join a waitlist."/>
        {ordered.map(s=>{const isBooked=s.booked.includes(m.id),isWaiting=s.waitlist.includes(m.id);return <div className="crm-client-class" key={s.id}><div className="crm-client-date"><strong>{s.time}</strong><span>{compactDate(s.date)}</span></div><div><b>{s.title}</b><small>with {s.coach} · {s.booked.length}/{s.capacity} booked</small></div><div>{isBooked||isWaiting?<ActionButton variant="outline" onClick={()=>performCancel(s.id,m.id)}>{isWaiting?"Leave waitlist":"Cancel booking"}</ActionButton>:<ActionButton onClick={()=>performBook(s.id,m.id)}>{s.booked.length>=s.capacity?"Join waitlist":"Book class"}</ActionButton>}</div></div>})}
      </section><section className="crm-panel"><SectionTitle title="My next bookings" caption="What this member can manage directly."/>
        {ordered.filter(s=>s.booked.includes(m.id)||s.waitlist.includes(m.id)).map(s=><div className="crm-my-booking" key={s.id}><b>{s.title}</b><small>{compactDate(s.date)} · {s.time}</small><span>{s.booked.includes(m.id)?"Confirmed":"Waitlisted"}</span></div>)}
        {!ordered.some(s=>s.booked.includes(m.id)||s.waitlist.includes(m.id))&&<Empty text="No upcoming bookings yet."/>}
        <div className="crm-table-foot">The member dropdown is strictly a test control. Live access will require secure authentication and studio-specific permissions.</div>
      </section></div>}
    </>;
  }

  function renderSettings(){
    return <div className="crm-settings-grid"><section className="crm-panel"><SectionTitle title="Studio type" caption="Each preset comes with suitable example class names."/>
      <div className="crm-field"><label htmlFor="demo-focus">Studio type</label><select id="demo-focus" value={data.studioFocus} onChange={e=>resetFocus(e.target.value as StudioFocus)}>{focuses.map(f=><option key={f}>{f}</option>)}</select></div>
      <p className="crm-muted">Switching presets resets only this browser's demo data, after confirmation.</p>
      {data.studioFocus==="Gym"&&<Notice>Gym mode currently demonstrates group classes and membership tracking, not door access or gym hardware.</Notice>}
    </section><section className="crm-panel"><SectionTitle title="Data and exports" caption="Your sample records are stored only in this browser."/>
      <div className="crm-settings-actions"><ActionButton variant="outline" onClick={exportData}><Download size={15}/> Export leads CSV</ActionButton>
      <ActionButton variant="outline" onClick={()=>downloadCsv("reformdesk-members.csv",[["Name","Email","Plan","Credits","Last visit"],...data.members.map(m=>[m.name,m.email,m.plan,m.credits??"Unlimited",m.lastVisit||""])] )}><Download size={15}/> Export members CSV</ActionButton>
      <ActionButton variant="outline" onClick={reset}><RotateCcw size={15}/> Reset demo data</ActionButton></div>
    </section><section className="crm-panel crm-wide"><SectionTitle title="Production requirements" caption="The browser prototype is not a secure hosted CRM."/>
      <div className="crm-readiness"><div><b>Built for demonstration</b><p>Leads, client journey, member notes, opportunities, bookings, follow-up tasks, drafts and reports.</p></div><div><b>Before real customers</b><p>Provision Postgres, tenant accounts and access policies, client authentication, transactional bookings, server audit logs, backups, GDPR controls and email delivery.</p></div></div>
    </section></div>;
  }

  function renderModalForm(){
    return <div className="crm-modal-shade" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="crm-modal" role="dialog" aria-modal="true" aria-label="CRM form"><div className="crm-modal-head"><h2>{modal==="lead"?"Add a lead":modal==="member"?"Add a member":modal==="class"?"Create a class":"New follow-up task"}</h2><button onClick={()=>setModal(null)} aria-label="Close"><X size={20}/></button></div>
      {modal==="lead"&&<form onSubmit={createLead} className="crm-modal-form"><label>Full name<input autoFocus required maxLength={80} value={leadForm.name} onChange={e=>setLeadForm({...leadForm,name:e.target.value})} placeholder="Taylor Morgan"/></label><label>Email<input type="email" required value={leadForm.email} onChange={e=>setLeadForm({...leadForm,email:e.target.value})} placeholder="taylor@example.com"/></label><label>Lead source<select value={leadForm.source} onChange={e=>setLeadForm({...leadForm,source:e.target.value})}>{["Website","Instagram","Referral","Walk-in","Other"].map(s=><option key={s}>{s}</option>)}</select></label><label className="crm-check-row"><input type="checkbox" checked={leadForm.consent} onChange={e=>setLeadForm({...leadForm,consent:e.target.checked})}/> Consent recorded for follow-up emails (demo only)</label><button className="crm-button solid" type="submit">Add lead</button></form>}
      {modal==="member"&&<form onSubmit={createMember} className="crm-modal-form"><label>Full name<input autoFocus required maxLength={80} value={memberForm.name} onChange={e=>setMemberForm({...memberForm,name:e.target.value})} placeholder="Taylor Morgan"/></label><label>Email<input type="email" required value={memberForm.email} onChange={e=>setMemberForm({...memberForm,email:e.target.value})}/></label><label>Class pack<select value={memberForm.plan} onChange={e=>setMemberForm({...memberForm,plan:e.target.value})}>{planOptions.map(s=><option key={s}>{s}</option>)}</select></label><label className="crm-check-row"><input type="checkbox" checked={memberForm.consent} onChange={e=>setMemberForm({...memberForm,consent:e.target.checked})}/> Consent recorded for follow-up emails (demo only)</label><button className="crm-button solid" type="submit">Add member</button></form>}
      {modal==="class"&&<form onSubmit={createClass} className="crm-modal-form"><label>Class name<select value={classForm.title} onChange={e=>setClassForm({...classForm,title:e.target.value})}>{focusClasses[data.studioFocus].map(s=><option key={s}>{s}</option>)}</select></label><label>Instructor<input required value={classForm.coach} maxLength={60} onChange={e=>setClassForm({...classForm,coach:e.target.value})}/></label><div className="crm-form-pair"><label>Date<input type="date" required value={classForm.date} onChange={e=>setClassForm({...classForm,date:e.target.value})}/></label><label>Time<input type="time" required value={classForm.time} onChange={e=>setClassForm({...classForm,time:e.target.value})}/></label></div><label>Capacity<input type="number" required min={1} max={30} value={classForm.capacity} onChange={e=>setClassForm({...classForm,capacity:e.target.value})}/></label><button className="crm-button solid" type="submit">Create class</button></form>}
      {modal==="task"&&<form onSubmit={createTask} className="crm-modal-form"><label>Person type<select value={taskForm.personKind} onChange={e=>{const kind=e.target.value as "lead"|"member";setTaskForm({...taskForm,personKind:kind,personId:kind==="lead"?data.leads[0]?.id||"":data.members[0]?.id||""});}}><option value="lead">Lead</option><option value="member">Member</option></select></label><label>Person<select value={taskForm.personId} onChange={e=>setTaskForm({...taskForm,personId:e.target.value})}>{(taskForm.personKind==="lead"?data.leads:data.members).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Reason<input required maxLength={240} value={taskForm.reason} onChange={e=>setTaskForm({...taskForm,reason:e.target.value})}/></label><label>Due date<input type="date" required value={taskForm.due} onChange={e=>setTaskForm({...taskForm,due:e.target.value})}/></label><button className="crm-button solid" type="submit">Create follow-up</button></form>}
    </div></div>;
  }

  const title=pageNames[tab];
  return <div className="demo-shell crm-shell">
    <aside className="demo-aside crm-aside"><Link className="crm-logo" href="/"><span className="crm-logo-mark">✳</span>reform<b>desk</b><span className="crm-logo-dot">.</span></Link><div className="crm-side-label">STUDIO WORKSPACE <span>v0.3</span></div><nav className="crm-nav" aria-label="Studio navigation">{navItems.map(({id,name,icon:Icon})=><button type="button" key={id} className={tab===id?"active":""} onClick={()=>{setTab(id);setNotification("");}}><Icon size={19}/><span>{name}</span>{id==="followups"&&insights.openTasks>0&&<em>{insights.openTasks}</em>}</button>)}</nav>
      <div className="crm-aside-bottom"><span className="crm-sample-badge"><span/> SAMPLE DATA ONLY</span><div className="crm-sidebar-profile"><span>WR</span><div><b>Willow Studio</b><small>Owner · Demo</small></div></div><Link href="/">← Back to website</Link></div>
    </aside>
    <div className="demo-main crm-main"><header className="demo-topbar crm-topbar"><div className="crm-crumb"><b>ReformDesk</b><span>/</span>{navItems.find(n=>n.id===tab)?.name}</div><span>{data.studioName} <span className="crm-owner-avatar">WR</span></span></header>
    <div className="demo-mobile-nav crm-mobile-nav">{navItems.map(({id,name})=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{name}</button>)}</div>
    <main className="demo-content crm-content">
      <Notice><b>Interactive CRM prototype.</b> Browser-only sample data; no real accounts, payment processing or outbound emails. Please do not enter real personal details.</Notice>
      {notification&&<div className="crm-toast"><span>{notification}</span><button aria-label="Dismiss message" onClick={()=>setNotification("")}><X size={16}/></button></div>}
      <div className="crm-page-head"><div><span className="crm-page-eyebrow">{title.eyebrow}</span><h1>{title.title}</h1><p>{title.description}</p></div>{tab==="overview"&&<ActionButton onClick={()=>setModal("lead")}><Plus size={16}/> New lead</ActionButton>}</div>
      {ready?(tab==="overview"?renderOverview():tab==="leads"?renderLeads():tab==="members"?renderMembers():tab==="schedule"?renderSchedule():tab==="followups"?renderFollowups():tab==="reports"?renderReports():tab==="client"?renderClient():renderSettings()):<div className="crm-empty">Preparing your sample studio…</div>}
    </main></div>
    {modal&&renderModalForm()}
    {draft&&<div className="crm-modal-shade" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDraft(null)}}><div className="crm-modal crm-draft-modal" role="dialog" aria-modal="true" aria-label="Email draft"><div className="crm-modal-head"><h2>Message for {draft.personName}</h2><button aria-label="Close" onClick={()=>setDraft(null)}><X size={20}/></button></div><p className="crm-muted">This is an editable draft for the studio owner to review. Nothing is sent automatically.</p>{!draft.consent&&<div className="crm-consent-alert"><ShieldCheck size={17}/> Email consent has not been recorded for this person. Sending is disabled.</div>}
      <div className="crm-modal-form"><label>To<input readOnly value={draft.email}/></label><label>Subject<input value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></label><label>Message<textarea rows={8} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></label><div className="crm-draft-buttons"><ActionButton variant="outline" onClick={()=>{void navigator.clipboard?.writeText("Subject: "+draft.subject+"\n\n"+draft.body).then(()=>say("Draft copied.")).catch(()=>say("Clipboard access unavailable."));}}>Copy draft</ActionButton><ActionButton disabled={!draft.consent} onClick={()=>{window.location.href="mailto:"+encodeURIComponent(draft.email)+"?subject="+encodeURIComponent(draft.subject)+"&body="+encodeURIComponent(draft.body);say("Your email app opened. Check and send manually.");}}>Open email app <ArrowUpRight size={15}/></ActionButton></div></div>
    </div></div>}
  </div>;
}
