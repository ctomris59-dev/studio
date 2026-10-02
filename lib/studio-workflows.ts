import {creditsFor,day,uid,type StudioData,type Lead,type LeadStage,type Member,type Task,type Session} from "./studio-crm";

export const TASK_CATEGORIES=["Call","Email","Renewal","Trial","General"] as const;
export const TASK_PRIORITIES=["Low","Normal","High"] as const;
export const TASK_OUTCOMES=["Contacted","No answer","Reschedule","Converted","Completed"] as const;
export const TASK_REPEAT=["None","Weekly","Monthly"] as const;
export const CONTACT_CHANNELS=["Either","Email","Phone"] as const;
export const PAYMENT_STATES=["Pending","Paid"] as const;
export const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;
export type Result={ok:boolean;message:string;data:StudioData;created?:number};

const error=(data:StudioData,message:string):Result=>({ok:false,message,data});
const good=(data:StudioData,message:string,created?:number):Result=>({ok:true,message,data,created});
export const cleanPhone=(phone:string)=>phone.replace(/[\s().-]/g,"").trim();
export const validPhone=(phone:string)=>/^\+?[0-9]{7,15}$/.test(cleanPhone(phone));
export const validEmail=(email:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=160;
export const validDate=(date:string)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const d=new Date(date+"T12:00:00Z");
  return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===date;
};
export const validTime=(time:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(time);
export function sameContact(a:{email?:string;phone?:string},b:{email?:string;phone?:string}):boolean {
  return Boolean(a.email&&b.email&&a.email.toLowerCase()===b.email.toLowerCase()||a.phone&&b.phone&&cleanPhone(a.phone)===cleanPhone(b.phone));
}
export type LeadInput={name:string;email:string;phone:string;source:string;stage:LeadStage;nextContact:string;notes:string;preferredService:string;preferredChannel:"Either"|"Email"|"Phone";interestPlan:string;consent:boolean};
export function addLead(data:StudioData,input:LeadInput):Result {
  const name=input.name.trim(),email=input.email.trim().toLowerCase(),phone=cleanPhone(input.phone);
  if(name.length<2||name.length>80)return error(data,"Enter a name (2–80 characters).");
  if(!email&&!phone)return error(data,"Provide an email or phone number.");
  if(email&&!validEmail(email)||phone&&!validPhone(phone))return error(data,"Check the email address or phone number.");
  if(data.leads.some(l=>sameContact(l,{email,phone}))||data.members.some(m=>sameContact(m,{email,phone})))return error(data,"This contact is already recorded in CRM.");
  if(!validDate(input.nextContact))return error(data,"Choose a valid next contact date.");
  if(input.notes.length>1600)return error(data,"Notes must be under 1,600 characters.");
  const item:Lead={id:uid("l"),name,email,phone,source:input.source,stage:input.stage,created:day(),nextContact:input.nextContact,notes:input.notes.trim(),preferredService:input.preferredService,preferredChannel:input.preferredChannel,interestPlan:input.interestPlan,consent:input.consent};
  const task:Task={id:uid("t"),personKind:"lead",personId:item.id,reason:"Contact "+item.name,category:"Call",priority:"Normal",due:input.nextContact,created:day(),completed:false,repeat:"None",assignee:"Studio owner"};
  return good({...data,leads:[item,...data.leads],tasks:[task,...data.tasks],activities:[{id:uid("a"),personKind:"lead",personId:item.id,text:"Lead added via "+item.source,date:day()},...data.activities]},"Lead saved; follow-up scheduled.",1);
}
export type MemberInput={name:string;email:string;phone:string;plan:string;startDate:string;expiryDate:string;credits:number;paymentStatus:"Pending"|"Paid";status:"Active"|"Paused";notes:string;consent:boolean;sourceLeadId?:string};
export function addMember(data:StudioData,input:MemberInput):Result {
  const name=input.name.trim(),email=input.email.trim().toLowerCase(),phone=cleanPhone(input.phone);
  if(name.length<2||name.length>80)return error(data,"Enter a valid member name.");
  if(!email&&!phone)return error(data,"Provide an email or phone number.");
  if(email&&!validEmail(email)||phone&&!validPhone(phone))return error(data,"Check the email address or phone number.");
  if(data.members.some(m=>sameContact(m,{email,phone})))return error(data,"Member with this email or phone already exists.");
  if(!["5 Class Pack","10 Class Pack","Unlimited Monthly"].includes(input.plan))return error(data,"Choose a class pack.");
  if(!validDate(input.startDate)||input.expiryDate&&!validDate(input.expiryDate)||input.expiryDate&&input.expiryDate<input.startDate)return error(data,"Check membership start and expiry dates.");
  if(!Number.isSafeInteger(input.credits)||input.credits<0||input.credits>1000)return error(data,"Initial credits must be 0–1,000.");
  if(input.notes.length>1600)return error(data,"Notes must be under 1,600 characters.");
  if(input.sourceLeadId&&!data.leads.some(l=>l.id===input.sourceLeadId))return error(data,"The linked lead was not found.");
  const credits=input.paymentStatus==="Pending"?0:input.plan==="Unlimited Monthly"?null:input.credits;
  const item:Member={id:uid("m"),name,email,phone,plan:input.plan,credits,initialCredits:input.plan==="Unlimited Monthly"?0:input.credits,
    paymentStatus:input.paymentStatus,startDate:input.startDate,joined:input.startDate,expiryDate:input.expiryDate,lastVisit:null,
    consent:input.consent,status:input.status,notes:input.notes.trim(),sourceLeadId:input.sourceLeadId};
  const leads=input.sourceLeadId?data.leads.map(l=>l.id===input.sourceLeadId?{...l,stage:"Won" as const}:l):data.leads;
  return good({...data,leads,members:[item,...data.members],
    activities:[{id:uid("a"),personKind:"member",personId:item.id,text:"Member added. Package "+input.plan+" · "+input.paymentStatus+" (manual status; no payment processed)",date:day()},...data.activities]
  },input.paymentStatus==="Pending"?"Member saved; package requires confirmation before credits become usable.":"Member added; paid status was manually confirmed (no payment processed).",1);
}
export function confirmPackage(data:StudioData,memberId:string):Result {
  const m=data.members.find(m=>m.id===memberId);
  if(!m)return error(data,"Member not found.");
  if(m.paymentStatus!=="Pending")return error(data,"Package is not pending.");
  const credits=m.plan==="Unlimited Monthly"?null:Math.min(1000,m.initialCredits??creditsFor(m.plan)??0);
  return good({...data,members:data.members.map(x=>x.id===memberId?{...x,paymentStatus:"Paid",credits}:x),
    activities:[{id:uid("a"),personKind:"member",personId,text:"Manager manually confirmed package; no payment processed",date:day()},...data.activities]
  },"Package manually confirmed, credits activated. No payment was collected.");
}
export function convertLead(data:StudioData,leadId:string,plan="10 Class Pack"):Result {
  const lead=data.leads.find(l=>l.id===leadId);
  if(!lead)return error(data,"Lead not found.");
  if(data.members.some(m=>m.sourceLeadId===leadId||sameContact(m,lead)))return error(data,"This lead already has a matching member.");
  const newMember=addMember(data,{name:lead.name,email:lead.email,phone:lead.phone||"",plan,startDate:day(),expiryDate:"",
    credits:creditsFor(plan)||0,paymentStatus:"Pending",status:"Active",notes:lead.notes||"",consent:lead.consent,sourceLeadId:lead.id});
  if(!newMember.ok)return newMember;
  return good({...newMember.data,activities:[{id:uid("a"),personKind:"lead",personId:leadId,text:"Converted to pending member; history preserved via lead link",date:day()},...newMember.data.activities]},
    "Lead linked to a pending member; their notes and history are retained. No credits awarded.");
}

export type ClassInput={title:string;coach:string;date:string;time:string;durationMinutes:number;capacity:number;room:string;bookingCutoffHours:number;cancelCutoffHours:number;description:string;repeat:boolean;weekdays:number[];endDate:string};
export const timeMinutes=(time:string):number=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
export function endDateForDays(start:string,days:number):string {const d=new Date(start+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function hasClassConflict(existing:Session[],candidate:Pick<Session,"date"|"time"|"durationMinutes"|"coach"|"room">):boolean {
  const start=timeMinutes(candidate.time),end=start+(candidate.durationMinutes||50);
  return existing.some(s=>s.date===candidate.date&&(
    s.coach.trim().toLowerCase()===candidate.coach.trim().toLowerCase()||
    Boolean((s.room||"Main studio").trim().toLowerCase()===(candidate.room||"Main studio").trim().toLowerCase())
  )&&start<timeMinutes(s.time)+(s.durationMinutes||50)&&timeMinutes(s.time)<end);
}
export function addClasses(data:StudioData,input:ClassInput):Result {
  const title=input.title.trim(),coach=input.coach.trim(),room=input.room.trim()||"Main studio";
  if(title.length<2||title.length>100||coach.length<2||coach.length>80||room.length>80)return error(data,"Check class, coach and room names.");
  if(!validDate(input.date)||!validTime(input.time))return error(data,"Choose a valid start date and time.");
  if(!Number.isSafeInteger(input.durationMinutes)||input.durationMinutes<15||input.durationMinutes>240)return error(data,"Class duration must be 15–240 minutes.");
  if(timeMinutes(input.time)+input.durationMinutes>1440)return error(data,"Classes must finish before midnight.");
  if(!Number.isSafeInteger(input.capacity)||input.capacity<1||input.capacity>100)return error(data,"Class capacity must be 1–100.");
  if(![input.bookingCutoffHours,input.cancelCutoffHours].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=168))return error(data,"Booking and cancellation cutoffs must be 0–168 hours.");
  if(input.description.length>500)return error(data,"Class description is too long.");
  const dates:string[]=[];
  if(input.repeat){
    if(!validDate(input.endDate)||input.endDate<input.date)return error(data,"Select a valid recurrence end date.");
    const daysApart=Math.round((Date.parse(input.endDate)-Date.parse(input.date))/86400000);
    if(daysApart>180)return error(data,"Repeat range limited to six months (180 days) per batch.");
    const weekdays=[...new Set(input.weekdays)];
    if(!weekdays.length||weekdays.some(d=>!Number.isSafeInteger(d)||d<0||d>6))return error(data,"Select at least one repeat weekday.");
    for(let d=0;d<=daysApart;d++){
      const date=endDateForDays(input.date,d);
      if(weekdays.includes(new Date(date+"T12:00:00Z").getUTCDay()))dates.push(date);
    }
    if(!dates.length)return error(data,"No sessions fall within the selected date range.");
  }else dates.push(input.date);
  if(dates.length>100)return error(data,"Limit each recurring series to 100 classes.");
  const seriesId=input.repeat?uid("series"):undefined;
  const created:Session[]=dates.map(date=>({id:uid("s"),title,coach,room,date,time:input.time,durationMinutes:input.durationMinutes,capacity:input.capacity,
    seriesId,bookingCutoffHours:input.bookingCutoffHours,cancelCutoffHours:input.cancelCutoffHours,
    description:input.description.trim(),booked:[],waitlist:[]}));
  for(const c of created)if(hasClassConflict(data.sessions,c))return error(data,"Conflict on "+c.date+": instructor or room already booked for overlapping time.");
  return good({...data,sessions:[...data.sessions,...created]},created.length+" class"+(created.length===1?"":"es")+" added with no coach/room time conflicts.",created.length);
}
export type TaskInput={personKind:"lead"|"member";personId:string;reason:string;due:string;dueTime:string;category:Task["category"];priority:Task["priority"];assignee:string;repeat:Task["repeat"];notes:string};
export function addTask(data:StudioData,input:TaskInput):Result{
  const p=input.personKind==="lead"?data.leads.find(p=>p.id===input.personId):data.members.find(p=>p.id===input.personId);
  if(!p)return error(data,"Select a valid lead or member.");
  if(!input.reason.trim()||input.reason.length>240)return error(data,"Enter a task reason (up to 240 characters).");
  if(!validDate(input.due)||input.dueTime&&!validTime(input.dueTime))return error(data,"Enter a valid due date and time.");
  if((input.notes||"").length>500)return error(data,"Task notes must be under 500 characters.");
  const task:Task={id:uid("t"),personKind:input.personKind,personId:input.personId,reason:input.reason.trim(),due:input.due,
    dueTime:input.dueTime,category:input.category,priority:input.priority,assignee:input.assignee.trim()||"Studio owner",
    repeat:input.repeat,notes:input.notes.trim(),created:day(),completed:false};
  return good({...data,tasks:[task,...data.tasks]},"Follow-up task created.",1);
}
export function completeTask(data:StudioData,taskId:string,outcome:NonNullable<Task["outcome"]>):Result{
  const t=data.tasks.find(t=>t.id===taskId);
  if(!t||t.completed)return error(data,"Task is already completed or missing.");
  if(!TASK_OUTCOMES.includes(outcome))return error(data,"Select a valid result.");
  const repeat=t.repeat||"None";
  let next:Task|undefined;
  if(repeat!=="None"){
    const d=new Date(t.due+"T12:00:00Z");
    if(repeat==="Weekly")d.setUTCDate(d.getUTCDate()+7);
    if(repeat==="Monthly") { const current=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);const max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(current,max)); }
    next={...t,id:uid("t"),due:d.toISOString().slice(0,10),created:day(),completed:false,outcome:undefined,completedAt:undefined};
  }
  return good({...data,
    tasks:[...data.tasks.map(x=>x.id===t.id?{...x,completed:true,outcome,completedAt:day()}:x),...(next?[next]:[])],
    activities:[{id:uid("a"),personKind:t.personKind,personId:t.personId,text:"Follow-up completed ("+outcome+"): "+t.reason,date:day()},...data.activities]
  },next?"Task completed; the next "+repeat.toLowerCase()+" task was created.":"Task completed: "+outcome+".");
}
