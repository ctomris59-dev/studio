"use client";
import {useState} from "react";
import {ArrowRight,CalendarDays,CheckCircle2,Clock3,Users} from "lucide-react";

const tabs=[
 {id:"today",label:"Today",icon:Clock3,title:"Know what needs attention.",text:"Trials, renewals, inactive members, package gaps and open seats surface with the reason they appeared.",metrics:[["PRIORITIES","05"],["HIGH","02"],["OPEN SEATS","06"]],rows:[["Trial needs a next step","Mia attended yesterday"],["Renewal opportunity","Oliver has 1 credit left"],["Member may be drifting","Emma has not visited in 24 days"]]},
 {id:"members",label:"Members",icon:Users,title:"Keep member context together.",text:"Member details, package entitlements, status and attendance history stay in one clear studio record.",metrics:[["ACTIVE","118"],["TRIALS","09"],["FOLLOW-UPS","05"]],rows:[["Mia R.","Trial · attended yesterday"],["Oliver K.","Active · 1 credit remaining"],["Emma L.","Active · last visit 24 days ago"]]},
 {id:"classes",label:"Classes",icon:CalendarDays,title:"Run the class day clearly.",text:"See coach, room, capacity, bookings and attendance without rebuilding the day in a spreadsheet.",metrics:[["CLASSES","08"],["BOOKINGS","42"],["CAPACITY","84%"]],rows:[["07:30 · Morning Flow","6 / 8 booked"],["09:00 · Reformer Foundations","8 / 8 booked"],["17:30 · Evening Reset","7 / 8 booked"]]},
 {id:"followups",label:"Follow-ups",icon:CheckCircle2,title:"Turn signals into staff actions.",text:"Create clear follow-up tasks from trials, renewals and inactivity. StudioTasker explains the signal; your team decides what happens next.",metrics:[["OPEN","05"],["DUE TODAY","03"],["DONE","12"]],rows:[["Mia R.","Follow up after trial"],["Oliver K.","Renewal reminder"],["Emma L.","Check in after inactivity"]]}
];

export default function ProductTourTabs(){
 const [active,setActive]=useState("today");
 const tab=tabs.find(x=>x.id===active)||tabs[0];
 const Icon=tab.icon;
 return <div className="ed-tour-tabs">
  <div className="ed-tour-tablist" role="tablist" aria-label="StudioTasker product areas">
   {tabs.map(item=>{const I=item.icon;return <button key={item.id} type="button" role="tab" aria-selected={active===item.id} className={active===item.id?"active":""} onClick={()=>setActive(item.id)}><I size={17}/>{item.label}</button>})}
  </div>
  <div className="ed-tour-panel" role="tabpanel">
   <div className="ed-tour-copy"><span className="ed-tour-icon"><Icon size={22}/></span><h3>{tab.title}</h3><p>{tab.text}</p><a href="/app-demo?tour=1">WATCH THE 90-SEC DEMO <ArrowRight size={16}/></a></div>
   <div className="ed-tour-ui">
    <div className="ed-tour-ui-head"><div><strong>Willow Studio</strong><small>{tab.label.toUpperCase()} / SAMPLE WORKSPACE</small></div><span>LIVE PREVIEW ↗</span></div>
    <div className="ed-tour-metrics">{tab.metrics.map(([label,value])=><div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
    <div className="ed-tour-rows">{tab.rows.map(([title,sub],i)=><div key={i}><span>{String(i+1).padStart(2,"0")}</span><div><b>{title}</b><small>{sub}</small></div><i>→</i></div>)}</div>
   </div>
  </div>
 </div>
}
