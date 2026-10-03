export type StudioFocus = "Pilates" | "Yoga" | "Barre" | "Dance" | "Boutique fitness" | "Gym";
export type LeadStage = "New" | "Contacted" | "Trial booked" | "Trial attended" | "Won" | "Lost";
export type View = "overview" | "leads" | "members" | "schedule" | "followups" | "reports" | "client" | "settings";
export type Member = { id:string; name:string; email:string; plan:string; credits:number|null; joined:string; lastVisit:string|null; consent:boolean; status:"Active"|"Paused"; notes:string; phone?:string; startDate?:string; expiryDate?:string; paymentStatus?:"Pending"|"Paid"; sourceLeadId?:string; initialCredits?:number; };
export type Lead = { id:string; name:string; email:string; stage:LeadStage; source:string; created:string; nextContact:string; consent:boolean; notes:string; trialAttended?:string; phone?:string; preferredService?:string; preferredChannel?:"Email"|"Phone"|"Either"; interestPlan?:string; };
export type Session = { id:string; title:string; coach:string; date:string; time:string; capacity:number; booked:string[]; waitlist:string[]; durationMinutes?:number; room?:string; seriesId?:string; bookingCutoffHours?:number; cancelCutoffHours?:number; description?:string; };
export type Task = { id:string; personKind:"lead"|"member"; personId:string; reason:string; due:string; completed:boolean; created:string; category?:"Call"|"Email"|"Renewal"|"Trial"|"General"; priority?:"Low"|"Normal"|"High"; dueTime?:string; assignee?:string; repeat?:"None"|"Weekly"|"Monthly"; notes?:string; outcome?:"Contacted"|"No answer"|"Reschedule"|"Converted"|"Completed"; completedAt?:string; };
export type Activity = { id:string; personKind:"lead"|"member"; personId:string; text:string; date:string };
export type StudioData = { version:3; studioFocus:StudioFocus; studioName:string; leads:Lead[]; members:Member[]; sessions:Session[]; tasks:Task[]; activities:Activity[]; closedOpportunities:string[] };
export type Opportunity = { id:string; personKind:"lead"|"member"; personId:string; personName:string; label:string; detail:string; category:"Lead"|"Renewal"|"Re-engage"|"Trial"; priority:number; due:string };

export const focuses:StudioFocus[]=["Pilates","Yoga","Barre","Dance","Boutique fitness","Gym"];
export const leadStages:LeadStage[]=["New","Contacted","Trial booked","Trial attended","Won","Lost"];
export const planOptions=["5 Class Pack","10 Class Pack","Unlimited Monthly"];
export const studioNameByFocus:Record<StudioFocus,string>={Pilates:"Willow Pilates Studio",Yoga:"Willow Yoga Studio",Barre:"Willow Barre Studio",Dance:"Willow Dance Studio","Boutique fitness":"Willow Fitness Studio",Gym:"Willow Gym"};
export const focusClasses:Record<StudioFocus,string[]> = {
  Pilates:["Reformer Foundations","Morning Flow","Sculpt & Strength","Stretch & Reset","Evening Reformer","Dynamic Pilates"],
  Yoga:["Morning Vinyasa","Hatha Foundations","Power Yoga","Yin & Restore","Evening Flow","Breath & Balance"],
  Barre:["Barre Foundations","Morning Barre Flow","Barre Sculpt","Stretch & Align","Evening Barre","Core & Balance"],
  Dance:["Contemporary Basics","Ballet Foundations","Jazz Technique","Movement Workshop","Modern Dance","Dance Conditioning"],
  "Boutique fitness":["HIIT Express","Strength Circuit","Functional Training","Core & Conditioning","Evening Burn","Mobility Flow"],
  Gym:["Group Strength","Functional Circuit","Morning Conditioning","Core Training","Evening Fitness","Mobility & Stretch"]
};
export function day(offset=0) {
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
export function dateLabel(value:string) {return new Date(value+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
export function compactDate(value:string) {return new Date(value+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});}
export function initials(name:string) {return name.split(/\s+/).slice(0,2).map(s=>s[0]||"").join("").toUpperCase();}
export function uid(prefix:string) {return prefix+"-"+Math.random().toString(36).slice(2,10)+"-"+Date.now().toString(36);}
export function creditsFor(plan:string):number|null {return plan==="Unlimited Monthly"?null:plan==="5 Class Pack"?5:10;}
export function convertPercent(value:number,total:number) {return total?Math.round(value/total*100):0;}
export function daysSince(date:string) {return Math.max(0,Math.floor((Date.parse(day())-Date.parse(date))/(24*60*60*1000)));}
export function sortedSessions(sessions:Session[]){return [...sessions].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));}
export function memberName(data:StudioData,id:string) {return data.members.find(m=>m.id===id)?.name||"Unknown member";}
export function person(data:StudioData,kind:"lead"|"member",id:string){return kind==="lead"?data.leads.find(l=>l.id===id):data.members.find(m=>m.id===id);}

