"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Activity as ActivityIcon, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check, CheckCheck,
  ChevronDown, ClipboardList, Clock3, CreditCard, Download, FileText, HeartHandshake, LayoutDashboard,
  Mail, Plus, RotateCcw, Search, Send, Settings2, ShieldCheck, Sparkles, Target, UserPlus, Users, X, FileSpreadsheet, Upload
} from "lucide-react";
import {
  bookMember, cancelBooking, compactDate, convertPercent, creditsFor, dateLabel, day, daysSince, downloadCsv,
  draftFor, focusClasses, focuses, initials, isStudioData, leadStages, makeSeed, opportunities, person, planOptions,
  report, sortedSessions, studioNameByFocus, uid,
  type Lead, type LeadStage, type Member, type Opportunity, type StudioData, type StudioFocus, type Task, type View
} from "../../lib/studio-crm";
import type { ValidationOutcome } from "../../lib/studio-excel";
import {adjustMemberCredits,initialHistory,studioHistoryReducer} from "../../lib/studio-history";
import {addLead,addMember,addClasses,addTask,completeTask,confirmPackage,convertLead,validEmail,cleanPhone,TASK_OUTCOMES,TASK_CATEGORIES,TASK_PRIORITIES,TASK_REPEAT,CONTACT_CHANNELS,DAYS,type LeadInput,type MemberInput,type ClassInput,type TaskInput} from "../../lib/studio-workflows";
import "./crm.css";

