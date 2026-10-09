"use client";
import {useEffect,useState,type FormEvent} from "react";
type Invite={id:string;email:string;role:string;created_at:string;expires_at:string;accepted_at:string|null};
export function StaffInvitations(){
 const [email,setEmail]=useState(""),[role,setRole]=useState("instructor");
 const [items,setItems]=useState<Invite[]>([]),[busy,setBusy]=useState(false),[status,setStatus]=useState("");
 async function refresh(){
  const r=await fetch("/api/studio/invitations",{credentials:"same-origin",cache:"no-store"});
  const data=await r.json();if(!r.ok)throw Error(data.error||"Unable to load invitations.");
  setItems(data.invitations||[]);
 }
 useEffect(()=>{void refresh().catch(()=>{})},[]);
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setStatus("");
  try{
   const r=await fetch("/api/studio/invitations",{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({email,role})});
   const data=await r.json();if(!r.ok)throw Error(data.error||"Could not send invitation.");
   setEmail("");setStatus(data.notice||"Invitation queued.");await refresh();
  }catch(error){setStatus(error instanceof Error?error.message:"Unable to invite staff.")}
  finally{setBusy(false)}
 }
 return <div className="rd-ops-section">
  <div className="rd-section-head"><div><h3>Invite staff to StudioTasker</h3>
   <p>Send a one-time account invitation to a new email. Studio roster entries are separate from login permissions.</p></div></div>
  <form className="rd-form" onSubmit={submit}>
   <label>Staff email<input required type="email" maxLength={160} value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Workspace role<select value={role} onChange={e=>setRole(e.target.value)}>
    <option value="instructor">Instructor</option><option value="receptionist">Receptionist</option><option value="manager">Manager</option>
   </select></label>
   <button className="rd-primary" disabled={busy}>{busy?"Queuing…":"Email staff invitation"}</button>
  </form>
  {status&&<p role="status" className="rd-feedback">{status}</p>}
  {items.length>0&&<div><h4>Recent invitations</h4>
   {items.map(item=><p key={item.id}>{item.email} · {item.role} · {item.accepted_at?"Accepted":new Date(item.expires_at)<new Date()?"Expired":"Pending"}</p>)}
  </div>}
  <p className="rd-tiny">Invitations expire after 48 hours. Existing accounts are not currently eligible for multi-studio invitations.</p>
 </div>;
}
