"use client";
import {useEffect,useState,type FormEvent} from "react";
type User={id:string;email:string;role:string};
type Studio={id:string;name:string};
type Person={id:string;kind:"lead"|"member";full_name:string;email:string;phone:string;created_at:string};
export function WorkspaceClient({registrationEnabled}:{registrationEnabled:boolean}){
 const [user,setUser]=useState<User|null>(null);
 const [studio,setStudio]=useState<Studio|null>(null);
 const [people,setPeople]=useState<Person[]>([]);
 const [mode,setMode]=useState<"login"|"register">("login");
 const [busy,setBusy]=useState(false);
 const [note,setNote]=useState("");
 const [form,setForm]=useState({email:"",password:"",studioName:"",focus:"Pilates"});
 const [person,setPerson]=useState({kind:"lead",name:"",email:"",phone:""});
 async function load(){
  const res=await fetch("/api/auth/me",{credentials:"same-origin",cache:"no-store"});
  if(!res.ok){setUser(null);setStudio(null);setPeople([]);return;}
  const body=await res.json();
  setUser(body.user);setStudio(body.studio);
  const list=await fetch("/api/studio/people",{credentials:"same-origin",cache:"no-store"});
  if(list.ok){const data=await list.json();setPeople(data.records||[])}
 }
 useEffect(()=>{void load().catch(()=>setNote("Could not check the workspace session."))},[]);
 async function submitAuth(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNote("");
  try{
   const url=mode==="login"?"/api/auth/login":"/api/auth/register";
   const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(form)});
   const body=await res.json();
   if(!res.ok){setNote(body.error||"Unable to authenticate.");return;}
   setForm(v=>({...v,password:""}));await load();setNote("Secure studio session established.");
  }catch{setNote("Request failed. Check the local database connection.")}
  finally{setBusy(false)}
 }
 async function addPerson(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNote("");
  try{
   const res=await fetch("/api/studio/people",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(person)});
   const body=await res.json();
   if(!res.ok){setNote(body.error||"Unable to create contact.");return;}
   setPerson({kind:person.kind,name:"",email:"",phone:""});await load();setNote("Contact saved only to the verified studio.");
  }catch{setNote("Unable to save contact.")}
  finally{setBusy(false)}
 }
 async function logout(){
  await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"});
  setUser(null);setStudio(null);setPeople([]);setNote("Signed out.");
 }
 return <section className="rd-workspace-card">
  {note&&<p className="rd-feedback" role="status">{note}</p>}
  {!user?<><div className="rd-tab-buttons"><button type="button" className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Sign in</button>{registrationEnabled&&<button type="button" className={mode==="register"?"active":""} onClick={()=>setMode("register")}>Create local studio</button>}</div>
    <form className="rd-form" onSubmit={submitAuth}>
     {mode==="register"&&<><label>Studio name<input required minLength={2} maxLength={100} value={form.studioName} onChange={e=>setForm({...form,studioName:e.target.value})}/></label>
       <label>Studio type<select value={form.focus} onChange={e=>setForm({...form,focus:e.target.value})}>{["Pilates","Yoga","Boutique fitness","Gym"].map(f=><option key={f}>{f}</option>)}</select></label></>}
     <label>Email<input type="email" autoComplete="username" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
     <label>Password<input type="password" autoComplete={mode==="register"?"new-password":"current-password"} minLength={mode==="register"?12:1} maxLength={128} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
     {mode==="register"&&<p className="rd-tiny">Development signup only. No verified email, invitations or billing yet. Do not enter real client data.</p>}
     <button className="rd-primary" disabled={busy} type="submit">{busy?"Please wait…":mode==="login"?"Sign in":"Create development studio"}</button>
    </form>
    {!registrationEnabled&&<p className="rd-tiny">Owner registration is locked by default. Enable only in a trusted local environment.</p>}
   </>:<>
    <div className="rd-account-head"><div><h2>{studio?.name}</h2><p>Signed in as {user.email} · {user.role}</p></div><button type="button" onClick={()=>void logout()}>Sign out</button></div>
    {["owner","manager","receptionist"].includes(user.role)?<>
      <h3>Studio contacts</h3><p className="rd-tiny">Server-backed contacts in this studio only. The public /demo remains sample-only.</p>
      <div className="rd-contact-list">{people.length?people.map(p=><div key={p.id}><b>{p.full_name}</b><small>{p.kind} · {p.email||p.phone}</small></div>):<p>No contacts yet.</p>}</div>
      <h3>New contact</h3><form onSubmit={addPerson} className="rd-form">
       <label>Contact type<select value={person.kind} onChange={e=>setPerson({...person,kind:e.target.value})}><option value="lead">Lead</option><option value="member">Member (pending)</option></select></label>
       <label>Name<input required minLength={2} maxLength={80} value={person.name} onChange={e=>setPerson({...person,name:e.target.value})}/></label>
       <label>Email (or use phone)<input type="email" value={person.email} onChange={e=>setPerson({...person,email:e.target.value})}/></label>
       <label>Phone (or use email)<input type="tel" value={person.phone} onChange={e=>setPerson({...person,phone:e.target.value})}/></label>
       <button type="submit" className="rd-primary" disabled={busy}>Add secure contact</button>
      </form>
     </>:<p className="rd-feedback">Your role does not grant access to studio contacts.</p>}
   </>}
 </section>;
}