export function makeSeed(focus:StudioFocus="Pilates"):StudioData {
  const memberNames=["Amelia Hart","Sophia Chen","Mia Oliver","Isabella Reed","Olivia Patel","Grace Taylor","Ella Brooks","Noah Mitchell","Lily James","Ava Williams","Chloe Adams","Charlotte Davis"];
  const members=memberNames.map((name,i):Member=>({
    id:"m"+(i+1),name,email:name.toLowerCase().replace(/\s+/g,".")+"@example.com",
    paymentStatus:"Paid",startDate:day(-90+i*4),expiryDate:day(100-i*2),initialCredits:i%4===0?0:i%3===0?5:10,
    plan:i%4===0?"Unlimited Monthly":i%3===0?"5 Class Pack":"10 Class Pack",
    credits:i%4===0?null:Math.max(0,(i%3===0?5:10)-Math.floor(i/2)),
    joined:day(-90+i*4),lastVisit:[-18,-3,-7,-24,-2,-5,-16,-1,-11,-4,-26,-3][i]===null?null:day([-18,-3,-7,-24,-2,-5,-16,-1,-11,-4,-26,-3][i]),
    consent:i!==5&&i!==10,status:"Active",notes:i===3?"Prefers morning classes.":""
  }));
  const names=["Harper Quinn","Taylor Morgan","Riley Parker","Jordan Blake","Emma Lewis","Alex Turner","Jamie Foster","Morgan Lane","Casey White","Avery Scott"];
  const stages:LeadStage[]=["New","Contacted","Trial booked","Trial attended","Trial attended","Won","Lost","Contacted","New","Trial booked"];
  const leads=names.map((name,i):Lead=>({
    id:"l"+(i+1),name,email:name.toLowerCase().replace(/\s+/g,".")+"@example.com",
    stage:stages[i],source:["Website","Referral","Instagram","Walk-in","Website","Referral","Website","Instagram","Walk-in","Website"][i],
    created:day(-[2,7,3,8,10,16,24,5,1,4][i]),nextContact:day([0,-2,1,-2,-4,4,7,-1,0,2][i]),consent:i!==6&&i!==8,
    notes:i===3?"Loved the introduction class.":i===4?"Asked about class packs.":"",
    trialAttended:stages[i]==="Trial attended"?day(-4-i):undefined
  }));
  const templates:[number,number,string,string,number,number][]=[
    [0,0,"07:30","Sophie",8,6],[1,0,"09:00","Olivia",8,8],[2,0,"12:30","Ava",8,5],
    [4,0,"17:30","Sophie",8,7],[3,1,"08:30","Ava",6,4],[0,1,"10:00","Olivia",8,6],
    [4,1,"18:00","Sophie",8,3],[1,2,"08:00","Sophie",8,6],[2,2,"17:30","Olivia",8,4]
  ];
  const sessions:Session[]=templates.map((x,i)=>({
    id:"s"+(i+1),title:focusClasses[focus][x[0]],date:day(x[1]),time:x[2],coach:x[3],capacity:x[4],
    booked:members.slice(0,x[5]).map(m=>m.id),waitlist:i===1?["m9","m10"]:[]
  }));
  const tasks:Task[]=[
    {id:"t1",personKind:"lead",personId:"l2",reason:"Discuss trial class preferences",due:day(-1),completed:false,created:day(-3)},
    {id:"t2",personKind:"member",personId:"m4",reason:"Check in after absence",due:day(0),completed:false,created:day(-1)},
    {id:"t3",personKind:"lead",personId:"l5",reason:"Follow up after trial",due:day(-2),completed:false,created:day(-3)},
    {id:"t4",personKind:"lead",personId:"l6",reason:"Membership confirmed",due:day(-8),completed:true,created:day(-12)}
  ];
  const activities:Activity[]=[
    {id:"a1",personKind:"lead",personId:"l4",text:"Attended introductory class",date:day(-6)},
    {id:"a2",personKind:"lead",personId:"l5",text:"Asked about the 10-class pack",date:day(-5)},
    {id:"a3",personKind:"lead",personId:"l6",text:"Converted to a member",date:day(-9)},
    {id:"a4",personKind:"member",personId:"m4",text:"Last attended a morning class",date:day(-24)}
  ];
  return {version:3,studioFocus:focus,studioName:studioNameByFocus[focus],leads,members,sessions,tasks,activities,closedOpportunities:[]};
}
export function isStudioData(raw:unknown):raw is StudioData {
  if(!raw||typeof raw!=="object")return false;
  const o=raw as Partial<StudioData>;
  return o.version===3&&Array.isArray(o.leads)&&Array.isArray(o.members)&&Array.isArray(o.sessions)&&Array.isArray(o.tasks)&&Array.isArray(o.activities)&&Array.isArray(o.closedOpportunities);
}
export function bookMember(data:StudioData,sessionId:string,memberId:string):{data:StudioData;message:string;success:boolean} {
  const s=data.sessions.find(s=>s.id===sessionId);const m=data.members.find(m=>m.id===memberId);
  if(!s||!m)return {data,message:"Choose a valid class and member.",success:false};
  if(s.booked.includes(memberId)||s.waitlist.includes(memberId))return {data,message:"Already booked or waitlisted.",success:false};
  if(m.status==="Paused")return {data,message:"This membership is paused.",success:false};
  if(m.paymentStatus==="Pending")return {data,message:"This package is pending confirmation.",success:false};
  if(m.expiryDate&&m.expiryDate<s.date)return {data,message:"The membership expires before this class.",success:false};
  if(s.bookingCutoffHours!==undefined&&s.bookingCutoffHours>0&&new Date(s.date+"T"+s.time+":00").getTime()-Date.now()<s.bookingCutoffHours*3600000)return {data,message:"Booking cutoff has passed.",success:false};
  if(m.credits!==null&&m.credits<1)return {data,message:"This member has no remaining credits.",success:false};
  const full=s.booked.length>=s.capacity;
  return {data:{
    ...data,
    sessions:data.sessions.map(x=>x.id===s.id?{...x,booked:full?x.booked:[...x.booked,m.id],waitlist:full?[...x.waitlist,m.id]:x.waitlist}:x),
    members:full?data.members:data.members.map(x=>x.id===m.id&&x.credits!==null?{...x,credits:x.credits-1}:x),
    activities:full?data.activities:[{id:uid("a"),personKind:"member",personId:m.id,text:"Booked "+s.title+" on "+compactDate(s.date),date:day()},...data.activities]
  },message:full?"Added to waitlist. No class credit used.":"Class booked; one credit used.",success:true};
}
export function cancelBooking(data:StudioData,sessionId:string,memberId:string):{data:StudioData;message:string;success:boolean} {
  const session=data.sessions.find(s=>s.id===sessionId);const member=data.members.find(m=>m.id===memberId);
  if(!session||!member)return {data,message:"Booking not found.",success:false};
  const wasBooked=session.booked.includes(memberId);
  const wasWaitlisted=session.waitlist.includes(memberId);
  if(!wasBooked&&!wasWaitlisted)return {data,message:"Booking not found.",success:false};
  if(session.cancelCutoffHours!==undefined&&session.cancelCutoffHours>0&&new Date(session.date+"T"+session.time+":00").getTime()-Date.now()<session.cancelCutoffHours*3600000)return {data,message:"Cancellation cutoff has passed.",success:false};
  if(wasWaitlisted)return {data:{...data,sessions:data.sessions.map(s=>s.id===sessionId?{...s,waitlist:s.waitlist.filter(id=>id!==memberId)}:s)},message:"Removed from waitlist.",success:true};
  const queue=[...session.waitlist];let promoted:Member|undefined;
  while(queue.length) {
    const id=queue.shift()!;
    const candidate=data.members.find(m=>m.id===id);
    if(candidate&&candidate.status==="Active"&&candidate.paymentStatus!=="Pending"&&(!candidate.expiryDate||candidate.expiryDate>=session.date)&&(candidate.credits===null||candidate.credits>0)) {promoted=candidate;break;}
  }
  return {data:{
    ...data,
    sessions:data.sessions.map(s=>s.id===sessionId?{...s,booked:[...s.booked.filter(id=>id!==memberId),...(promoted?[promoted.id]:[])],waitlist:queue}:s),
    members:data.members.map(m=>m.id===memberId&&m.credits!==null?{...m,credits:m.credits+1}:promoted&&m.id===promoted.id&&m.credits!==null?{...m,credits:m.credits-1}:m),
    activities:[{id:uid("a"),personKind:"member",personId:memberId,text:"Cancelled "+session.title+"; class credit restored",date:day()},...data.activities]
  },message:promoted?"Booking cancelled, credit restored and first eligible waitlist member promoted.":"Booking cancelled and credit restored.",success:true};
}
export function opportunities(data:StudioData):Opportunity[] {
  const result:Opportunity[]=[];
  for(const l of data.leads){
    if(l.stage==="Lost"||l.stage==="Won")continue;
    if(l.stage==="Trial attended")result.push({id:"trial:"+l.id,personKind:"lead",personId:l.id,personName:l.name,category:"Trial",label:"Convert trial to membership",detail:"Attended trial but has not joined",priority:1,due:l.nextContact});
    else if(l.nextContact<=day())result.push({id:"lead:"+l.id,personKind:"lead",personId:l.id,personName:l.name,category:"Lead",label:"Lead needs a response",detail:l.stage+" · next contact "+compactDate(l.nextContact),priority:2,due:l.nextContact});
  }
  for(const m of data.members){
    if(m.status!=="Active")continue;
    if(m.paymentStatus!=="Pending"&&m.credits!==null&&m.credits<=2)result.push({id:"renew:"+m.id,personKind:"member",personId:m.id,personName:m.name,category:"Renewal",label:"Class pack running low",detail:m.credits+" credits remaining",priority:1,due:day()});
    if(m.expiryDate&&m.expiryDate>=day()&&m.expiryDate<=day(14))result.push({id:"expiry:"+m.id,personKind:"member",personId:m.id,personName:m.name,category:"Renewal",label:"Membership expiry approaching",detail:"Expires "+compactDate(m.expiryDate),priority:1,due:m.expiryDate});
    if(m.lastVisit&&daysSince(m.lastVisit)>=14)result.push({id:"winback:"+m.id,personKind:"member",personId:m.id,personName:m.name,category:"Re-engage",label:"Member may need a check-in",detail:"Last visit "+daysSince(m.lastVisit)+" days ago",priority:2,due:day()});
  }
  return result.filter(o=>!data.closedOpportunities.includes(o.id)).sort((a,b)=>a.priority-b.priority||a.due.localeCompare(b.due));
}
export function report(data:StudioData) {
  const active=data.members.filter(m=>m.status==="Active").length;
  const trials=data.leads.filter(l=>["Trial attended","Won"].includes(l.stage)).length;
  const won=data.leads.filter(l=>l.stage==="Won").length;
  const seats=data.sessions.reduce((x,s)=>x+s.capacity,0),booked=data.sessions.reduce((x,s)=>x+s.booked.length,0);
  const atRisk=data.members.filter(m=>m.status==="Active"&&m.lastVisit&&daysSince(m.lastVisit)>=14).length;
  const renewals=data.members.filter(m=>m.status==="Active"&&m.paymentStatus!=="Pending"&&m.credits!==null&&m.credits<=2).length;
  const pending=data.members.filter(m=>m.paymentStatus==="Pending").length;
  const expiring=data.members.filter(m=>m.expiryDate&&m.expiryDate>=day()&&m.expiryDate<=day(14)).length;
  const outcomes=Object.fromEntries(["Contacted","No answer","Reschedule","Converted","Completed"].map(k=>[k,data.tasks.filter(t=>t.outcome===k).length]));
  return {active,trials,won,seats,booked,atRisk,renewals,pending,expiring,outcomes,occupancy:convertPercent(booked,seats),conversion:convertPercent(won,trials),completedTasks:data.tasks.filter(t=>t.completed).length,openTasks:data.tasks.filter(t=>!t.completed).length,leads:data.leads.length};
}
export function draftFor(name:string,kind:string,studioName:string) {
  const first=name.split(" ")[0];
  const subjects:Record<string,string>={
    "Lead":"A quick hello from "+studioName,
    "Trial":"Great having you in class, "+first,
    "Renewal":"Your next classes at "+studioName,
    "Re-engage":"We'd love to see you again, "+first,
    "General":"Checking in from "+studioName
  };
  const bodies:Record<string,string>={
    "Lead":"Hi "+first+",\n\nThank you for your interest in "+studioName+". Would you like help choosing a class that suits you?\n\nBest,\n"+studioName,
    "Trial":"Hi "+first+",\n\nIt was lovely to have you in for a trial class. Let us know if you'd like help finding your next session.\n\nSee you soon,\n"+studioName,
    "Renewal":"Hi "+first+",\n\nJust a heads-up that your class pack is running low. If you'd like to keep your routine going, we'd be happy to help with the next package.\n\nBest,\n"+studioName,
    "Re-engage":"Hi "+first+",\n\nWe haven't seen you in a little while and wanted to check in. If you want help finding a class, just reply.\n\nWarmly,\n"+studioName,
    "General":"Hi "+first+",\n\nJust checking in from "+studioName+". Let us know if there's anything we can help with.\n\nBest,\n"+studioName
  };
  return {subject:subjects[kind]||subjects.General,body:bodies[kind]||bodies.General};
}
export function downloadCsv(name:string,rows:(string|number)[][]) {
  const safe=(v:string|number)=>'"'+String(v).replace(/"/g,'""')+'"';
  const content="\uFEFF"+rows.map(row=>row.map(safe).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),200);
}
