"use client";
import {useEffect,useState,type FormEvent} from "react";
import {StudioOperations} from "./studio-operations";
import {OnboardingPanel} from "./onboarding-panel";

type User={id:string;email:string;role:string};
type Studio={id:string;name:string};
type Person={id:string;kind:"lead"|"member";full_name:string;email:string;phone:string;
 created_at:string;lead_stage:string|null;notes:string;member_status:string|null;};
type AuthMode="login"|"register"|"forgot"|"reset"|"verify";
const modes:{mode:AuthMode;name:string}[]=[{mode:"login",name:"Sign in"},{mode:"forgot",name:"Forgot password"}];
export function WorkspaceClient({registrationEnabled}:{registrationEnabled:boolean}){
 const [user,setUser]=useState<User|null>(null);
 const [studio,setStudio]=useState<Studio|null>(null);
 const [people,setPeople]=useState<Person[]>([]);
 const [mode,setMode]=useState<AuthMode>("login"),[token,setToken]=useState("");
 const [busy,setBusy]=useState(false),[note,setNote]=useState("");
 const [form,setForm]=useState({email:"",password:"",studioName:"",focus:"Pilates",timezone:"UTC"});
 const [person,setPerson]=useState({kind:"lead",name:"",email:"",phone:""});
 const [editing,setEditing]=useState<string|null>(null);
 const [editForm,setEditForm]=useState({name:"",notes:"",stage:"New"});
 const [settings,setSettings]=useState({name:"",focus:"Pilates",timezone:"UTC"});
 const [settingsOpen,setSettingsOpen]=useState(false);
 async function load(){
  const res=await fetch("/api/auth/me",{credentials:"same-origin",cache:"no-store"});
  if(!res.ok){setUser(null);setStudio(null);setPeople([]);return;}
  const body=await res.json();
  setUser(body.user);setStudio(body.studio);
  if(["owner","manager","receptionist"].includes(body.user.role)){
   const response=await fetch("/api/studio/settings",{credentials:"same-origin",cache:"no-store"});
   if(response.ok){const config=await response.json();setSettings(config.studio)}
  }
  if(["owner","manager","receptionist"].includes(body.user.role)){
   const list=await fetch("/api/studio/people",{credentials:"same-origin",cache:"no-store"});
   if(list.ok){const data=await list.json();setPeople(data.records||[])}
  }else setPeople([]);
 }
 useEffect(()=>{
  const detected=Intl.DateTimeFormat().resolvedOptions().timeZone;
  if(detected)setForm(prev=>({...prev,timezone:detected}));
  const qs=new URLSearchParams(window.location.hash.replace(/^#/,""));
  if(window.location.hash)window.history.replaceState(null,"",window.location.pathname);
  for(const name of ["verify","reset"] as const){
   const found=qs.get(name);
   if(found){setMode(name);setToken(found);break;}
  }
  void load().catch(()=>setNote("Could not check your workspace session."));
 },[]);
 async function submitAuth(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNote("");
  try{
   const target={
    login:"/api/auth/login",register:"/api/auth/register",
    verify:"/api/auth/verify",reset:"/api/auth/password/reset",
    forgot:"/api/auth/password/forgot"
   }[mode];
   const payload=mode==="verify"?{token}:
    mode==="reset"?{token,password:form.password}:
    mode==="forgot"?{email:form.email}:form;
   const res=await fetch(target,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(payload)});
   const body=await res.json();
   if(!res.ok){setNote(body.error||"Unable to complete your request.");return;}
   setForm(prev=>({...prev,password:""}));
   if(mode==="login"){await load();setNote("Signed in successfully.");}
   else{
    setNote(body.notice||"Request accepted.");
    if(["verify","reset"].includes(mode)){
     setMode("login");setToken("");window.history.replaceState(null,"","/workspace");
    }
    if(mode==="register")setMode("login");
   }
  }catch{setNote("Request failed. Check server and database configuration.")}
  finally{setBusy(false)}
 }
 async function addPerson(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNote("");
  try{
   const res=await fetch("/api/studio/people",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(person)});
   const body=await res.json();
   if(!res.ok){setNote(body.error||"Unable to create contact.");return;}
   setPerson({kind:person.kind,name:"",email:"",phone:""});await load();setNote("Contact saved only to your studio.");
  }catch{setNote("Unable to save contact.")}
  finally{setBusy(false)}
 }
 async function savePerson(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!editing)return;
  setBusy(true);setNote("");
  try{
   const current=people.find(x=>x.id===editing);
   const payload=current?.kind==="lead"?{name:editForm.name,notes:editForm.notes,stage:editForm.stage}:{name:editForm.name,notes:editForm.notes};
   const res=await fetch("/api/studio/people/"+editing,{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const body=await res.json();if(!res.ok){setNote(body.error||"Unable to update contact.");return}
   setEditing(null);await load();setNote("Contact updated in PostgreSQL.");
  }catch{setNote("Update failed.")}
  finally{setBusy(false)}
 }
 async function archivePerson(p:Person){
  if(!window.confirm("Archive "+p.full_name+"? This hides the contact from active work, but does not permanently erase data."))return;
  setBusy(true);setNote("");
  try{
   const res=await fetch("/api/studio/people/"+p.id,{method:"DELETE",credentials:"same-origin"});
   const body=await res.json();if(!res.ok){setNote(body.error||"Unable to archive.");return;}
   setEditing(null);await load();setNote(body.notice||"Contact archived.");
  }catch{setNote("Archiving failed.")}
  finally{setBusy(false)}
 }
 async function exportData(){
  setBusy(true);setNote("");
  try{
   const response=await fetch("/api/studio/export",{credentials:"same-origin",cache:"no-store"});
   if(!response.ok){const body=await response.json();throw new Error(body.error||"Export failed")}
   const blob=await response.blob();const url=URL.createObjectURL(blob);
   const link=document.createElement("a");link.href=url;
   link.download="studiotasker-export-"+new Date().toISOString().slice(0,10)+".json";
   document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
   setNote("Studio export downloaded. Keep this file private and encrypted.");
  }catch(e){setNote(e instanceof Error?e.message:"Export failed")}
  finally{setBusy(false)}
 }
 async function logout(){
  await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"});
  setUser(null);setStudio(null);setPeople([]);setNote("Signed out.");
 }
 return <section className="rd-workspace-card">
  {note&&<p className="rd-feedback" role="status">{note}</p>}
  {!user?<><div className="rd-tab-buttons">
    {modes.map(({mode:next,name})=><button key={next} type="button" className={mode===next?"active":""} onClick={()=>{setMode(next);setNote("");}}>{name}</button>)}
    {registrationEnabled&&<button type="button" className={mode==="register"?"active":""} onClick={()=>setMode("register")}>Create development studio</button>}
   </div>
   <form className="rd-form" onSubmit={submitAuth}>
    {["verify","reset"].includes(mode)&&<p className="rd-tiny">
     {mode==="verify"?"Verify your email to activate your account.":"Choose a new password. Existing sessions will be revoked."}
    </p>}
    {mode==="register"&&<><label>Studio name<input required minLength={2} maxLength={100} value={form.studioName} onChange={e=>setForm({...form,studioName:e.target.value})}/></label>
     <label>Studio type<select value={form.focus} onChange={e=>setForm({...form,focus:e.target.value})}>{["Pilates","Yoga","Barre","Dance","Boutique fitness","Gym"].map(f=><option key={f}>{f}</option>)}</select></label></>}
    {["login","register","forgot"].includes(mode)&&<label>Email<input type="email" autoComplete="username" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>}
    {["login","register","reset"].includes(mode)&&<label>{mode==="login"?"Password":"New password (minimum 12 characters)"}<input type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={mode==="login"?1:12} maxLength={128} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>}
    {mode==="register"&&<label>Studio timezone (IANA)<input required maxLength={80} value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})} placeholder="Europe/London"/></label>}
    {mode==="register"&&<p className="rd-tiny">You must verify your email before signing in. Email delivery and billing must be configured before public registration.</p>}
    <button className="rd-primary" disabled={busy} type="submit">{busy?"Please wait…":{
     login:"Sign in",register:"Create and verify studio",verify:"Verify email",reset:"Reset password",forgot:"Send reset instructions"
    }[mode]}</button>
   </form>
   {!registrationEnabled&&<p className="rd-tiny">Public studio registration is disabled while the backend is in development.</p>}
  </>:<>
   <div className="rd-account-head"><div><h2>{studio?.name}</h2><p>Signed in as {user.email} · {user.role}</p></div><button type="button" onClick={()=>void logout()}>Sign out</button></div>
   {["owner","manager","receptionist"].includes(user.role)?<>
    <OnboardingPanel role={user.role} onDataChange={()=>void load()}/>
    <div className="rd-onboard" aria-label="Studio settings">
     <strong>Studio profile & public booking controls</strong>
     <p>Keep your studio identity, timezone and public member access in one place.</p>
     <button type="button" onClick={()=>setSettingsOpen(o=>!o)} aria-expanded={settingsOpen}>Edit studio settings</button>
     
     {settingsOpen&&<form className="rd-form rd-settings-form" onSubmit={async event=>{event.preventDefault();setBusy(true);try{const response=await fetch("/api/studio/settings",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:settings.name,focus:settings.focus,timezone:settings.timezone})});const data=await response.json();if(!response.ok)throw Error(data.error||"Save failed");setStudio(v=>v?{...v,name:data.studio.name}:v);setSettings(data.studio);setNote("Studio settings saved.");setSettingsOpen(false)}catch(e){setNote(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}}}>
      <label>Studio name<input required minLength={2} maxLength={100} value={settings.name} onChange={e=>setSettings({...settings,name:e.target.value})}/></label>
      <label>Studio type<select value={settings.focus} onChange={e=>setSettings({...settings,focus:e.target.value})}>{["Pilates","Yoga","Barre","Dance","Boutique fitness","Gym"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>IANA timezone<input required maxLength={80} value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})} placeholder="Europe/London"/></label>
      
      <p className="rd-tiny">Set your actual studio timezone before scheduling; existing class times are never silently reinterpreted.</p>
      <button className="rd-primary" type="submit" disabled={busy}>Save studio settings</button>
     </form>}
    </div>
    <h3>Studio contacts</h3><p className="rd-tiny">Server-backed records; every entry belongs to your verified studio. Real customer data must not be used yet.</p>
    <div className="rd-contact-list">{people.length?people.map(p=><div key={p.id}>
     <b>{p.full_name}</b><small>{p.kind} · {p.email||p.phone}</small>
     <div className="rd-contact-actions"><button disabled={busy} type="button" onClick={()=>{
      setEditing(p.id);setEditForm({name:p.full_name,notes:p.notes||"",stage:p.lead_stage||"New"});
     }}>Edit</button>
     {["owner","manager"].includes(user.role)&&<button disabled={busy} type="button" onClick={()=>void archivePerson(p)}>Archive</button>}</div>
     {editing===p.id&&<form className="rd-form rd-contact-edit" onSubmit={savePerson}>
      <label>Name<input value={editForm.name} minLength={2} maxLength={80} required onChange={e=>setEditForm({...editForm,name:e.target.value})}/></label>
      {p.kind==="lead"&&<label>Stage<select value={editForm.stage} onChange={e=>setEditForm({...editForm,stage:e.target.value})}>{["New","Contacted","Trial booked","Trial attended","Won","Lost"].map(v=><option key={v}>{v}</option>)}</select></label>}
      <label>Notes (avoid sensitive health data)<textarea rows={3} maxLength={1600} value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})}/></label>
      <div className="rd-contact-actions"><button className="rd-primary" disabled={busy}>Save contact</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></div>
     </form>}
    </div>):<p>No contacts yet.</p>}</div>
    <h3>New contact</h3><form onSubmit={addPerson} className="rd-form">
     <label>Contact type<select value={person.kind} onChange={e=>setPerson({...person,kind:e.target.value})}><option value="lead">Lead</option><option value="member">Member (pending)</option></select></label>
     <label>Name<input required minLength={2} maxLength={80} value={person.name} onChange={e=>setPerson({...person,name:e.target.value})}/></label>
     <label>Email (or use phone)<input type="email" value={person.email} onChange={e=>setPerson({...person,email:e.target.value})}/></label>
     <label>Phone (or use email)<input type="tel" value={person.phone} onChange={e=>setPerson({...person,phone:e.target.value})}/></label>
     <button type="submit" className="rd-primary" disabled={busy}>Add contact</button>
    </form>
    {user.role==="owner"&&<div className="rd-privacy-actions">
     <button disabled={busy} type="button" onClick={()=>void exportData()}>Export studio data (JSON)</button>
     <p className="rd-tiny">Export includes sensitive studio records. Save securely; archiving is not permanent erasure.</p>
    </div>}
    <StudioOperations role={user.role}/>
   </>:<p className="rd-feedback">Your staff role does not have access to studio contacts.</p>}
  </>}
 </section>;
}
