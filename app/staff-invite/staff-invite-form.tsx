"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
export function StaffInviteForm(){
 const [token,setToken]=useState(""),[studio,setStudio]=useState(""),[password,setPassword]=useState("");
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const parts=new URLSearchParams(window.location.hash.slice(1));
  setToken(parts.get("token")||"");setStudio(parts.get("studio")||"");
 },[]);
 async function submit(event:FormEvent){
  event.preventDefault();if(!token||!studio){setMessage("Invitation link missing or invalid.");return}
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/auth/staff-invite/accept",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,studio,password})});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Could not accept invitation.");
   window.location.replace("/workspace");
  }catch(error){setMessage(error instanceof Error?error.message:"Invitation failed.")}
  finally{setBusy(false)}
 }
 return <main style={{maxWidth:520,margin:"9vh auto",padding:24}}>
  <h1>Join your studio</h1>
  <p>Create a private staff login with a password of at least 12 characters. This invitation is valid for 48 hours and can only be used once.</p>
  <form onSubmit={submit}>
   <label>Set password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button type="submit" disabled={busy||!token||!studio}>{busy?"Creating account…":"Accept staff invitation"}</button>
  </form>
  {message&&<p role="alert">{message}</p>}
  <p><Link href="/workspace">Already have an account? Sign in</Link></p>
 </main>;
}
