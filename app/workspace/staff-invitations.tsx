"use client";
import {useEffect,useState,type FormEvent} from "react";
type StaffAccount={id:string;email:string;role:string;disabled_at:string|null};
type Invite={id:string;email:string;role:string;created_at:string;expires_at:string;accepted_at:string|null;revoked_at:string|null};
export function StaffInvitations(){
 const [email,setEmail]=useState(""),[role,setRole]=useState("instructor");
 const [accounts,setAccounts]=useState<StaffAccount[]>([]),[items,setItems]=useState<Invite[]>([]),[busy,setBusy]=useState(false),[status,setStatus]=useState("");
 async function refresh(){
  const r=await fetch("/api/studio/invitations",{credentials:"same-origin",cache:"no-store"});
  const data=await r.json();if(!r.ok)throw Error(data.error||"Unable to load invitations.");
  setItems(data.invitations||[]);
  const staff=await fetch("/api/studio/staff-access",{credentials:"same-origin",cache:"no-store"});
  if(staff.ok)setAccounts((await staff.json()).staff||[]);
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
 async function revoke(account:StaffAccount){
  if(!window.confirm("Disable "+account.email+" and revoke all active sessions?"))return;
  setBusy(true);
  try{
   const r=await fetch("/api/studio/staff-access",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:account.id,confirm:"REVOKE"})});
   if(!r.ok)throw Error((await r.json()).error||"Could not revoke access.");
   setStatus("Access revoked for "+account.email);await refresh();
  }catch(e){setStatus(e instanceof Error?e.message:"Access revocation failed.");}
  finally{setBusy(false)}
 }
 async function restore(account:StaffAccount){
  if(!window.confirm("Restore login access for "+account.email+"? Previous sessions remain invalidated."))return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/studio/staff-access",{method:"PATCH",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:account.id,confirm:"RESTORE"})});
   const data=await res.json();if(!res.ok)throw Error(data.error||"Unable to restore access.");
   setStatus("Access restored for "+account.email+". A fresh sign-in is required.");await refresh();
  }catch(e){setStatus(e instanceof Error?e.message:"Access restoration failed.");}
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
  {accounts.length>0&&<section><h4>Staff login access</h4>
   {accounts.map(a=><p key={a.id}>{a.email} · {a.role} · {a.disabled_at?"Access revoked":"Active"}
    {a.disabled_at
     ? <button type="button" disabled={busy} onClick={()=>void restore(a)} style={{marginLeft:12}}>Restore access</button>
     : <button type="button" disabled={busy} onClick={()=>void revoke(a)} style={{marginLeft:12}}>Revoke access</button>}</p>)}
  </section>}
  {items.length>0&&<div><h4>Recent invitations</h4>
   {items.map(item=><p key={item.id}>{item.email} · {item.role} · {item.accepted_at?"Accepted":item.revoked_at?"Revoked":new Date(item.expires_at)<new Date()?"Expired":"Pending"}</p>)}
  </div>}
  <p className="rd-tiny">Invitations expire after 48 hours. Existing accounts are not currently eligible for multi-studio invitations.</p>
 </div>;
}