type Modal = "lead"|"member"|"class"|"task"|"credits"|null;
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
  const [history,dispatchHistory]=useReducer(studioHistoryReducer,undefined,()=>initialHistory(makeSeed()));
  const data=history.present;
  function setData(change:React.SetStateAction<StudioData>,label="Studio update"){
    dispatchHistory({type:"apply",change:typeof change==="function"?change:()=>change,label});
  }
  function undoLast(){
    const latest=history.past[history.past.length-1];
    if(!latest)return;
    dispatchHistory({type:"undo"});
    say("Undone: "+latest.label+".");
  }
  function redoLast(){
    const latest=history.future[history.future.length-1];
    if(!latest)return;
    dispatchHistory({type:"redo"});
    say("Restored: "+latest.label+".");
  }
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState<View>("overview");
  const [modal,setModal]=useState<Modal>(null);
  const [notification,setNotification]=useState("");
  const [query,setQuery]=useState("");
  const [leadForm,setLeadForm]=useState<LeadInput>({name:"",email:"",phone:"",source:"Website",stage:"New",nextContact:day(1),notes:"",preferredService:"",preferredChannel:"Either",interestPlan:"",consent:false});
  const [leadAdvanced,setLeadAdvanced]=useState(false);
  const [memberForm,setMemberForm]=useState<MemberInput>({name:"",email:"",phone:"",plan:"10 Class Pack",startDate:day(),expiryDate:"",credits:10,paymentStatus:"Pending",status:"Active",notes:"",consent:false,sourceLeadId:""});
  const [memberAdvanced,setMemberAdvanced]=useState(false);
  const [creditForm,setCreditForm]=useState({memberId:"",direction:"add" as "add"|"remove",amount:"5",reason:"Balance correction"});
  const [classForm,setClassForm]=useState<ClassInput>({title:focusClasses.Pilates[0],coach:"Sophie",date:day(1),time:"09:00",capacity:8,durationMinutes:50,room:"Main studio",bookingCutoffHours:0,cancelCutoffHours:0,description:"",repeat:false,weekdays:[1,3,5],endDate:day(31)});
  const [classAdvanced,setClassAdvanced]=useState(false);
  const [taskForm,setTaskForm]=useState<TaskInput>({personKind:"lead",personId:"l1",reason:"Follow up",category:"Call",priority:"Normal",due:day(1),dueTime:"",assignee:"Studio owner",repeat:"None",notes:""});
  const [taskAdvanced,setTaskAdvanced]=useState(false);
  const [taskOutcomes,setTaskOutcomes]=useState<Record<string,NonNullable<Task["outcome"]>>>({});
  const [selectedLead,setSelectedLead]=useState("");
  const [note,setNote]=useState("");
  const [bookingChoice,setBookingChoice]=useState<Record<string,string>>({});
  const [portalMember,setPortalMember]=useState("m1");
  const [draft,setDraft]=useState<Draft>(null);
  const [taskFilter,setTaskFilter]=useState<"Open"|"All"|"Done">("Open");
  const [excelBusy,setExcelBusy]=useState(false);
  const [excelPreview,setExcelPreview]=useState<ValidationOutcome|null>(null);
  const [excelFileName,setExcelFileName]=useState("");
  const excelInput=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    try {const raw=localStorage.getItem(storageKey);if(raw){const parsed:unknown=JSON.parse(raw);if(isStudioData(parsed))dispatchHistory({type:"load",data:parsed});}}
    catch { /* Demo keeps its sample state if browser storage is unavailable. */ }
    setReady(true);
  },[]);
  useEffect(()=>{if(ready){try{localStorage.setItem(storageKey,JSON.stringify(data));}catch{/* browser-only demo */}}},[data,ready]);

  const insights=useMemo(()=>report(data),[data]);
  const suggestions=useMemo(()=>opportunities(data),[data]);
  const ordered=useMemo(()=>sortedSessions(data.sessions),[data.sessions]);
  const filteredLeads=useMemo(()=>data.leads.filter(l=>[l.name,l.email,l.phone||"",l.stage,l.source].some(t=>t.toLowerCase().includes(query.toLowerCase()))),[data.leads,query]);

  function say(msg:string){setNotification(msg);}
  function log(kind:"lead"|"member",id:string,text:string){setData(prev=>({...prev,activities:[{id:uid("a"),personKind:kind,personId:id,text,date:day()},...prev.activities]}));}
  function createLead(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const result=addLead(data,leadForm);
    if(!result.ok){say(result.message);return;}
    setData(result.data,"Created lead and follow-up");
    setLeadForm({name:"",email:"",phone:"",source:"Website",stage:"New",nextContact:day(1),notes:"",preferredService:"",preferredChannel:"Either",interestPlan:"",consent:false});
    setLeadAdvanced(false);setModal(null);setTab("leads");setSelectedLead(result.data.leads[0]?.id||"");say(result.message);
  }
  function createMember(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const result=addMember(data,memberForm);
    if(!result.ok){say(result.message);return;}
    setData(result.data,"Created member");
    setMemberForm({name:"",email:"",phone:"",plan:"10 Class Pack",startDate:day(),expiryDate:"",credits:10,paymentStatus:"Pending",status:"Active",notes:"",consent:false,sourceLeadId:""});
    setMemberAdvanced(false);setModal(null);setTab("members");say(result.message);
  }
  function createClass(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const result=addClasses(data,classForm);
    if(!result.ok){say(result.message);return;}
    setData(result.data,"Created "+(result.created||1)+" class sessions");
    setModal(null);setClassAdvanced(false);setTab("schedule");say(result.message);
  }
  function createTask(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const result=addTask(data,taskForm);
    if(!result.ok){say(result.message);return;}
    setData(result.data,"Created follow-up");
    setModal(null);setTaskAdvanced(false);setTab("followups");say(result.message);
  }
  function transitionLead(id:string,stage:LeadStage){
    const current=data.leads.find(l=>l.id===id);if(!current||current.stage===stage)return;
    if(stage==="Won"){
      if(!window.confirm("Convert this lead to a pending member? No credits or payments will be recorded."))return;
      const result=convertLead(data,id,current.interestPlan||"10 Class Pack");
      if(!result.ok){say(result.message);return;}
      setData(result.data,"Converted lead to pending member");say(result.message);return;
    }
    setData(p=>({...p,leads:p.leads.map(l=>l.id===id?{...l,stage,trialAttended:stage==="Trial attended"?day():l.trialAttended}:l),
      activities:[{id:uid("a"),personKind:"lead",personId:id,text:"Stage changed from "+current.stage+" to "+stage,date:day()},...p.activities]}),"Updated lead journey");say("Lead stage updated.");
  }
  function approvePackage(m:Member){
    if(!window.confirm("Manually confirm "+m.name+"'s package and activate credits? This does not collect or verify a payment."))return;
    const result=confirmPackage(data,m.id);
    if(!result.ok){say(result.message);return;}
    setData(result.data,"Confirmed "+m.name+"'s package");say(result.message);
  }
  function toggleMemberStatus(m:Member){
    const next=m.status==="Paused"?"Active":"Paused";
    if(!window.confirm((next==="Paused"?"Pause":"Resume")+" membership for "+m.name+"? This can be undone."))return;
    setData(p=>({...p,members:p.members.map(x=>x.id===m.id?{...x,status:next}:x),
      activities:[{id:uid("a"),personKind:"member",personId:m.id,text:"Membership status changed to "+next,date:day()},...p.activities]}),next+" membership");
    say(m.name+" membership "+(next==="Paused"?"paused":"resumed")+".");
  }
  function addNote(lead:Lead){
    const text=safeText(note,500);if(!text)return;
    setData(p=>({...p,leads:p.leads.map(l=>l.id===lead.id?{...l,notes:((l.notes?l.notes+"\n":"")+text).slice(-1600)}:l),activities:[{id:uid("a"),personKind:"lead",personId:lead.id,text:"Note: "+text,date:day()},...p.activities]}));
    setNote("");say("Note saved to the demo CRM.");
  }
  function trackAttendance(m:Member){
    setData(p=>({...p,members:p.members.map(x=>x.id===m.id?{...x,lastVisit:day()}:x),activities:[{id:uid("a"),personKind:"member",personId:m.id,text:"Attendance marked manually",date:day()},...p.activities]}),"Marked "+m.name+" attended");
    say(m.name+" marked as attended today.");
  }
  function openCredits(m:Member){
    if(m.credits===null){say("Unlimited memberships do not have a class credit balance.");return;}
    setCreditForm({memberId:m.id,direction:"add",amount:"5",reason:"Balance correction"});
    setModal("credits");
  }
  function submitCredits(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const m=data.members.find(x=>x.id===creditForm.memberId);
    if(!m)return;
    const amount=Number(creditForm.amount);
    const delta=creditForm.direction==="add"?amount:-amount;
    const reason=safeText(creditForm.reason,200);
    if(!Number.isSafeInteger(amount)||amount<1||amount>1000){say("Use 1–1,000 whole credits.");return;}
    if(creditForm.direction==="remove" && m.credits!==null && amount>m.credits){say("Cannot remove more credits than the member has.");return;}
    if(creditForm.direction==="remove" && !window.confirm("Remove "+amount+" credits from "+m.name+"? You can undo this afterwards."))return;
    const result=adjustMemberCredits(data,m.id,delta,reason,uid("a"),day());
    if(!result.success){say(result.message);return;}
    setData(result.data,(delta>0?"Added ":"Removed ")+amount+" credits "+(delta>0?"to ":"from ")+m.name);
    setModal(null);
    say(result.message);
  }
  function performBook(sessionId:string,memberId:string){
    const result=bookMember(data,sessionId,memberId);
    if(result.success)setData(result.data,"Booked or waitlisted a member");
    say(result.message);
  }
  function performCancel(sessionId:string,memberId:string){
    const result=cancelBooking(data,sessionId,memberId);
    if(result.success)setData(result.data,"Cancelled booking or waitlist spot");
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
  function dismissOpportunity(id:string){setData(p=>({...p,closedOpportunities:[...p.closedOpportunities,id]}),"Dismissed a CRM suggestion");say("Suggestion dismissed in this demo.");}
  function taskDone(t:Task){
    if(!t.completed){
      const result=completeTask(data,t.id,taskOutcomes[t.id]||"Contacted");
      if(!result.ok){say(result.message);return;}
      setData(result.data,"Completed follow-up");say(result.message);return;
    }
    setData(p=>({...p,tasks:p.tasks.map(x=>x.id===t.id?{...x,completed:false,outcome:undefined,completedAt:undefined}:x)}),"Reopened follow-up");
    say(t.completed?"Follow-up reopened.":"Follow-up marked complete.");
  }
  function resetFocus(focus:StudioFocus){
    if(!window.confirm("Switching studio type resets this browser's demo CRM data. Continue?"))return;
    setData(makeSeed(focus),"Switched demo studio type");setSelectedLead("");setPortalMember("m1");setClassForm(f=>({...f,title:focusClasses[focus][0]}));say("Loaded fresh "+focus+" demo data.");
  }
  function reset(){if(!window.confirm("Reset the browser demo and lose its current sample changes?"))return;resetDirect();}
  function resetDirect(){setData(makeSeed(data.studioFocus),"Reset demo workspace");setSelectedLead("");setPortalMember("m1");setTab("overview");say("Demo workspace reset.");}
  function exportData(){
    downloadCsv("reformdesk-crm-leads.csv",[["Name","Email","Stage","Source","Next contact","Consent"],...data.leads.map(l=>[l.name,l.email,l.stage,l.source,l.nextContact,l.consent?"Yes":"No"])]);
    say("Leads exported to CSV (sample data).");
  }

  async function exportExcel(template=false){
    setExcelBusy(true);setExcelPreview(null);
    try{
      const {downloadExcelWorkbook}=await import("../../lib/studio-excel-browser");
      await downloadExcelWorkbook(data,template);
      say(template?"Structured Excel template downloaded.":"Excel workbook downloaded with all CRM records.");
    }catch(e){say("Excel export failed: "+(e instanceof Error?e.message:"Unknown error."));}
    finally{setExcelBusy(false);}
  }
  async function importExcelFile(file:File|undefined){
    if(!file)return;
    setExcelBusy(true);setExcelPreview(null);setExcelFileName(file.name);
    try{
      const {previewExcelImport}=await import("../../lib/studio-excel-browser");
      const preview=await previewExcelImport(file);
      setExcelPreview(preview);
      say(preview.valid?"Excel format validated. Review the row counts before replacing this demo.":preview.errors.length+" Excel validation error(s). No data was changed.");
    }catch(e){setExcelPreview(null);say("Excel import failed: "+(e instanceof Error?e.message:"Invalid workbook."));}
    finally{setExcelBusy(false);if(excelInput.current)excelInput.current.value="";}
  }
  function applyExcelImport(){
    const preview=excelPreview;
    if(!preview?.valid||!preview.data)return;
    const counts=preview.counts;
    if(!window.confirm("Replace ALL current browser demo data with the validated Excel workbook?\n\n"+
      counts.leads+" leads, "+counts.members+" members, "+counts.classes+" classes, "+
      counts.bookings+" bookings, "+counts.tasks+" tasks.\n\n"+
      "This replaces your sample workspace. Download a backup first if needed."))return;
    setData(preview.data,"Imported Excel workbook");setSelectedLead("");setPortalMember(preview.data.members[0]?.id||"");
    setBookingChoice({});setExcelPreview(null);setTab("overview");
    say("Excel import completed. All linked demo records have been replaced.");
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
      <div className="crm-toolbar"><label className="crm-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find leads, stages, sources…" aria-label="Search leads"/></label><div className="crm-toolbar-actions"><ActionButton variant="outline" onClick={()=>setTab("settings")}><FileSpreadsheet size={16}/> Excel</ActionButton><ActionButton variant="outline" onClick={exportData}><Download size={16}/> CSV</ActionButton><ActionButton onClick={()=>setModal("lead")}><Plus size={17}/> Add lead</ActionButton></div></div>
      <div className="crm-two-col lead-split"><section className="crm-panel">
        <SectionTitle title="The lead pipeline" caption="Select a name to see notes, activity and next steps."/>
        <div className="crm-scroll">
          <table className="crm-table">
            <thead><tr><th>LEAD</th><th>STAGE</th><th>NEXT CONTACT</th><th></th></tr></thead>
            <tbody>{filteredLeads.map(l=><tr key={l.id} className={selectedLead===l.id?"is-selected":""}><td><b>{l.name}</b><small>{l.source} · {l.email||l.phone||"No contact"}</small></td><td><StatusTag value={l.stage}/></td><td>{compactDate(l.nextContact)}</td><td><button className="crm-row-action" onClick={()=>{setSelectedLead(l.id);setNote("");}}>Open <ArrowRight size={13}/></button></td></tr>)}</tbody>
          </table>{filteredLeads.length===0&&<Empty text="No leads match your search."/>}
        </div>
      </section>
      <section className="crm-panel crm-lead-detail">
        {lead?<><SectionTitle title={lead.name} caption={lead.email||lead.phone||"No contact"}/><div className="crm-field"><label htmlFor="lead-stage">Customer journey stage</label><select id="lead-stage" value={lead.stage} onChange={e=>transitionLead(lead.id,e.target.value as LeadStage)}>{leadStages.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="crm-detail-pair"><span>Source</span><b>{lead.source}</b><span>Next contact</span><b>{compactDate(lead.nextContact)}</b><span>Email consent</span><b>{lead.consent?"Yes":"No"}</b>
          <span>Phone</span><b>{lead.phone||"Not provided"}</b>
          <span>Preferred service</span><b>{lead.preferredService||"Not specified"}</b>
          <span>Contact channel</span><b>{lead.preferredChannel||"Either"}</b>
          <span>Interested pack</span><b>{lead.interestPlan||"Not selected"}</b></div>
          <div className="crm-detail-actions"><ActionButton onClick={()=>prepareMessage("lead",lead.id,lead.stage==="Trial attended"?"Trial":"Lead")}><Mail size={16}/> Prepare email</ActionButton><ActionButton variant="outline" onClick={()=>{setTaskForm({...taskForm,personKind:"lead",personId:lead.id,reason:"Follow up with "+lead.name,due:day(1)});setModal("task");}}>Add task</ActionButton></div>
          <div className="crm-field"><label htmlFor="lead-note">Add a CRM note</label><textarea id="lead-note" rows={3} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="What did they ask about? What should happen next?"/></div><ActionButton variant="outline" onClick={()=>addNote(lead)} disabled={!note.trim()}>Save note</ActionButton>
          <h3 className="crm-detail-heading">Activity history</h3>{data.activities.filter(a=>a.personKind==="lead"&&a.personId===lead.id).slice(0,5).map(a=><div className="crm-activity-item" key={a.id}><small>{compactDate(a.date)}</small><span>{a.text}</span></div>)}{!data.activities.some(a=>a.personKind==="lead"&&a.personId===lead.id)&&<p className="crm-muted">No history yet.</p>}
        </>:<div className="crm-detail-empty"><Target size={30}/><h3>Select a lead</h3><p>Open a customer to see their journey, conversations and next steps.</p></div>}
      </section></div>
    </>;
  }

  function renderMembers(){
    return <section className="crm-panel">
      <SectionTitle title="Your community" caption="Credits, visit history and personal follow-ups." extra={<div className="crm-inline-actions"><ActionButton variant="outline" onClick={()=>setTab("settings")}><FileSpreadsheet size={16}/> Excel</ActionButton><ActionButton onClick={()=>setModal("member")}><Plus size={16}/> Add member</ActionButton></div>}/>
      <div className="crm-scroll"><table className="crm-table">
        <thead><tr><th>MEMBER</th><th>CLASS PACK</th><th>CLASS CREDITS</th><th>LAST VISIT</th><th>ACTIONS</th></tr></thead>
        <tbody>{data.members.map(m=><tr key={m.id}><td><b>{m.name}</b><small>{m.email||m.phone||"No contact"}</small>
  {m.sourceLeadId&&<details className="crm-member-history"><summary>Linked lead history</summary>
    {data.leads.find(l=>l.id===m.sourceLeadId)?.notes&&<p>{data.leads.find(l=>l.id===m.sourceLeadId)?.notes}</p>}
    {data.activities.filter(a=>a.personKind==="lead"&&a.personId===m.sourceLeadId).slice(0,5).map(a=><p key={a.id}><b>{compactDate(a.date)}</b> — {a.text}</p>)}
  </details>}</td><td><span>{m.plan}</span><small>{m.paymentStatus==="Pending"?"Pending confirmation":m.consent?"Email permitted":"Package confirmed"}</small>{m.expiryDate&&<small>Expires {compactDate(m.expiryDate)}</small>}</td><td><b>{m.credits===null?"Unlimited":m.credits}</b>{m.paymentStatus!=="Pending"&&m.credits!==null&&m.credits<=2&&<small className="crm-warn">Renewal suggested</small>}</td><td>{m.lastVisit?compactDate(m.lastVisit):"No visit yet"}{m.lastVisit&&daysSince(m.lastVisit)>=14&&<small className="crm-warn">Inactive {daysSince(m.lastVisit)} days</small>}</td><td><div className="crm-inline-actions">{m.paymentStatus==="Pending"&&<ActionButton onClick={()=>approvePackage(m)}>Confirm pack</ActionButton>}<ActionButton variant="outline" onClick={()=>toggleMemberStatus(m)}>{m.status==="Paused"?"Resume":"Pause"}</ActionButton><ActionButton variant="outline" onClick={()=>trackAttendance(m)}>Mark attended</ActionButton><ActionButton variant="outline" onClick={()=>prepareMessage("member",m.id,m.credits!==null&&m.credits<=2?"Renewal":"Re-engage")}>Email draft</ActionButton>{m.credits!==null&&<ActionButton variant="quiet" onClick={()=>openCredits(m)}>Adjust credits</ActionButton>}</div></td></tr>)}</tbody>
      </table></div>
      <div className="crm-table-foot">Packages marked Pending have zero active credits. Confirming a package is a manual demo acknowledgment; no payments are collected or verified. Linked leads retain their history.</div>
    </section>;
  }

  function renderSchedule(){
    return <section className="crm-panel">
      <SectionTitle title="Your class schedule" caption="Book, cancel and automatically promote eligible waitlisted members." extra={<ActionButton onClick={()=>{setClassForm(x=>({...x,date:day(1),title:focusClasses[data.studioFocus][0],repeat:false}));setModal("class");}}><Plus size={16}/> New class</ActionButton>}/>
      <div className="crm-scroll"><table className="crm-table crm-schedule-table">
        <thead><tr><th>CLASS / INSTRUCTOR</th><th>DATE</th><th>SPOTS</th><th>BOOK A MEMBER</th><th>WAITLIST</th></tr></thead>
        <tbody>{ordered.map(s=><tr key={s.id}><td><b>{s.title}</b><small>{s.coach} · {s.time} · {s.durationMinutes||50} min · {s.room||"Main studio"}</small></td><td>{compactDate(s.date)}</td><td><b>{s.booked.length} / {s.capacity}</b><small>{s.capacity-s.booked.length} available</small></td><td><div className="crm-book-actions"><select aria-label={"Choose member for "+s.title} value={bookingChoice[s.id]||data.members[0]?.id||""} onChange={e=>setBookingChoice(p=>({...p,[s.id]:e.target.value}))}>{data.members.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select><ActionButton variant="outline" disabled={data.members.length===0} onClick={()=>performBook(s.id,bookingChoice[s.id]||data.members[0].id)}>{s.booked.length>=s.capacity?"Waitlist":"Book"}</ActionButton>{s.booked.length>0&&<ActionButton variant="outline" onClick={()=>performCancel(s.id,s.booked[s.booked.length-1])}>Cancel last</ActionButton>}</div><small>{s.booked.slice(-3).map(id=>data.members.find(m=>m.id===id)?.name.split(" ")[0]).filter(Boolean).join(", ")||"No bookings yet"}</small></td><td>{s.waitlist.length?<><b>{s.waitlist.length} waiting</b><small>{s.waitlist.map(id=>data.members.find(m=>m.id===id)?.name.split(" ")[0]).join(", ")}</small><ActionButton variant="quiet" onClick={()=>performCancel(s.id,s.waitlist[0])}>Remove next</ActionButton></>:<StatusTag value="Open"/>}</td></tr>)}</tbody>
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
      <SectionTitle title="Follow-up tasks" caption="Mark work complete as you make contact." extra={<ActionButton variant="outline" onClick={()=>{setTaskForm({...taskForm,personKind:"lead",personId:data.leads[0]?.id||"",reason:"Follow up",due:day(1)});setModal("task");}}><Plus size={15}/> New task</ActionButton>}/>
      <div className="crm-filter-pills">{(["Open","Done","All"] as const).map(x=><button className={taskFilter===x?"active":""} key={x} onClick={()=>setTaskFilter(x)}>{x}</button>)}</div>
      {shown.length?shown.sort((a,b)=>a.due.localeCompare(b.due)).map(t=>{const p=person(data,t.personKind,t.personId);return <div className="crm-task-row" key={t.id}><button className={"crm-task-check"+(t.completed?" done":"")} aria-label={t.completed?"Reopen task":"Complete task"} onClick={()=>taskDone(t)}>{t.completed?<Check size={16}/>:null}</button><div><b>{t.reason}</b><span>{p?.name||"Unknown person"} · {t.category||"General"} · Due {compactDate(t.due)}{t.dueTime?" "+t.dueTime:""} · {t.priority||"Normal"} priority</span>{t.completed&&t.outcome&&<small>Result: {t.outcome}</small>}</div>{!t.completed&&<label className="crm-task-outcome-label">Result<select aria-label={"Completion result for "+(p?.name||"person")} value={taskOutcomes[t.id]||"Contacted"} onChange={e=>setTaskOutcomes(v=>({...v,[t.id]:e.target.value as NonNullable<Task["outcome"]>}))}>{TASK_OUTCOMES.map(v=><option key={v}>{v}</option>)}</select></label>}<button aria-label={"Draft message for "+(p?.name||"person")} className="crm-row-action" onClick={()=>prepareMessage(t.personKind,t.personId,"General")}><Mail size={17}/></button></div>}):<Empty text="No tasks in this view."/>}
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
        <Stat label="Packs near renewal" value={insights.renewals+insights.expiring} sub={insights.expiring+" expire soon · "+insights.renewals+" low credits"} icon={CreditCard}/>
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
        <div className="crm-insights-addendum"><div><b>Pending package confirmations</b><strong>{insights.pending}</strong><small>Manual verification required before credits are available.</small></div><div><b>Follow-up outcomes</b>{Object.entries(insights.outcomes).map(([name,total])=><span key={name}>{name}: <strong>{total}</strong></span>)}</div><div><b>Upcoming package expiry</b><strong>{insights.expiring}</strong><small>Within the next 14 days.</small></div></div><div className="crm-table-foot">Revenue is intentionally not shown: the demonstration has no payment data and cannot claim collected income.</div>
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
    return <div className="crm-settings-grid">
      <section className="crm-panel"><SectionTitle title="Studio type" caption="Each preset comes with suitable example class names."/>
        <div className="crm-field"><label htmlFor="demo-focus">Studio type</label><select id="demo-focus" value={data.studioFocus} onChange={e=>resetFocus(e.target.value as StudioFocus)}>{focuses.map(f=><option key={f}>{f}</option>)}</select></div>
        <p className="crm-muted">Switching presets resets only this browser's demo data, after confirmation.</p>
        {data.studioFocus==="Gym"&&<Notice>Gym mode currently demonstrates group classes and membership tracking, not door access or gym hardware.</Notice>}
      </section>
      <section className="crm-panel crm-excel-panel"><SectionTitle title="Excel import / export" caption="A structured .xlsx workbook, formatted for this CRM."/>
        <div className="crm-excel-content">
          <div className="crm-excel-status"><FileSpreadsheet size={25}/><div><b>ReformDesk Excel v1</b><span>8 worksheets · Exact column headers · Linked bookings and tasks</span></div></div>
          <p>Download a blank template, complete its sheets and import it. Or export the current studio into an Excel workbook. Everything stays in this browser demo.</p>
          <div className="crm-excel-actions">
            <ActionButton variant="outline" disabled={excelBusy} onClick={()=>{void exportExcel(true);}}><Download size={15}/> Download template</ActionButton>
            <ActionButton variant="outline" disabled={excelBusy} onClick={()=>{void exportExcel(false);}}><FileSpreadsheet size={15}/> Export Excel</ActionButton>
            <ActionButton disabled={excelBusy} onClick={()=>excelInput.current?.click()}><Upload size={15}/> Import Excel</ActionButton>
            <input ref={excelInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden aria-label="Select Excel workbook" onChange={e=>{void importExcelFile(e.target.files?.[0]);}}/>
          </div>
          {excelBusy&&<div className="crm-excel-loading">Working with your workbook…</div>}
          {excelPreview&&<div className={"crm-excel-preview"+(excelPreview.valid?" is-valid":" is-invalid")}>
            <b>{excelPreview.valid?"Workbook validated":"Workbook has errors"} · {excelFileName}</b>
            <div className="crm-excel-counts">{Object.entries(excelPreview.counts).map(([k,v])=><span key={k}><strong>{v}</strong> {k}</span>)}</div>
            {!excelPreview.valid?<div><p>Import blocked. Fix the following cells in the template, then re-upload:</p><ul>{excelPreview.errors.slice(0,12).map((msg,i)=><li key={i}>{msg}</li>)}</ul>{excelPreview.errors.length>12&&<small>And {excelPreview.errors.length-12} more errors.</small>}</div>
              :<div><p><strong>Preview only — no changes yet.</strong> Confirming replaces the entire browser demo, including bookings, activities and follow-up tasks.</p><ActionButton onClick={applyExcelImport}><Check size={15}/> Confirm import &amp; replace demo</ActionButton></div>}
            <ActionButton variant="quiet" onClick={()=>{setExcelPreview(null);setExcelFileName("");}}>Close preview</ActionButton>
          </div>}
          <div className="crm-excel-warning"><ShieldCheck size={18}/><span>Do not upload real client details yet. This prototype has no secure hosted accounts or database. Files are processed in your browser, not uploaded to our server.</span></div>
        </div>
      </section>
      <section className="crm-panel"><SectionTitle title="Data and CSV exports" caption="Quick exports and demo reset."/>
        <div className="crm-settings-actions">
          <ActionButton variant="outline" onClick={exportData}><Download size={15}/> Export leads CSV</ActionButton>
          <ActionButton variant="outline" onClick={()=>downloadCsv("reformdesk-members.csv",[["Name","Email","Plan","Credits","Last visit"],...data.members.map(m=>[m.name,m.email,m.plan,m.credits??"Unlimited",m.lastVisit||""])] )}><Download size={15}/> Export members CSV</ActionButton>
          <ActionButton variant="outline" onClick={reset}><RotateCcw size={15}/> Reset demo data</ActionButton>
        </div>
      </section>
      <section className="crm-panel crm-wide"><SectionTitle title="Production requirements" caption="The browser prototype is not a secure hosted CRM."/>
        <div className="crm-readiness"><div><b>Built for demonstration</b><p>Leads, client journey, bookings, follow-up tasks, Excel workbook round trips and reports.</p></div><div><b>Before real customers</b><p>Provision a secure database, account access policies, transactional bookings, backups, GDPR controls and verified email delivery.</p></div></div>
      </section>
    </div>;
  }

  function renderModalForm(){
    return <div className="crm-modal-shade" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="crm-modal" role="dialog" aria-modal="true" aria-label="CRM form"><div className="crm-modal-head"><h2>{modal==="lead"?"Add a lead":modal==="member"?"Add a member":modal==="class"?"Create a class":modal==="credits"?"Adjust class credits":"New follow-up task"}</h2><button onClick={()=>setModal(null)} aria-label="Close"><X size={20}/></button></div>
      {modal==="lead"&&<form onSubmit={createLead} className="crm-modal-form">
        <p className="crm-modal-note">Only a name and one contact method are needed to get started.</p>
        <label>Full name<input autoFocus required maxLength={80} value={leadForm.name} onChange={e=>setLeadForm({...leadForm,name:e.target.value})} placeholder="Taylor Morgan"/></label>
        <div className="crm-form-pair"><label>Email (optional)<input type="email" value={leadForm.email} onChange={e=>setLeadForm({...leadForm,email:e.target.value})} placeholder="taylor@example.com"/></label><label>Phone (optional)<input type="tel" value={leadForm.phone} onChange={e=>setLeadForm({...leadForm,phone:e.target.value})} placeholder="+441234567890"/></label></div>
        <label>Lead source<select value={leadForm.source} onChange={e=>setLeadForm({...leadForm,source:e.target.value})}>{["Website","Instagram","Referral","Walk-in","Other"].map(v=><option key={v}>{v}</option>)}</select></label>
        <label className="crm-check-row"><input type="checkbox" checked={leadForm.consent} disabled={!leadForm.email.trim()} onChange={e=>setLeadForm({...leadForm,consent:e.target.checked})}/> Email follow-up consent recorded (off by default)</label>
        <button className="crm-advanced-toggle" type="button" aria-expanded={leadAdvanced} onClick={()=>setLeadAdvanced(v=>!v)}>{leadAdvanced?"− Hide advanced options":"+ Advanced options"}</button>
        {leadAdvanced&&<div className="crm-advanced-fields">
          <label>Customer journey stage<select value={leadForm.stage} onChange={e=>setLeadForm({...leadForm,stage:e.target.value as LeadStage})}>{leadStages.filter(v=>v!=="Won").map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Next contact date<input type="date" required value={leadForm.nextContact} onChange={e=>setLeadForm({...leadForm,nextContact:e.target.value})}/></label>
          <label>Interested in<select value={leadForm.preferredService} onChange={e=>setLeadForm({...leadForm,preferredService:e.target.value})}><option value="">Not specified</option>{focuses.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Preferred contact channel<select value={leadForm.preferredChannel} onChange={e=>setLeadForm({...leadForm,preferredChannel:e.target.value as LeadInput["preferredChannel"]})}>{CONTACT_CHANNELS.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Interested package<select value={leadForm.interestPlan} onChange={e=>setLeadForm({...leadForm,interestPlan:e.target.value})}><option value="">Not decided</option>{planOptions.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Conversation notes<textarea rows={3} maxLength={1600} value={leadForm.notes} onChange={e=>setLeadForm({...leadForm,notes:e.target.value})} placeholder="Only information needed to arrange classes."/></label>
        </div>}
        <button type="submit" className="crm-button solid">Add lead &amp; schedule follow-up</button>
      </form>}
      {modal==="member"&&<form onSubmit={createMember} className="crm-modal-form">
        <p className="crm-modal-note">An unpaid package starts with zero usable credits. You can activate it after manual confirmation.</p>
        <label>Full name<input autoFocus required maxLength={80} value={memberForm.name} onChange={e=>setMemberForm({...memberForm,name:e.target.value})} placeholder="Taylor Morgan"/></label>
        <div className="crm-form-pair"><label>Email (optional)<input type="email" value={memberForm.email} onChange={e=>setMemberForm({...memberForm,email:e.target.value})}/></label><label>Phone (optional)<input type="tel" value={memberForm.phone} onChange={e=>setMemberForm({...memberForm,phone:e.target.value})} placeholder="+441234567890"/></label></div>
        <label>Class pack<select value={memberForm.plan} onChange={e=>{const plan=e.target.value;setMemberForm({...memberForm,plan,credits:creditsFor(plan)||0});}}>{planOptions.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Package confirmation status<select value={memberForm.paymentStatus} onChange={e=>setMemberForm({...memberForm,paymentStatus:e.target.value as MemberInput["paymentStatus"]})}><option value="Pending">Pending — no credits yet</option><option value="Paid">Manually confirmed (no payment processed)</option></select></label>
        <label className="crm-check-row"><input type="checkbox" checked={memberForm.consent} disabled={!memberForm.email.trim()} onChange={e=>setMemberForm({...memberForm,consent:e.target.checked})}/> Email follow-up consent recorded (off by default)</label>
        <button className="crm-advanced-toggle" type="button" aria-expanded={memberAdvanced} onClick={()=>setMemberAdvanced(v=>!v)}>{memberAdvanced?"− Hide advanced options":"+ Advanced options"}</button>
        {memberAdvanced&&<div className="crm-advanced-fields">
          <div className="crm-form-pair"><label>Membership starts<input type="date" required value={memberForm.startDate} onChange={e=>setMemberForm({...memberForm,startDate:e.target.value})}/></label><label>Expires (optional)<input type="date" min={memberForm.startDate} value={memberForm.expiryDate} onChange={e=>setMemberForm({...memberForm,expiryDate:e.target.value})}/></label></div>
          {memberForm.plan!=="Unlimited Monthly"&&<label>Credits when package confirmed<input type="number" min={0} max={1000} step={1} value={memberForm.credits} onChange={e=>setMemberForm({...memberForm,credits:Number(e.target.value)})}/></label>}
          <label>Membership status<select value={memberForm.status} onChange={e=>setMemberForm({...memberForm,status:e.target.value as MemberInput["status"]})}><option>Active</option><option>Paused</option></select></label>
          <label>Link to existing lead<select value={memberForm.sourceLeadId||""} onChange={e=>{const id=e.target.value;const lead=data.leads.find(l=>l.id===id);setMemberForm({...memberForm,sourceLeadId:id,...(lead?{name:lead.name,email:lead.email,phone:lead.phone||"",notes:lead.notes,consent:lead.consent,plan:lead.interestPlan||memberForm.plan,credits:creditsFor(lead.interestPlan||memberForm.plan)||0}:{})});}}><option value="">No linked lead</option>{data.leads.filter(l=>l.stage!=="Lost").map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
          <label>Member notes<textarea rows={3} maxLength={1600} value={memberForm.notes} onChange={e=>setMemberForm({...memberForm,notes:e.target.value})} placeholder="Schedule preferences or follow-up notes, not health details."/></label>
        </div>}
        <button type="submit" className="crm-button solid">Add member</button>
      </form>}
      {modal==="class"&&<form onSubmit={createClass} className="crm-modal-form">
        <label>Class name<select value={classForm.title} onChange={e=>setClassForm({...classForm,title:e.target.value})}>{focusClasses[data.studioFocus].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Instructor<select value={classForm.coach} onChange={e=>setClassForm({...classForm,coach:e.target.value})}>{[...new Set([...data.sessions.map(s=>s.coach),"Sophie","Olivia","Ava"])].map(v=><option key={v}>{v}</option>)}</select></label>
        <div className="crm-form-pair"><label>Date<input type="date" required value={classForm.date} onChange={e=>setClassForm({...classForm,date:e.target.value})}/></label><label>Start time<input type="time" required value={classForm.time} onChange={e=>setClassForm({...classForm,time:e.target.value})}/></label></div>
        <div className="crm-form-pair"><label>Duration<select value={classForm.durationMinutes} onChange={e=>setClassForm({...classForm,durationMinutes:Number(e.target.value)})}>{[30,45,50,60,75,90].map(v=><option value={v} key={v}>{v} minutes</option>)}</select></label><label>Capacity<input type="number" required min={1} max={100} step={1} value={classForm.capacity} onChange={e=>setClassForm({...classForm,capacity:Number(e.target.value)})}/></label></div>
        <button className="crm-advanced-toggle" type="button" aria-expanded={classAdvanced} onClick={()=>setClassAdvanced(v=>!v)}>{classAdvanced?"− Hide advanced options":"+ Advanced options / repeat weekly"}</button>
        {classAdvanced&&<div className="crm-advanced-fields">
          <label>Room or location<input maxLength={80} value={classForm.room} onChange={e=>setClassForm({...classForm,room:e.target.value})} placeholder="Main studio"/></label>
          <label className="crm-check-row"><input type="checkbox" checked={classForm.repeat} onChange={e=>setClassForm({...classForm,repeat:e.target.checked})}/> Repeat weekly</label>
          {classForm.repeat&&<><span className="crm-modal-label">Repeat on</span><div className="crm-weekday-picker">{DAYS.map((label,index)=><button type="button" key={label} aria-pressed={classForm.weekdays.includes(index)} className={classForm.weekdays.includes(index)?"active":""} onClick={()=>setClassForm(p=>({...p,weekdays:p.weekdays.includes(index)?p.weekdays.filter(d=>d!==index):[...p.weekdays,index]}))}>{label}</button>)}</div><label>Repeat until (maximum 180 days)<input type="date" min={classForm.date} value={classForm.endDate} onChange={e=>setClassForm({...classForm,endDate:e.target.value})}/></label></>}
          <div className="crm-form-pair"><label>Book closes (hours before)<input type="number" min={0} max={168} step={1} value={classForm.bookingCutoffHours} onChange={e=>setClassForm({...classForm,bookingCutoffHours:Number(e.target.value)})}/></label><label>Cancel closes (hours before)<input type="number" min={0} max={168} step={1} value={classForm.cancelCutoffHours} onChange={e=>setClassForm({...classForm,cancelCutoffHours:Number(e.target.value)})}/></label></div>
          <label>Class description (optional)<textarea rows={2} maxLength={500} value={classForm.description} onChange={e=>setClassForm({...classForm,description:e.target.value})}/></label>
        </div>}
        <p className="crm-modal-note">An overlapping instructor or studio room will block the entire batch. Weekly sessions are generated as separate classes.</p>
        <button className="crm-button solid" type="submit">{classForm.repeat?"Create recurring classes":"Create class"}</button>
      </form>}
      {modal==="credits"&&(()=>{const m=data.members.find(x=>x.id===creditForm.memberId);const value=m?.credits??0;const amount=Number(creditForm.amount);const signed=creditForm.direction==="add"?amount:-amount;const valid=Number.isSafeInteger(amount)&&amount>=1&&amount<=1000&&m?.credits!==null&&value+signed>=0&&value+signed<=1000000&&creditForm.reason.trim().length>0;return <form onSubmit={submitCredits} className="crm-modal-form">
        <div className="crm-credit-summary"><span>MEMBER</span><strong>{m?.name||"Member not found"}</strong><span>CURRENT BALANCE</span><strong>{m?.credits===null?"Unlimited":value+" credits"}</strong></div>
        <label>Adjustment type<select value={creditForm.direction} onChange={e=>setCreditForm({...creditForm,direction:e.target.value as "add"|"remove"})}><option value="add">Add credits (+)</option><option value="remove">Remove credits (−)</option></select></label>
        <label>Number of credits<input type="number" min="1" max="1000" step="1" required value={creditForm.amount} onChange={e=>setCreditForm({...creditForm,amount:e.target.value})}/></label>
        <label>Reason for adjustment<input maxLength={200} required value={creditForm.reason} onChange={e=>setCreditForm({...creditForm,reason:e.target.value})} placeholder="Correction to class pack balance"/></label>
        <div className={"crm-credit-result"+(!valid?" invalid":"")}><span>NEW BALANCE</span><strong>{valid?(value+signed)+" credits":"Check amount / remaining balance"}</strong></div>
        <p className="crm-modal-note">A record of the adjustment is added to the demo activity log. You can undo your last change afterward. No payment is processed.</p>
        <button disabled={!valid} className="crm-button solid" type="submit">{creditForm.direction==="add"?"Confirm credit addition":"Confirm credit removal"}</button>
      </form>})()}
      {modal==="task"&&<form onSubmit={createTask} className="crm-modal-form">
        <label>Person type<select value={taskForm.personKind} onChange={e=>{const kind=e.target.value as "lead"|"member";setTaskForm({...taskForm,personKind:kind,personId:kind==="lead"?data.leads[0]?.id||"":data.members[0]?.id||""});}}><option value="lead">Lead</option><option value="member">Member</option></select></label>
        <label>Person<select value={taskForm.personId} onChange={e=>setTaskForm({...taskForm,personId:e.target.value})}>{(taskForm.personKind==="lead"?data.leads:data.members).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Task type<select value={taskForm.category||"Call"} onChange={e=>setTaskForm({...taskForm,category:e.target.value as TaskInput["category"]})}>{TASK_CATEGORIES.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Reason<input required maxLength={240} value={taskForm.reason} onChange={e=>setTaskForm({...taskForm,reason:e.target.value})}/></label>
        <label>Due date<input type="date" required value={taskForm.due} onChange={e=>setTaskForm({...taskForm,due:e.target.value})}/></label>
        <button className="crm-advanced-toggle" type="button" aria-expanded={taskAdvanced} onClick={()=>setTaskAdvanced(v=>!v)}>{taskAdvanced?"− Hide advanced options":"+ Advanced options"}</button>
        {taskAdvanced&&<div className="crm-advanced-fields">
          <label>Due time (optional)<input type="time" value={taskForm.dueTime} onChange={e=>setTaskForm({...taskForm,dueTime:e.target.value})}/></label>
          <label>Priority<select value={taskForm.priority||"Normal"} onChange={e=>setTaskForm({...taskForm,priority:e.target.value as TaskInput["priority"]})}>{TASK_PRIORITIES.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Responsible team member<input maxLength={60} value={taskForm.assignee} onChange={e=>setTaskForm({...taskForm,assignee:e.target.value})}/></label>
          <label>Repeat task<select value={taskForm.repeat||"None"} onChange={e=>setTaskForm({...taskForm,repeat:e.target.value as TaskInput["repeat"]})}>{TASK_REPEAT.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Notes (optional)<textarea rows={2} maxLength={500} value={taskForm.notes} onChange={e=>setTaskForm({...taskForm,notes:e.target.value})}/></label>
        </div>}
        <button className="crm-button solid" type="submit">Create follow-up</button>
      </form>}
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
      {notification&&<div className="crm-toast" role="status"><span>{notification}</span><div className="crm-toast-actions">{history.past.length>0&&<button type="button" className="crm-toast-undo" onClick={undoLast}><RotateCcw size={15}/> Undo</button>}<button type="button" aria-label="Dismiss message" onClick={()=>setNotification("")}><X size={16}/></button></div></div>}
      <div className="crm-history-bar" aria-label="Undo and redo demo changes"><span>{history.past.length?("Last change: "+history.past[history.past.length-1].label):"Changes can be reversed in this browser session."}</span><div><button type="button" onClick={undoLast} disabled={!history.past.length} title="Undo last change"><RotateCcw size={15}/> Undo</button><button type="button" onClick={redoLast} disabled={!history.future.length} title="Redo last undone change"><ArrowRight size={15}/> Redo</button></div></div>
      <div className="crm-page-head"><div><span className="crm-page-eyebrow">{title.eyebrow}</span><h1>{title.title}</h1><p>{title.description}</p></div>{tab==="overview"&&<ActionButton onClick={()=>setModal("lead")}><Plus size={16}/> New lead</ActionButton>}</div>
      {ready?(tab==="overview"?renderOverview():tab==="leads"?renderLeads():tab==="members"?renderMembers():tab==="schedule"?renderSchedule():tab==="followups"?renderFollowups():tab==="reports"?renderReports():tab==="client"?renderClient():renderSettings()):<div className="crm-empty">Preparing your sample studio…</div>}
    </main></div>
    {modal&&renderModalForm()}
    {draft&&<div className="crm-modal-shade" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDraft(null)}}><div className="crm-modal crm-draft-modal" role="dialog" aria-modal="true" aria-label="Email draft"><div className="crm-modal-head"><h2>Message for {draft.personName}</h2><button aria-label="Close" onClick={()=>setDraft(null)}><X size={20}/></button></div><p className="crm-muted">This is an editable draft for the studio owner to review. Nothing is sent automatically.</p>{!draft.consent&&<div className="crm-consent-alert"><ShieldCheck size={17}/> Email consent has not been recorded for this person. Sending is disabled.</div>}
      <div className="crm-modal-form"><label>To<input readOnly value={draft.email}/></label><label>Subject<input value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></label><label>Message<textarea rows={8} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></label><div className="crm-draft-buttons"><ActionButton variant="outline" onClick={()=>{void navigator.clipboard?.writeText("Subject: "+draft.subject+"\n\n"+draft.body).then(()=>say("Draft copied.")).catch(()=>say("Clipboard access unavailable."));}}>Copy draft</ActionButton><ActionButton disabled={!draft.consent} onClick={()=>{window.location.href="mailto:"+encodeURIComponent(draft.email)+"?subject="+encodeURIComponent(draft.subject)+"&body="+encodeURIComponent(draft.body);say("Your email app opened. Check and send manually.");}}>Open email app <ArrowUpRight size={15}/></ActionButton></div></div>
    </div></div>}
  </div>;
}
