"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type CSSProperties,type FormEvent} from "react";
import {BarChart3,CalendarDays,CheckCircle2,Download,LayoutDashboard,LogOut,Settings2,Target,Trash2,Users} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import {StudioOperations,type WorkspacePreferences,type WorkspaceSection} from "./studio-operations";
import {ClassBasedOperations} from "./class-based-operations";
import {OnboardingPanel} from "./onboarding-panel";
import {BillingPanel} from "./billing-panel";
import {StaffInvitations} from "./staff-invitations";
import {StudioClosureRequest} from "./studio-closure-request";
import {TimezoneSelect} from "./timezone-select";
import {LEGAL_ACCEPTANCE_TEXT,LEGAL_VERSIONS} from "../../lib/legal-versions";
import {CLASS_FORMATS,STUDIO_FOCUSES,studioPreset,studioPresetProfile} from "../../lib/studio-presets";

type User={id:string;email:string;role:string};
type Studio={id:string;name:string};
type Person={id:string;kind:"lead"|"member";full_name:string;email:string;phone:string;created_at:string;lead_stage:string|null;notes:string;member_status:string|null;tags:string[];waiver_status:"not_required"|"pending"|"signed"|"expired";waiver_updated_at:string|null;related_contact_name:string;related_contact_role:string;related_contact_email:string;related_contact_phone:string};
type AuthMode="login"|"register"|"forgot"|"reset"|"verify"|"resend";
type ContactKind="lead"|"member";
type ContactPage={hasMore:boolean;nextOffset:number};
const emptyContactPage=():ContactPage=>({hasMore:false,nextOffset:0});
type OwnerView="today"|"leads"|"members"|"classes"|"followups"|"insights"|"settings";
type StudioSettings={
 name:string;focus:string;timezone:string;accentColor:string;memberTerm:string;classTerm:string;creditTerm:string;weekStarts:"monday"|"sunday";
 timeFormat:"24h"|"12h";defaultView:OwnerView;defaultClassDuration:number;defaultClassCapacity:number;defaultRoom:string;
 inactiveDays:number;lowCreditsThreshold:number;renewalWindowDays:number;trialFollowupHours:number;packageReviewHours:number;openSeatsThreshold:number;
 spotBookingEnabled:boolean;equipmentLabel:string;defaultSpotCount:number;defaultClassFormat:string;waiverRequired:boolean;
 lateCancelRefundCredit:boolean;noShowRefundCredit:boolean;privacyPolicyUrl:string;onboardingCompleted:boolean;hasLogo:boolean;
};
const defaultSettings:StudioSettings={name:"",focus:"Pilates",timezone:"UTC",accentColor:"#334BDD",memberTerm:"Members",classTerm:"Classes",creditTerm:"Credits",
 weekStarts:"monday",timeFormat:"24h",defaultView:"today",defaultClassDuration:50,defaultClassCapacity:8,defaultRoom:"Main studio",
 inactiveDays:21,lowCreditsThreshold:2,renewalWindowDays:14,trialFollowupHours:18,packageReviewHours:24,openSeatsThreshold:2,
 spotBookingEnabled:true,equipmentLabel:"Reformer",defaultSpotCount:8,defaultClassFormat:"group",waiverRequired:true,
 lateCancelRefundCredit:false,noShowRefundCredit:false,privacyPolicyUrl:"",onboardingCompleted:false,hasLogo:false};
const singularTerm=(term:string)=>term.endsWith("ies")?term.slice(0,-3)+"y":term.endsWith("sses")?term.slice(0,-2):term.endsWith("s")?term.slice(0,-1):term;
const modes:{mode:AuthMode;name:string}[]=[{mode:"login",name:"Sign in"},{mode:"forgot",name:"Forgot password"},{mode:"resend",name:"Resend verification"}];

