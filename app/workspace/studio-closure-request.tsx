"use client";
import {useEffect,useState,type FormEvent} from "react";
export function StudioClosureRequest(){
 const [confirmation,setConfirmation]=useState("");
 const [exported,setExported]=useState(false);
 const [requested,setRequested]=useState<string|null>(null);
 const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  void fetch("/api/studio/privacy/closure",{credentials:"same-origin",cache:"no-store"})
   .then(r=>r.ok?r.json():null).then(data=>{if(active&&data?.requestedAt)setRequested(data.status||"pending_verification")})
   .catch(()=>{});
  return ()=>{active=false};
 },[]);
 async function submit(event:FormEvent){
  event.preventDefault();if(!exported||confirmation!=="CLOSE MY STUDIO")return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/studio/privacy/closure",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({confirmation,exportAcknowledged:exported})
   });
   const result=await res.json();
   if(!res.ok)throw Error(result.error||"Unable to record request.");
   setRequested(result.status);setStatus(result.notice);
  }catch(e){setStatus(e instanceof Error?e.message:"Unable to record request.");}
  finally{setBusy(false)}
 }
 async function withdraw(){
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/studio/privacy/closure",{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"withdraw",confirmation:"WITHDRAW CLOSURE REQUEST"})});
   const result=await res.json();
   if(!res.ok)throw Error(result.error||"Unable to withdraw request.");
   setRequested(null);setConfirmation("");setExported(false);setStatus(result.notice);
  }catch(e){setStatus(e instanceof Error?e.message:"Unable to withdraw request.")}
  finally{setBusy(false)}
 }
 return <section className="rd-ops-section" aria-labelledby="studio-closure-heading">
  <h3 id="studio-closure-heading">Studio closure and personal-data deletion request</h3>
  <p>Export everything you need first. Requesting closure does not cancel Paddle billing or immediately erase your data.
  We verify the studio owner, billing termination, legally required records and backup retention before erasure.</p>
  {requested?<div><p role="status">Closure request recorded: <strong>{requested.replaceAll("_"," ")}</strong>. Contact support@studiotasker.com for verification and billing follow-up.</p><button type="button" disabled={busy} onClick={()=>void withdraw()}>Withdraw closure request</button></div>:
  <form onSubmit={submit} className="rd-form">
   <label><input type="checkbox" checked={exported} onChange={e=>setExported(e.target.checked)}/>
    I have exported the records my business must retain.</label>
   <label>Type CLOSE MY STUDIO to submit a closure request.
    <input type="text" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/>
   </label>
   <button type="submit" disabled={busy||!exported||confirmation!=="CLOSE MY STUDIO"}>
    {busy?"Recording request…":"Request studio closure review"}
   </button>
  </form>}
  {status&&<p role="status">{status}</p>}
 </section>;
}
