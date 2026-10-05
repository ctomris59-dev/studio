"use client";
import {useCallback,useEffect,useState} from "react";

type Step={id:string;label:string;done:boolean};
type Onboarding={steps:Step[];completed:number;total:number;contactCount:number;classCount:number;packageCount:number;basics:boolean;finished:boolean};
type PreviewRow={row:number;kind:string;name:string;email:string;phone:string;ready:boolean;issues:string[];warnings:string[]};
type Preview={mode:string;summary:{rows:number;ready:number;skipped:number;warnings:number};rows:PreviewRow[]};

async function json<T>(path:string,options?:RequestInit):Promise<T>{
 const r=await fetch(path,{credentials:"same-origin",cache:"no-store",...options});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Request failed.");return data as T;
}
export function OnboardingPanel({role,onDataChange}:{role:string;onDataChange:()=>void}){
 const canEdit=["owner","manager"].includes(role);
 const [state,setState]=useState<Onboarding|null>(null),[busy,setBusy]=useState(false),[note,setNote]=useState("");
 const [csv,setCsv]=useState(""),[filename,setFilename]=useState("studio-import.csv"),[preview,setPreview]=useState<Preview|null>(null);
 const load=useCallback(async()=>setState(await json<Onboarding>("/api/studio/onboarding")),[]);
 useEffect(()=>{void load().catch(e=>setNote(e instanceof Error?e.message:"Could not load onboarding."))},[load]);
 async function action(operation:"skip_import"|"complete_setup"){
  setBusy(true);setNote("");
  try{
   const next=await json<Onboarding>("/api/studio/onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation})});
   setState(next);onDataChange();setNote(operation==="complete_setup"?"Setup complete. StudioTasker Today is ready.":"Contact import skipped for now.");
  }catch(e){setNote(e instanceof Error?e.message:"Onboarding action failed.")}finally{setBusy(false)}
 }
 async function previewCsv(file:File){
  setBusy(true);setNote("");setPreview(null);
  try{
   if(file.size>512000)throw Error("CSV must be 500 KB or smaller.");
   const body=await file.text(),safe=file.name.replace(/[^A-Za-z0-9._ -]/g,"_").slice(0,120)||"studio-import.csv";
   setCsv(body);setFilename(safe);
   const response=await fetch("/api/studio/import/csv?mode=preview",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"text/csv","X-StudioTasker-Filename":safe},body});
   const data=await response.json();if(!response.ok)throw Error(data.error||"CSV preview failed.");setPreview(data);setNote("Preview ready. Nothing has been imported yet.");
  }catch(e){setNote(e instanceof Error?e.message:"CSV preview failed.")}finally{setBusy(false)}
 }
 async function commitCsv(){
  if(!csv||!preview?.summary.ready)return;setBusy(true);setNote("");
  try{
   const response=await fetch("/api/studio/import/csv?mode=commit",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"text/csv","X-StudioTasker-Filename":filename},body:csv});
   const data=await response.json();if(!response.ok)throw Error(data.error||"CSV import failed.");
   setNote(data.summary.imported+" contacts imported; "+data.summary.skipped+" skipped. Imported class credits are recorded as studio migration entitlements, not payments.");
   setCsv("");setPreview(null);await load();onDataChange();
  }catch(e){setNote(e instanceof Error?e.message:"CSV import failed.")}finally{setBusy(false)}
 }
 function template(){
  const content="name,email,phone,type,credits,expiry_date,plan,package_status,member_status,lead_stage,notes\nJane Example,jane@example.com,+441234567890,member,8,2026-12-31,10 Class Pack,confirmed,active,,Imported from previous system\nSam Lead,sam@example.com,,lead,,,,,,Trial attended,Follow up this week\n";
  const blob=new Blob([content],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="studiotasker-import-template.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 }
 return <section className="rd-onboarding" aria-labelledby="quick-start-title">
  <div className="rd-onboarding-head"><div><p className="rd-eyebrow">SELF-SERVICE STUDIO SETUP</p><h2 id="quick-start-title">5-step quick start</h2>
   <p>Get a single-location studio from account to usable operations workspace without member-facing setup or payment integration.</p></div>
   <span>{state?.completed||0}/{state?.total||5} complete</span></div>
  {note&&<p className="rd-feedback" role="status">{note}</p>}
  <div className="rd-onboarding-steps">{state?.steps.map((step,index)=><div key={step.id} className={step.done?"done":""}><span>{step.done?"✓":String(index+1).padStart(2,"0")}</span><b>{step.label}</b></div>)}</div>
  {canEdit&&<div className="rd-onboarding-tools">
   <details className="rd-ops-details"><summary>Import members & leads from CSV</summary><div className="rd-importer">
    <p>Preview first. Existing emails/phones and invalid rows are skipped. Package status means studio-confirmed entitlement only; StudioTasker does not import or verify payment methods.</p>
    <div className="rd-contact-actions"><button type="button" onClick={template}>Download CSV template</button><label className="rd-file-button">Choose CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void previewCsv(f)}}/></label></div>
    {preview&&<div className="rd-import-preview"><strong>{preview.summary.ready} ready · {preview.summary.skipped} skipped · {preview.summary.warnings} warnings</strong>
     <div>{preview.rows.slice(0,8).map(row=><p key={row.row} className={row.ready?"ready":"skip"}><b>Row {row.row}: {row.name||"Unnamed"}</b> · {row.kind}{row.issues.length>0&&<span> — {row.issues.join(" ")}</span>}{row.warnings.length>0&&<em> — {row.warnings.join(" ")}</em>}</p>)}</div>
     <button className="rd-primary" type="button" disabled={busy||preview.summary.ready<1} onClick={()=>void commitCsv()}>Import {preview.summary.ready} valid contacts</button>
    </div>}
   </div></details>
   {state&&!state.steps.find(x=>x.id==="contacts")?.done&&<button type="button" className="rd-subtle-action" disabled={busy} onClick={()=>void action("skip_import")}>Skip migration for now</button>}
   {state&&!state.finished&&<button type="button" className="rd-primary" disabled={busy||!state.basics} onClick={()=>void action("complete_setup")}>Finish setup</button>}
  </div>}
  <p className="rd-tiny">The five-step flow is a setup target, not a guaranteed completion time. Domain, account email, StudioTasker subscription billing and legal launch checks remain separate production tasks.</p>
 </section>;
}