export function WorkspaceClient({registrationEnabled}:{registrationEnabled:boolean}){
 const [user,setUser]=useState<User|null>(null),[studio,setStudio]=useState<Studio|null>(null),[people,setPeople]=useState<Person[]>([]);
 const [mode,setMode]=useState<AuthMode>("login"),[token,setToken]=useState(""),[busy,setBusy]=useState(false),[note,setNote]=useState(""),[pendingPlan,setPendingPlan]=useState<"monthly"|"annual"|null>(null),[registrationLegalAccepted,setRegistrationLegalAccepted]=useState(false);
 const [trustDevice,setTrustDevice]=useState(false);
 const [form,setForm]=useState({email:"",password:"",studioName:"",focus:"Pilates",timezone:"UTC"}),[person,setPerson]=useState({kind:"lead",name:"",email:"",phone:"",notes:"",tags:"",waiverStatus:"not_required",relatedContactName:"",relatedContactRole:"",relatedContactEmail:"",relatedContactPhone:""});
 const [editing,setEditing]=useState<string|null>(null),[editForm,setEditForm]=useState({name:"",notes:"",stage:"New",tags:"",waiverStatus:"not_required",relatedContactName:"",relatedContactRole:"",relatedContactEmail:"",relatedContactPhone:""});
 const [settings,setSettings]=useState<StudioSettings>(defaultSettings),[view,setView]=useState<OwnerView>("today"),[logoVersion,setLogoVersion]=useState(0);
 const initializedView=useRef(false);
 const [archivedRecords,setArchivedRecords]=useState<{id:string;full_name:string}[]>([]);
 const [contactSearch,setContactSearch]=useState(""),[appliedContactSearch,setAppliedContactSearch]=useState("");
 const [contactPages,setContactPages]=useState<Record<ContactKind,ContactPage>>({lead:emptyContactPage(),member:emptyContactPage()});
 const [contactsLoading,setContactsLoading]=useState(false);

 async function requestContactPage(kind:ContactKind,query:string,offset=0):Promise<{records:Person[];hasMore:boolean;nextOffset:number}>{
  const qs=new URLSearchParams({kind,search:query,offset:String(offset)});
  const response=await fetch("/api/studio/people?"+qs.toString(),{credentials:"same-origin",cache:"no-store"});
  const json=await response.json();
  if(!response.ok)throw Error(json.error||"Could not load contacts.");
  return json;
 }
 async function refreshContacts(query=appliedContactSearch){
  setContactsLoading(true);
  try{
   const [leads,members]=await Promise.all([requestContactPage("lead",query),requestContactPage("member",query)]);
   setPeople([...leads.records,...members.records]);
   setContactPages({lead:{hasMore:leads.hasMore,nextOffset:leads.nextOffset},
    member:{hasMore:members.hasMore,nextOffset:members.nextOffset}});
  }finally{setContactsLoading(false)}
 }
 async function loadMoreContacts(kind:ContactKind){
  const page=contactPages[kind];if(!page.hasMore||contactsLoading)return;
  setContactsLoading(true);
  try{
   const next=await requestContactPage(kind,appliedContactSearch,page.nextOffset);
   setPeople(prev=>[...prev,...next.records.filter(p=>!prev.some(existing=>existing.id===p.id))]);
   setContactPages(prev=>({...prev,[kind]:{hasMore:next.hasMore,nextOffset:next.nextOffset}}));
  }catch(e){setNote(e instanceof Error?e.message:"Could not load more contacts.")}
  finally{setContactsLoading(false)}
 }
 function searchContacts(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const query=contactSearch.trim();setAppliedContactSearch(query);
  void refreshContacts(query).catch(e=>setNote(e instanceof Error?e.message:"Could not search contacts."));
 }


 async function load(){
  const res=await fetch("/api/auth/me",{credentials:"same-origin",cache:"no-store"});
  if(!res.ok){setUser(null);setStudio(null);setPeople([]);initializedView.current=false;return}
  const body=await res.json();setUser(body.user);setStudio(body.studio);
  if(["owner","manager","receptionist","instructor"].includes(body.user.role)){
   const response=await fetch("/api/studio/settings",{credentials:"same-origin",cache:"no-store"});
   if(response.ok){const config=await response.json();setSettings(config.studio);setStudio((v:Studio|null)=>v?{...v,name:config.studio.name}:v);
    if(!initializedView.current){setView(body.user.role==="instructor"?"classes":config.studio.onboardingCompleted?config.studio.defaultView:"settings");initializedView.current=true}
   }
  }
  if(["owner","manager","receptionist"].includes(body.user.role)){
   await refreshContacts();
  }else{setPeople([]);setContactPages({lead:emptyContactPage(),member:emptyContactPage()})}
 }
 useEffect(()=>{
  const detected=Intl.DateTimeFormat().resolvedOptions().timeZone;if(detected)setForm(prev=>({...prev,timezone:detected}));
  const search=new URLSearchParams(window.location.search),requestedPlan=search.get("plan"),requestedMode=search.get("mode");if(requestedPlan==="monthly"||requestedPlan==="annual")setPendingPlan(requestedPlan);if(requestedMode==="register"&&registrationEnabled){setMode("register");if(requestedPlan!=="monthly"&&requestedPlan!=="annual")setPendingPlan("monthly")}
  const qs=new URLSearchParams(window.location.hash.replace(/^#/,""));if(window.location.hash)window.history.replaceState(null,"",window.location.pathname+window.location.search);
  for(const name of ["verify","reset"] as const){const found=qs.get(name);if(found){setMode(name);setToken(found);break}}
  void load().catch(()=>setNote("Could not check your workspace session."));
 },[]);

 async function submitAuth(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNote("");
  try{
   const target={login:"/api/auth/login",register:"/api/auth/register",verify:"/api/auth/verify",reset:"/api/auth/password/reset",forgot:"/api/auth/password/forgot",resend:"/api/auth/verify/resend"}[mode];
   const payload=mode==="verify"?{token}:mode==="reset"?{token,password:form.password}:["forgot","resend"].includes(mode)?{email:form.email}:mode==="register"?{...form,plan:pendingPlan||"monthly",legalAccepted:registrationLegalAccepted,termsVersion:LEGAL_VERSIONS.terms,dpaVersion:LEGAL_VERSIONS.dpa,privacyVersion:LEGAL_VERSIONS.privacy,cancellationVersion:LEGAL_VERSIONS.cancellation}:mode==="login"?{email:form.email,password:form.password,trustDevice}:form;
   const res=await fetch(target,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(payload)}),body=await res.json();
   if(!res.ok){setNote(body.error||"Unable to complete your request.");return}
   setForm(prev=>({...prev,password:""}));
   if(mode==="login"){initializedView.current=false;await load();if(pendingPlan)setView("settings");setNote(pendingPlan?"Signed in. Complete your "+pendingPlan+" StudioTasker subscription below.":"Signed in successfully.")}
   else{setNote(body.notice||"Request accepted.");if(["verify","reset"].includes(mode)){setMode("login");setToken("");window.history.replaceState(null,"","/workspace")}if(mode==="register"){setRegistrationLegalAccepted(false);setMode("login")}}
  }catch{setNote("Request failed. Please try again in a moment.")}finally{setBusy(false)}
 }
 async function addPerson(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNote("");
  try{const res=await fetch("/api/studio/people",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({...person,tags:person.tags.split(",").map(x=>x.trim()).filter(Boolean)})}),body=await res.json();
   if(!res.ok){setNote(body.error||"Unable to create contact.");return}setPerson({kind:person.kind,name:"",email:"",phone:"",notes:"",tags:"",waiverStatus:"not_required",relatedContactName:"",relatedContactRole:"",relatedContactEmail:"",relatedContactPhone:""});await load();setNote((person.kind==="lead"?"Lead":"Member")+" saved to your studio.")
  }catch{setNote("Unable to save contact.")}finally{setBusy(false)}
 }
 async function savePerson(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!editing)return;setBusy(true);setNote("");
  try{const current=people.find(x=>x.id===editing),payload=current?.kind==="lead"?{name:editForm.name,notes:editForm.notes,stage:editForm.stage}:{name:editForm.name,notes:editForm.notes,tags:editForm.tags.split(",").map(x=>x.trim()).filter(Boolean),waiverStatus:editForm.waiverStatus,relatedContactName:editForm.relatedContactName,relatedContactRole:editForm.relatedContactRole,relatedContactEmail:editForm.relatedContactEmail,relatedContactPhone:editForm.relatedContactPhone};
   const res=await fetch("/api/studio/people/"+editing,{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),body=await res.json();
   if(!res.ok){setNote(body.error||"Unable to update contact.");return}setEditing(null);await load();setNote("Contact updated.")
  }catch{setNote("Update failed.")}finally{setBusy(false)}
 }
 async function convertLead(p:Person){
  if(p.kind!=="lead"||!window.confirm("Convert "+p.full_name+" to a member? Their lead notes and history will be retained."))return;
  setBusy(true);setNote("");
  try{
   const response=await fetch("/api/studio/people/"+p.id+"/convert",{method:"POST",credentials:"same-origin"});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Conversion failed.");
   await load();setView("members");setEditing(null);setNote("Lead converted to member without duplicating the contact.");
  }catch(e){setNote(e instanceof Error?e.message:"Conversion failed.")}finally{setBusy(false)}
 }
 async function archivePerson(p:Person){
  if(!window.confirm("Archive "+p.full_name+"? This hides the contact from active work."))return;setBusy(true);setNote("");
  try{const res=await fetch("/api/studio/people/"+p.id,{method:"DELETE",credentials:"same-origin"}),body=await res.json();if(!res.ok){setNote(body.error||"Unable to archive.");return}setEditing(null);await load();setNote(body.notice||"Contact archived.")}
  catch{setNote("Archiving failed.")}finally{setBusy(false)}
 }
 async function saveSettings(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNote("");
  try{const response=await fetch("/api/studio/settings",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)}),data=await response.json();
   if(!response.ok)throw Error(data.error||"Save failed");setSettings(data.studio);setStudio(v=>v?{...v,name:data.studio.name}:v);setNote("Studio appearance and operating preferences saved.")
  }catch(e){setNote(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}
 }
 async function uploadLogo(file:File){
  setNote("");if(file.size>200000){setNote("Logo must be 200 KB or smaller.");return}
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){setNote("Use PNG, JPEG or WebP.");return}
  setBusy(true);try{const data=new FormData();data.set("logo",file);const response=await fetch("/api/studio/logo",{method:"POST",credentials:"same-origin",body:data}),body=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(body.error||"Logo upload failed");setSettings(s=>({...s,hasLogo:true}));setLogoVersion(v=>v+1);setNote("Studio logo uploaded.")
  }catch(e){setNote(e instanceof Error?e.message:"Logo upload failed")}finally{setBusy(false)}
 }
 async function removeLogo(){if(!window.confirm("Remove the studio logo?"))return;setBusy(true);try{const response=await fetch("/api/studio/logo",{method:"DELETE",credentials:"same-origin"});if(!response.ok)throw Error("Logo removal failed");setSettings(s=>({...s,hasLogo:false}));setLogoVersion(v=>v+1);setNote("Studio logo removed.")}catch(e){setNote(e instanceof Error?e.message:"Logo removal failed")}finally{setBusy(false)}}
 async function reviewArchived(){
  try{const r=await fetch("/api/studio/privacy",{credentials:"same-origin",cache:"no-store"}),d=await r.json();
   if(!r.ok)throw Error(d.error||"Unable to load archived contacts.");setArchivedRecords(d.archivedRecords||[])
  }catch(e){setNote(e instanceof Error?e.message:"Unable to load archived contacts.")}
 }
 async function anonymizeArchived(id:string){
  if(window.prompt("Irreversible action. Type ANONYMIZE to remove personal identifiers:")!=="ANONYMIZE")return;
  setBusy(true);setNote("");
  try{
   const r=await fetch("/api/studio/people/"+id+"/anonymize",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:"ANONYMIZE"})}),d=await r.json();
   if(!r.ok)throw Error(d.error||"Anonymization failed.");await reviewArchived();
   setNote("Personal details anonymized; financial and booking audit history retained.");
  }catch(e){setNote(e instanceof Error?e.message:"Anonymization failed.");}finally{setBusy(false)}
 }
 async function exportData(){
  setBusy(true);setNote("");try{const response=await fetch("/api/studio/export",{credentials:"same-origin",cache:"no-store"});if(!response.ok){const body=await response.json();throw new Error(body.error||"Export failed")}const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="studiotasker-export-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);setNote("Studio export downloaded.")}
  catch(e){setNote(e instanceof Error?e.message:"Export failed")}finally{setBusy(false)}
 }
 async function logout(){
  try{
   const response=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"});
   if(!response.ok)throw Error("Could not revoke the session or trusted device. Please try again.");
   setUser(null);setStudio(null);setPeople([]);setTrustDevice(false);
   initializedView.current=false;setNote("Signed out. Trusted-device access was removed.");
  }catch(error){setNote(error instanceof Error?error.message:"Sign-out failed.")}
 }

 if(!user)return <section id="main-content" className="rd-workspace-card rd-auth-card">
  <h1 className="rd-auth-heading">{mode==="login"?"Sign in to StudioTasker":mode==="register"?"Create your studio account":"StudioTasker account access"}</h1>
  {pendingPlan&&<div className="rd-purchase-intent"><b>{pendingPlan==="annual"?"ANNUAL PLAN · $406.80/YEAR · SAVE 15%":"MONTHLY PLAN · $39.90/MONTH"}</b><span>{registrationEnabled?"Create your studio account or sign in to continue to subscription checkout.":"You selected this plan. Sign in if you already have an account; new studio signup will be available when account creation is enabled."}</span></div>}
  {note&&<p className="rd-feedback" role="status">{note}</p>}
  <div className="rd-tab-buttons" role="tablist" aria-label="Account actions" onKeyDown={event=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
    const all=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const current=all.indexOf(document.activeElement as HTMLButtonElement);
    const target=event.key==="Home"?0:event.key==="End"?all.length-1:
     event.key==="ArrowRight"?(current+1)%all.length:(current+all.length-1)%all.length;
    if(!all[target])return;
    event.preventDefault();all[target].focus();all[target].click();
   }}>{modes.map(({mode:next,name})=><button key={next} id={"auth-tab-"+next} type="button" role="tab" aria-selected={mode===next}
    aria-controls="auth-form" tabIndex={mode===next?0:-1}
    className={mode===next?"active":""} onClick={()=>{setMode(next);setNote("")}}>{name}</button>)}{registrationEnabled&&
    <button id="auth-tab-register" type="button" role="tab" aria-selected={mode==="register"} aria-controls="auth-form" tabIndex={mode==="register"?0:-1}
     className={mode==="register"?"active":""} onClick={()=>{setMode("register");setPendingPlan(p=>p||"monthly");setNote("")}}>Create studio</button>}</div>
  <form className="rd-form" id="auth-form" role="tabpanel"
   aria-labelledby={mode==="verify"||mode==="reset"?undefined:"auth-tab-"+mode} onSubmit={submitAuth}>
   {["verify","reset"].includes(mode)&&<p className="rd-tiny">{mode==="verify"?"Verify your email to activate your account.":"Choose a new password. Existing sessions will be revoked."}</p>}
   {mode==="register"&&<><label>Studio name<input required minLength={2} maxLength={100} value={form.studioName} onChange={e=>setForm({...form,studioName:e.target.value})}/></label><label>Studio type<select value={form.focus} onChange={e=>setForm({...form,focus:e.target.value})}>{STUDIO_FOCUSES.map(f=><option key={f}>{f}</option>)}</select></label></>}
   {["login","register","forgot","resend"].includes(mode)&&<label>Email<input type="email" autoComplete="username" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>}
   {["login","register","reset"].includes(mode)&&<label>{mode==="login"?"Password":"New password (minimum 12 characters)"}<input type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={mode==="login"?1:12} maxLength={128} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>}
   {mode==="login"&&<label className="rd-trust-device"><input type="checkbox" checked={trustDevice} onChange={e=>setTrustDevice(e.target.checked)}/><span>Trust this device for 30 days (only on your own computer). Uncheck on shared devices; signing out removes this trust.</span></label>}
   {mode==="register"&&<><label>Studio timezone<TimezoneSelect value={form.timezone} onChange={timezone=>setForm(v=>({...v,timezone}))}/></label><label>Subscription plan<select value={pendingPlan||"monthly"} onChange={e=>setPendingPlan(e.target.value as "monthly"|"annual")}><option value="monthly">Monthly · $39.90/month</option><option value="annual">Annual · $406.80/year · save 15%</option></select></label><label className="rd-legal-consent"><input type="checkbox" required checked={registrationLegalAccepted} onChange={e=>setRegistrationLegalAccepted(e.target.checked)}/><span>{LEGAL_ACCEPTANCE_TEXT} <Link href="/legal/terms" target="_blank">Terms of Service</Link> · <Link href="/legal/cancellation" target="_blank">Cancellation & Refund</Link> · <Link href="/legal/dpa" target="_blank">DPA</Link></span></label><p className="rd-tiny">Before account creation, please read the <Link href="/legal/privacy" target="_blank">Privacy Policy</Link> and, where Turkish Law No. 6698 applies, the <Link href="/legal/turkiye-privacy" target="_blank">Türkiye Privacy Notice (KVKK)</Link>. These notices are provided for transparency and are not a request for consent to core service processing.</p></>}
   <button className="rd-primary" disabled={busy||(mode==="register"&&!registrationLegalAccepted)}>{busy?"Please wait…":{login:"Sign in",register:"Create and verify studio",verify:"Verify email",reset:"Reset password",forgot:"Send reset instructions",resend:"Send verification link"}[mode]}</button>
  </form>
  {!registrationEnabled&&<p className="rd-tiny">Studio signup is temporarily unavailable here. Existing customers can still sign in.</p>}
 </section>;

 const canContacts=["owner","manager","receptionist"].includes(user.role),canEdit=["owner","manager"].includes(user.role);
 const prefs:WorkspacePreferences={timezone:settings.timezone,timeFormat:settings.timeFormat,classTerm:settings.classTerm,memberTerm:settings.memberTerm,creditTerm:settings.creditTerm,
  defaultClassDuration:settings.defaultClassDuration,defaultClassCapacity:settings.defaultClassCapacity,defaultRoom:settings.defaultRoom,inactiveDays:settings.inactiveDays,
  lowCreditsThreshold:settings.lowCreditsThreshold,renewalWindowDays:settings.renewalWindowDays,trialFollowupHours:settings.trialFollowupHours,packageReviewHours:settings.packageReviewHours,openSeatsThreshold:settings.openSeatsThreshold,
  spotBookingEnabled:settings.spotBookingEnabled,equipmentLabel:settings.equipmentLabel,defaultSpotCount:settings.defaultSpotCount,defaultClassFormat:settings.defaultClassFormat,
  waiverRequired:settings.waiverRequired,lateCancelRefundCredit:settings.lateCancelRefundCredit,noShowRefundCredit:settings.noShowRefundCredit};
 const nav:[OwnerView,string,typeof LayoutDashboard][]=[
  ["today","Today",LayoutDashboard],["leads","Leads / CRM",Target],["members",settings.memberTerm,Users],["classes",settings.classTerm,CalendarDays],
  ["followups","Follow-ups",CheckCircle2],["insights","Insights",BarChart3],["settings","Settings",Settings2]
 ];
 const visibleNav=user.role==="instructor"?nav.filter(([id])=>["classes","followups"].includes(id)):nav;
 const currentPeople=people.filter(p=>p.kind===(view==="leads"?"lead":"member"));
 const style={"--studio-accent":settings.accentColor} as CSSProperties;

 return <section className="rd-live-shell" style={style}>
  <aside className="rd-live-sidebar">
   <div className="rd-live-brand">{settings.hasLogo?<img src={"/api/studio/logo?v="+logoVersion} alt={settings.name+" logo"}/>:<span className="rd-studio-fallback">{settings.name.slice(0,2).toUpperCase()}</span>}<div><strong>{settings.name}</strong><small>{settings.focus}</small></div></div>
   <div className="rd-powered"><StudioTaskerMark/> powered by <b>StudioTasker</b></div>
   <nav aria-label="Studio workspace">{visibleNav.map(([id,label,Icon])=><button key={id} type="button" aria-current={view===id?"page":undefined} className={view===id?"active":""} onClick={()=>{setView(id);setNote("");if(id==="leads")setPerson(p=>({...p,kind:"lead"}));if(id==="members")setPerson(p=>({...p,kind:"member"}))}}><Icon size={18}/>{label}</button>)}</nav>
   <div className="rd-live-sidebar-bottom"><small>{user.email}</small><span>{user.role}</span><button onClick={()=>void logout()}><LogOut size={16}/> Sign out</button></div>
  </aside>
  <main id="main-content" className="rd-live-main">
   <header className="rd-live-top"><div><p className="rd-eyebrow">YOUR STUDIO WORKSPACE</p><h1>{view==="members"?settings.memberTerm:view==="classes"?settings.classTerm:view==="leads"?"Leads / CRM":view.charAt(0).toUpperCase()+view.slice(1)}</h1></div><div className="rd-live-accent"><span style={{background:settings.accentColor}}/>{settings.memberTerm} · {settings.classTerm} · {settings.creditTerm}</div></header>
   {note&&<p className="rd-feedback" role="status">{note}</p>}

   {view==="leads"||view==="members"?canContacts?<section className="rd-live-section">
    <div className="rd-section-head"><div><h2>{view==="leads"?"Lead pipeline":settings.memberTerm}</h2><p>{view==="leads"?"Track enquiries, trial progress and next actions.":"Your studio's internal member records. Payments remain outside StudioTasker."}</p></div></div>
    <form className="rd-form" onSubmit={searchContacts}>
      <label>Search {view==="leads"?"leads":settings.memberTerm.toLowerCase()}
       <input type="search" maxLength={80} placeholder="Name, email or phone" value={contactSearch} onChange={e=>setContactSearch(e.target.value)}/>
      </label>
      <div className="rd-contact-actions">
       <button type="submit" disabled={contactsLoading}>{contactsLoading?"Searching…":"Search contacts"}</button>
       {appliedContactSearch&&<button type="button" disabled={contactsLoading} onClick={()=>{setContactSearch("");setAppliedContactSearch("");void refreshContacts("").catch(e=>setNote(String(e)))}}>Clear search</button>}
      </div>
    </form>
    <div className="rd-contact-list">{currentPeople.length?currentPeople.map(p=><div key={p.id}><b>{p.full_name}</b><small>{p.kind}{p.lead_stage?" · "+p.lead_stage:""} · {p.email||p.phone}{p.kind==="member"&&p.tags?.length?" · "+p.tags.join(" · "):""}{p.kind==="member"?" · waiver: "+(p.waiver_status||"not_required").replace("_"," "):""}</small><div className="rd-contact-actions"><button disabled={busy} onClick={()=>{setEditing(p.id);setEditForm({name:p.full_name,notes:p.notes||"",stage:p.lead_stage||"New",tags:(p.tags||[]).join(", "),waiverStatus:p.waiver_status||"not_required",relatedContactName:p.related_contact_name||"",relatedContactRole:p.related_contact_role||"",relatedContactEmail:p.related_contact_email||"",relatedContactPhone:p.related_contact_phone||""})}}>Edit</button>{canEdit&&p.kind==="lead"&&<button disabled={busy} onClick={()=>void convertLead(p)}>Convert to member</button>}{canEdit&&<button disabled={busy} onClick={()=>void archivePerson(p)}>Archive</button>}</div>
     {editing===p.id&&<form className="rd-form rd-contact-edit" onSubmit={savePerson}><label>Name<input value={editForm.name} minLength={2} maxLength={80} required onChange={e=>setEditForm({...editForm,name:e.target.value})}/></label>{p.kind==="lead"&&<label>Stage<select value={editForm.stage} onChange={e=>setEditForm({...editForm,stage:e.target.value})}>{["New","Contacted","Trial booked","Trial attended","Won","Lost"].map(v=><option key={v}>{v}</option>)}</select></label>}{p.kind==="member"&&<><label>Tags<input maxLength={240} placeholder="trial, reformer, evening" value={editForm.tags} onChange={e=>setEditForm({...editForm,tags:e.target.value})}/><small>Up to 12 comma-separated operational tags.</small></label><label>Waiver status<select value={editForm.waiverStatus} onChange={e=>setEditForm({...editForm,waiverStatus:e.target.value})}><option value="not_required">Not required</option><option value="pending">Pending</option><option value="signed">Signed</option><option value="expired">Expired</option></select></label><fieldset className="rd-related-contact"><legend>{settings.focus==="Dance"?"Parent / guardian contact":"Related / emergency contact"} <small>optional</small></legend><div className="rd-ops-pair"><label>Name<input maxLength={100} value={editForm.relatedContactName} onChange={e=>setEditForm({...editForm,relatedContactName:e.target.value})}/></label><label>Relationship<input maxLength={40} placeholder={settings.focus==="Dance"?"Parent / guardian":"Partner, parent, guardian"} value={editForm.relatedContactRole} onChange={e=>setEditForm({...editForm,relatedContactRole:e.target.value})}/></label></div><div className="rd-ops-pair"><label>Email<input type="email" maxLength={160} value={editForm.relatedContactEmail} onChange={e=>setEditForm({...editForm,relatedContactEmail:e.target.value})}/></label><label>Phone<input type="tel" maxLength={30} value={editForm.relatedContactPhone} onChange={e=>setEditForm({...editForm,relatedContactPhone:e.target.value})}/></label></div><small>Store only the contact details your studio actually needs.</small></fieldset></>}<label>Notes<textarea rows={3} maxLength={1600} value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})}/></label><div className="rd-contact-actions"><button className="rd-primary" disabled={busy}>Save</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></div></form>}
    </div>):<p className="rd-empty">No matching {view==="leads"?"leads":settings.memberTerm.toLowerCase()} found.</p>}</div>
    {contactPages[view==="leads"?"lead":"member"].hasMore&&<button type="button" disabled={contactsLoading} onClick={()=>void loadMoreContacts(view==="leads"?"lead":"member")}>{contactsLoading?"Loading…":"Load more contacts"}</button>}
    <details className="rd-ops-details"><summary>+ Add {view==="leads"?"lead":singularTerm(settings.memberTerm).toLowerCase()}</summary><form onSubmit={addPerson} className="rd-form rd-add-contact"><label>Name<input required minLength={2} maxLength={80} value={person.name} onChange={e=>setPerson({...person,name:e.target.value,kind:view==="leads"?"lead":"member"})}/></label><div className="rd-ops-pair"><label>Email<input type="email" value={person.email} onChange={e=>setPerson({...person,email:e.target.value})}/></label><label>Phone<input type="tel" value={person.phone} onChange={e=>setPerson({...person,phone:e.target.value})}/></label></div>{view==="members"&&<><label>Operational tags<input maxLength={240} placeholder="trial, reformer, evening" value={person.tags} onChange={e=>setPerson({...person,tags:e.target.value})}/></label><label>Waiver status<select value={person.waiverStatus} onChange={e=>setPerson({...person,waiverStatus:e.target.value})}><option value="not_required">Not required</option><option value="pending">Pending</option><option value="signed">Signed</option><option value="expired">Expired</option></select></label><fieldset className="rd-related-contact"><legend>{settings.focus==="Dance"?"Parent / guardian contact":"Related / emergency contact"} <small>optional</small></legend><div className="rd-ops-pair"><label>Name<input maxLength={100} value={person.relatedContactName} onChange={e=>setPerson({...person,relatedContactName:e.target.value})}/></label><label>Relationship<input maxLength={40} placeholder={settings.focus==="Dance"?"Parent / guardian":"Partner, parent, guardian"} value={person.relatedContactRole} onChange={e=>setPerson({...person,relatedContactRole:e.target.value})}/></label></div><div className="rd-ops-pair"><label>Email<input type="email" maxLength={160} value={person.relatedContactEmail} onChange={e=>setPerson({...person,relatedContactEmail:e.target.value})}/></label><label>Phone<input type="tel" maxLength={30} value={person.relatedContactPhone} onChange={e=>setPerson({...person,relatedContactPhone:e.target.value})}/></label></div></fieldset></>}<label>Notes<textarea rows={3} maxLength={1600} value={person.notes} onChange={e=>setPerson({...person,notes:e.target.value})}/></label><button className="rd-primary" disabled={busy}>Add</button></form></details>
    {view==="members"&&<StudioOperations role={user.role} section="members" preferences={prefs}/>}
   </section>:<p className="rd-feedback">Your role does not have access to studio contacts.</p>:null}

   {view==="today"&&<StudioOperations role={user.role} section="today" preferences={prefs}/>}
   {view==="classes"&&<ClassBasedOperations role={user.role} section="classes" preferences={prefs}/>}
   {view==="followups"&&<StudioOperations role={user.role} section="followups" preferences={prefs}/>}
   {view==="insights"&&<ClassBasedOperations role={user.role} section="insights" preferences={prefs}/>}

   {view==="settings"&&<section className="rd-live-section">
    {user.role==="owner"&&<BillingPanel initialPlan={pendingPlan}/>}
    {user.role==="owner"&&<StaffInvitations/>} 
    <OnboardingPanel role={user.role} onDataChange={()=>void load()}/>
    <div className="rd-customize-head"><div><p className="rd-eyebrow">MAKE STUDIOTASKER YOURS</p><h2>Studio identity & workflow</h2><p>Controlled customization: enough to feel like your studio without creating a fragile one-off software fork.</p></div>
     <div className="rd-brand-preview" style={{borderColor:settings.accentColor}}>{settings.hasLogo?<img src={"/api/studio/logo?v="+logoVersion} alt="Studio logo preview"/>:<span style={{background:settings.accentColor}}>{settings.name.slice(0,2).toUpperCase()}</span>}<div><b>{settings.name||"Your Studio"}</b><small>{settings.memberTerm} · {settings.classTerm} · {settings.creditTerm}</small></div></div></div>
    <form className="rd-settings-grid" onSubmit={saveSettings}>
     <section><h3>Identity</h3><label>Studio name<input required minLength={2} maxLength={100} value={settings.name} onChange={e=>setSettings({...settings,name:e.target.value})}/></label><label>Studio type<select value={settings.focus} onChange={e=>{const focus=e.target.value,preset=studioPreset(focus);setSettings({...settings,focus,...preset})}}>{STUDIO_FOCUSES.map(x=><option key={x}>{x}</option>)}</select><small>Changing the type loads recommended defaults in this form. Save to apply them.</small></label><div className="rd-preset-card"><span>ACTIVE PRESET</span><b>{studioPresetProfile(settings.focus).headline}</b><div>{studioPresetProfile(settings.focus).capabilities.map(x=><small key={x}>✓ {x}</small>)}</div><p>Recommended formats: {studioPresetProfile(settings.focus).recommendedFormats.map(x=>CLASS_FORMATS.find(([value])=>value===x)?.[1]||x).join(" · ")}</p></div><label>Timezone<TimezoneSelect value={settings.timezone} onChange={timezone=>setSettings(v=>({...v,timezone}))}/></label>
      <label>Primary brand color<div className="rd-color-row"><input type="color" value={settings.accentColor} onChange={e=>setSettings({...settings,accentColor:e.target.value.toUpperCase()})}/><input pattern="^#[0-9A-Fa-f]{6}$" maxLength={7} value={settings.accentColor} onChange={e=>setSettings({...settings,accentColor:e.target.value})}/></div></label>
      <label>Studio logo (PNG/JPEG/WebP, max 200 KB)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!canEdit||busy} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadLogo(file);e.currentTarget.value=""}}/></label>{settings.hasLogo&&canEdit&&<button type="button" className="rd-subtle-action" disabled={busy} onClick={()=>void removeLogo()}><Trash2 size={15}/> Remove logo</button>}<label>Studio Privacy Policy URL<input type="url" maxLength={500} placeholder="https://yourstudio.com/privacy" value={settings.privacyPolicyUrl} onChange={e=>setSettings({...settings,privacyPolicyUrl:e.target.value})}/><small>Shown to customers in member-facing booking/privacy notices when applicable.</small></label>
     </section>
     <section><h3>Terminology & display</h3><label>People label<select value={settings.memberTerm} onChange={e=>setSettings({...settings,memberTerm:e.target.value})}>{["Members","Clients","Students","Customers"].map(x=><option key={x}>{x}</option>)}</select></label><label>Class label<select value={settings.classTerm} onChange={e=>setSettings({...settings,classTerm:e.target.value})}>{["Classes","Sessions","Lessons"].map(x=><option key={x}>{x}</option>)}</select></label><label>Credit label<select value={settings.creditTerm} onChange={e=>setSettings({...settings,creditTerm:e.target.value})}>{["Credits","Visits","Sessions"].map(x=><option key={x}>{x}</option>)}</select></label><label>Default landing page<select value={settings.defaultView} onChange={e=>setSettings({...settings,defaultView:e.target.value as OwnerView})}>{["today","leads","members","classes","followups","insights","settings"].map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label><label>Week starts<select value={settings.weekStarts} onChange={e=>setSettings({...settings,weekStarts:e.target.value as "monday"|"sunday"})}><option value="monday">Monday</option><option value="sunday">Sunday</option></select></label><label>Time format<select value={settings.timeFormat} onChange={e=>setSettings({...settings,timeFormat:e.target.value as "24h"|"12h"})}><option value="24h">24-hour</option><option value="12h">12-hour</option></select></label></section>
     <section><h3>{settings.classTerm} defaults</h3><label>Default format<select value={settings.defaultClassFormat} onChange={e=>setSettings({...settings,defaultClassFormat:e.target.value})}>{CLASS_FORMATS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Default duration (minutes)<input type="number" min={15} max={240} value={settings.defaultClassDuration} onChange={e=>setSettings({...settings,defaultClassDuration:Number(e.target.value)})}/></label><label>Default capacity<input type="number" min={1} max={100} value={settings.defaultClassCapacity} onChange={e=>setSettings({...settings,defaultClassCapacity:Number(e.target.value)})}/></label><label>Default room<input minLength={1} maxLength={80} value={settings.defaultRoom} onChange={e=>setSettings({...settings,defaultRoom:e.target.value})}/></label><label className="rd-check"><input type="checkbox" checked={settings.spotBookingEnabled} onChange={e=>setSettings({...settings,spotBookingEnabled:e.target.checked})}/> Enable numbered equipment / spot booking</label>{settings.spotBookingEnabled&&<><label>Equipment / spot label<input minLength={2} maxLength={40} value={settings.equipmentLabel} onChange={e=>setSettings({...settings,equipmentLabel:e.target.value})}/></label><label>Default number of spots<input type="number" min={1} max={100} value={settings.defaultSpotCount} onChange={e=>setSettings({...settings,defaultSpotCount:Number(e.target.value)})}/></label></>}<label className="rd-check"><input type="checkbox" checked={settings.waiverRequired} onChange={e=>setSettings({...settings,waiverRequired:e.target.checked})}/> Track waiver status for members</label><p className="rd-tiny">These become the starting values when staff create a new {singularTerm(settings.classTerm).toLowerCase()}.</p></section>
     <section><h3>StudioTasker Today rules</h3><label>Inactive after (days)<input type="number" min={7} max={90} value={settings.inactiveDays} onChange={e=>setSettings({...settings,inactiveDays:Number(e.target.value)})}/></label><label>Low {settings.creditTerm.toLowerCase()} at or below<input type="number" min={0} max={10} value={settings.lowCreditsThreshold} onChange={e=>setSettings({...settings,lowCreditsThreshold:Number(e.target.value)})}/></label><label>Renewal window (days)<input type="number" min={1} max={60} value={settings.renewalWindowDays} onChange={e=>setSettings({...settings,renewalWindowDays:Number(e.target.value)})}/></label><label>Trial follow-up after (hours)<input type="number" min={1} max={168} value={settings.trialFollowupHours} onChange={e=>setSettings({...settings,trialFollowupHours:Number(e.target.value)})}/></label><label>Package review after (hours)<input type="number" min={1} max={168} value={settings.packageReviewHours} onChange={e=>setSettings({...settings,packageReviewHours:Number(e.target.value)})}/></label><label>Open-seat signal from<input type="number" min={1} max={50} value={settings.openSeatsThreshold} onChange={e=>setSettings({...settings,openSeatsThreshold:Number(e.target.value)})}/></label><label className="rd-check"><input type="checkbox" checked={settings.lateCancelRefundCredit} onChange={e=>setSettings({...settings,lateCancelRefundCredit:e.target.checked})}/> Refund a credit on late cancellation</label><label className="rd-check"><input type="checkbox" checked={settings.noShowRefundCredit} onChange={e=>setSettings({...settings,noShowRefundCredit:e.target.checked})}/> Refund a credit on no-show</label></section>
     {canEdit&&<button className="rd-primary rd-settings-save" disabled={busy}>Save studio customization</button>}
    </form>
    <p className="rd-tiny">Timezone cannot change after classes exist. StudioTasker keeps one product codebase; customization changes this studio's tenant settings, not the software for other customers.</p>
    {user.role==="owner"&&<div className="rd-privacy-actions">
     <button disabled={busy} onClick={()=>void exportData()}><Download size={16}/> Export studio data (JSON)</button>
     <button disabled={busy} onClick={()=>void reviewArchived()}>Review archived contacts</button>
     {archivedRecords.filter(p=>!p.full_name.startsWith("Anonymized person")).map(p=><div key={p.id}><span>{p.full_name}</span>
      <button disabled={busy} onClick={()=>void anonymizeArchived(p.id)}>Anonymize personal data</button></div>)}
     <p className="rd-tiny">Only archived contacts can be anonymized. Identity removal is irreversible; accounting references and encrypted backups follow retention rules.</p>
    </div>}
    {user.role==="owner"&&<StudioClosureRequest/>}
    <ClassBasedOperations role={user.role} section="settings" preferences={prefs}/>
    <StudioOperations role={user.role} section="settings" preferences={prefs}/>
   </section>}
  </main>
 </section>;
}
