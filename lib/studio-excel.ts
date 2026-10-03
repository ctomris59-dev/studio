import {
  creditsFor,focuses,leadStages,planOptions,uid,
  type Activity,type Lead,type Member,type Session,type StudioData,type StudioFocus,type Task
} from "./studio-crm";

export const EXCEL_FORMAT="StudioTasker Excel v2";
export const SHEETS=["Guide","Leads","Members","Classes","Bookings","FollowUps","Activity","Dismissed"] as const;
export type SheetName=(typeof SHEETS)[number];
export type ExcelTables=Record<SheetName,string[][]>;
export type ValidationOutcome={valid:boolean;errors:string[];data:StudioData|null;counts:Record<string,number>};

export const HEADERS:Record<SheetName,string[]>={
  Guide:["Setting","Value"],
  Leads:["Lead ID","Full Name","Email","Stage","Source","Created (YYYY-MM-DD)","Next Contact (YYYY-MM-DD)","Consent (Yes/No)","Notes","Trial Attended (YYYY-MM-DD)","Phone","Preferred Service","Preferred Channel","Interested Plan"],
  Members:["Member ID","Full Name","Email","Plan","Credits","Joined (YYYY-MM-DD)","Last Visit (YYYY-MM-DD)","Consent (Yes/No)","Status","Notes","Phone","Start Date (YYYY-MM-DD)","Expiry Date (YYYY-MM-DD)","Payment Status","Source Lead ID","Credits on Confirmation"],
  Classes:["Class ID","Class Title","Instructor","Date (YYYY-MM-DD)","Time (HH:MM)","Capacity","Duration Minutes","Room","Series ID","Book Cutoff Hours","Cancel Cutoff Hours","Description"],
  Bookings:["Class ID","Member ID","Status (Booked/Waitlisted)"],
  FollowUps:["Task ID","Person Type (lead/member)","Person ID","Reason","Due (YYYY-MM-DD)","Completed (Yes/No)","Created (YYYY-MM-DD)","Task Category","Priority","Due Time (HH:MM)","Assignee","Repeat","Notes","Outcome","Completed At (YYYY-MM-DD)"],
  Activity:["Activity ID","Person Type (lead/member)","Person ID","Description","Date (YYYY-MM-DD)"],
  Dismissed:["Opportunity ID"]
};
function val(v:unknown):string{return v===null||v===undefined?"":String(v);}
const norm=(s:string)=>s.trim();
const maxLen=(s:string,n:number)=>s.length<=n;
const idValid=(s:string)=>/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(s);
function dateValid(s:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const d=new Date(s+"T12:00:00.000Z");
  return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;
}
function emailValid(v:string){return v.length<=160&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
function makeSheet(name:SheetName,records:(string|number|boolean|null|undefined)[][]):string[][] {
  return [HEADERS[name],[...[]],...records.map(row=>row.map(val))].filter((row,i)=>i!==1);
}
export function toExcelTables(data:StudioData,template=false):ExcelTables {
  const arr=(rows:(string|number|boolean|null|undefined)[][],name:SheetName)=>makeSheet(name,template?[]:rows);
  const tables:ExcelTables={
    Guide:makeSheet("Guide",[
      ["Format",EXCEL_FORMAT],
      ["Studio Type",data.studioFocus],
      ["Studio Name",data.studioName],
      ["Usage","Download Template, fill rows under the EXACT headers, preview before importing."],
      ["Behavior","Import replaces the current browser demo ONLY after explicit confirmation."],
      ["Relations","Bookings: use Class ID + Member ID from Classes and Members sheets."],
      ["Dates","Dates must be YYYY-MM-DD; class times HH:MM (24-hour)."],
      ["Consent","Yes only with documented permission; blank means No. Email OR phone required."],
      ["Compatibility","Existing ReformDesk Excel v1/v2 files remain importable."],
      ["Payment","Pending packages have zero usable credits until manually confirmed."],
      ["Repeat","Recurring sessions export as individual Classes rows with the same Series ID."],
      ["Security","Browser demo only. Do not import real clients before secure accounts launch."],
      ["Credits","Credits are balances; importing bookings does not automatically debit credits."]
    ]),
    Leads:arr(data.leads.map(l=>[l.id,l.name,l.email,l.stage,l.source,l.created,l.nextContact,l.consent?"Yes":"No",l.notes,l.trialAttended||"",l.phone||"",l.preferredService||"",l.preferredChannel||"Either",l.interestPlan||""]),"Leads"),
    Members:arr(data.members.map(m=>[m.id,m.name,m.email,m.plan,m.credits===null?"":m.credits,m.joined,m.lastVisit||"",m.consent?"Yes":"No",m.status,m.notes,m.phone||"",m.startDate||m.joined,m.expiryDate||"",m.paymentStatus||"Paid",m.sourceLeadId||"",m.initialCredits??""]),"Members"),
    Classes:arr(data.sessions.map(s=>[s.id,s.title,s.coach,s.date,s.time,s.capacity,s.durationMinutes||50,s.room||"Main studio",s.seriesId||"",s.bookingCutoffHours??0,s.cancelCutoffHours??0,s.description||""]),"Classes"),
    Bookings:arr(data.sessions.flatMap(s=>[
      ...s.booked.map(id=>[s.id,id,"Booked"]),
      ...s.waitlist.map(id=>[s.id,id,"Waitlisted"])
    ]),"Bookings"),
    FollowUps:arr(data.tasks.map(t=>[t.id,t.personKind,t.personId,t.reason,t.due,t.completed?"Yes":"No",t.created,t.category||"General",t.priority||"Normal",t.dueTime||"",t.assignee||"Studio owner",t.repeat||"None",t.notes||"",t.outcome||"",t.completedAt||""]),"FollowUps"),
    Activity:arr(data.activities.map(a=>[a.id,a.personKind,a.personId,a.text,a.date]),"Activity"),
    Dismissed:arr(data.closedOpportunities.map(id=>[id]),"Dismissed")
  };
  return tables;
}
const issue=(errors:string[],sheet:SheetName,row:number,text:string)=>{
  if(errors.length<75)errors.push(sheet+"!"+row+": "+text);
};
function yesNo(errors:string[],sheet:SheetName,row:number,input:string):boolean{
  const s=norm(input).toLowerCase();
  if(!s||s==="no")return false;
  if(s==="yes")return true;
  issue(errors,sheet,row,'Expected "Yes" or "No".');return false;
}
function required(errors:string[],sheet:SheetName,row:number,v:string,label:string,max=180):string{
  const s=norm(v);
  if(!s)issue(errors,sheet,row,label+" is required.");
  if(!maxLen(s,max))issue(errors,sheet,row,label+" exceeds "+max+" characters.");
  return s;
}
function validateDay(errors:string[],sheet:SheetName,row:number,v:string,label:string,optional=false):string{
  const d=norm(v);if(optional&&!d)return "";
  if(!dateValid(d))issue(errors,sheet,row,label+" must be a real date in YYYY-MM-DD format.");
  return d;
}
function rows(t:ExcelTables,name:SheetName,errors:string[]):string[][]{
  const table=t[name];
  if(!table){issue(errors,name,1,"Sheet is missing.");return [];}
  if(table.length>5001){issue(errors,name,1,"Maximum 5,000 data rows per sheet.");return [];}
  const expected=HEADERS[name],actual=table[0]||[];
  const minColumns:{[K in SheetName]:number}={Guide:2,Leads:10,Members:10,Classes:6,Bookings:3,FollowUps:7,Activity:5,Dismissed:1};
  const last=actual.reduce((end,v,i)=>norm(v)?i+1:end,0);
  if(last<minColumns[name]||last>expected.length||actual.slice(0,last).some((x,i)=>norm(x)!==expected[i])) {
    issue(errors,name,1,"Column headers do not match the StudioTasker template; download a fresh template.");
    return [];
  }
  return table.slice(1).filter(row=>row.some(x=>norm(x)!=="")).map(row=>[...row,...Array(Math.max(0,expected.length-row.length)).fill("")]);
}
export function fromExcelTables(tables:ExcelTables):ValidationOutcome {
  const errors:string[]=[];
  for(const name of SHEETS)if(!tables[name])issue(errors,name,1,"Required sheet missing.");
  const guide=rows(tables,"Guide",errors);
  const kv=new Map(guide.map(r=>[norm(r[0]),norm(r[1])]));
  if(![EXCEL_FORMAT,"ReformDesk Excel v1","ReformDesk Excel v2"].includes(kv.get("Format")||""))issue(errors,"Guide",2,"Unsupported format version.");
  const focus=kv.get("Studio Type") as StudioFocus;
  if(!focuses.includes(focus))issue(errors,"Guide",3,"Studio Type must match an available StudioTasker studio preset.");
  const studioName=norm(kv.get("Studio Name")||"");
  if(studioName.length<2||studioName.length>100)issue(errors,"Guide",4,"Studio Name must contain 2–100 characters.");

  const leads:Lead[]=[],members:Member[]=[],sessions:Session[]=[],tasks:Task[]=[],activities:Activity[]=[];
  const ids={lead:new Set<string>(),member:new Set<string>(),session:new Set<string>(),task:new Set<string>(),activity:new Set<string>()};
  const leadEmails=new Set<string>(),memberEmails=new Set<string>();
  rows(tables,"Leads",errors).forEach((r,i)=>{
    const row=i+2,[rawId,rawName,rawEmail,rawStage,rawSource,rawCreated,rawContact,rawConsent,rawNotes,rawTrial]=r;
    const id=norm(rawId)||uid("l"),name=required(errors,"Leads",row,rawName,"Full Name",80);
    const email=norm(rawEmail).toLowerCase(),stage=norm(rawStage),source=required(errors,"Leads",row,rawSource,"Source",80);
    const phone=norm(r[10]||"").replace(/[\s().-]/g,"");
    if(!email&&!phone)issue(errors,"Leads",row,"Email or Phone required.");
    if(email&&!emailValid(email))issue(errors,"Leads",row,"Invalid Email.");
    if(phone&&!/^\+?[0-9]{7,15}$/.test(phone))issue(errors,"Leads",row,"Invalid Phone.");
    if(!leadStages.includes(stage as Lead["stage"]))issue(errors,"Leads",row,"Unknown Stage.");
    if(!idValid(id)||ids.lead.has(id))issue(errors,"Leads",row,"Lead ID must be unique and use letters, numbers, - or _.");
    if(email&&leadEmails.has(email))issue(errors,"Leads",row,"Duplicate lead email "+email);
    ids.lead.add(id);leadEmails.add(email);
    const notes=norm(rawNotes||"");if(notes.length>1600)issue(errors,"Leads",row,"Notes exceed 1,600 characters.");
    const channel=norm(r[12]||"")||"Either",interestPlan=norm(r[13]||"");
    if(!["Either","Email","Phone"].includes(channel))issue(errors,"Leads",row,"Invalid Preferred Channel.");
    if(interestPlan&&!planOptions.includes(interestPlan))issue(errors,"Leads",row,"Unknown Interested Plan.");
    leads.push({id,name,email,phone,preferredService:norm(r[11]||""),preferredChannel:channel as Lead["preferredChannel"],interestPlan,stage:stage as Lead["stage"],source,created:validateDay(errors,"Leads",row,rawCreated,"Created"),nextContact:validateDay(errors,"Leads",row,rawContact,"Next Contact"),consent:yesNo(errors,"Leads",row,rawConsent),notes,trialAttended:validateDay(errors,"Leads",row,rawTrial||"","Trial Attended",true)||undefined});
  });

  rows(tables,"Members",errors).forEach((r,i)=>{
    const row=i+2,[rawId,rawName,rawEmail,rawPlan,rawCredits,rawJoined,rawLast,rawConsent,rawStatus,rawNotes]=r;
    const id=norm(rawId)||uid("m"),name=required(errors,"Members",row,rawName,"Full Name",80);
    const email=norm(rawEmail).toLowerCase(),plan=norm(rawPlan),status=norm(rawStatus);
    const phone=norm(r[10]||"").replace(/[\s().-]/g,"");
    if(!email&&!phone)issue(errors,"Members",row,"Email or Phone required.");
    if(email&&!emailValid(email))issue(errors,"Members",row,"Invalid Email.");
    if(phone&&!/^\+?[0-9]{7,15}$/.test(phone))issue(errors,"Members",row,"Invalid Phone.");
    if(!planOptions.includes(plan))issue(errors,"Members",row,"Invalid Plan.");
    if(!["Active","Paused"].includes(status))issue(errors,"Members",row,"Status must be Active or Paused.");
    if(!idValid(id)||ids.member.has(id))issue(errors,"Members",row,"Invalid or duplicate Member ID.");
    if(email&&memberEmails.has(email))issue(errors,"Members",row,"Duplicate member email "+email);
    ids.member.add(id);memberEmails.add(email);
    let credits:null|number=null;
    const c=norm(rawCredits||"");
    const paymentStatus=norm(r[13]||"")||"Paid";
    if(!["Paid","Pending"].includes(paymentStatus))issue(errors,"Members",row,"Payment Status must be Paid or Pending.");
    if(plan==="Unlimited Monthly"){if(c&&!(paymentStatus==="Pending"&&c==="0"))issue(errors,"Members",row,"Unlimited Monthly requires blank Credits when Paid (or 0 when Pending).");if(paymentStatus==="Pending")credits=0;}
    else if(!/^\d+$/.test(c)||Number(c)>1000000)issue(errors,"Members",row,"Credits must be a whole number from 0 to 1,000,000.");
    else credits=Number(c);
    const notes=norm(rawNotes||"");if(notes.length>1600)issue(errors,"Members",row,"Notes exceed 1,600 characters.");
    if(paymentStatus==="Pending"&&credits!==0)issue(errors,"Members",row,"Pending packages must have 0 usable Credits.");
    const joined=validateDay(errors,"Members",row,rawJoined,"Joined");
    const start=validateDay(errors,"Members",row,r[11]||joined,"Start Date");
    const expiry=validateDay(errors,"Members",row,r[12]||"","Expiry Date",true);
    if(expiry&&expiry<start)issue(errors,"Members",row,"Expiry Date cannot precede Start Date.");
    const sourceLeadId=norm(r[14]||"");
    const initialText=norm(r[15]||"");
    const initialCredits=initialText?Number(initialText):creditsFor(plan)||0;
    if(initialText&&(!/^\d+$/.test(initialText)||initialCredits>1000))issue(errors,"Members",row,"Credits on Confirmation must be 0–1000.");
    members.push({id,name,email,phone,plan,credits,joined,lastVisit:validateDay(errors,"Members",row,rawLast||"","Last Visit",true)||null,consent:yesNo(errors,"Members",row,rawConsent),status:status as Member["status"],notes,startDate:start,expiryDate:expiry,paymentStatus:paymentStatus as Member["paymentStatus"],sourceLeadId,initialCredits});
  });

  rows(tables,"Classes",errors).forEach((r,i)=>{
    const row=i+2,[rawId,rawTitle,rawCoach,rawDate,rawTime,rawCap]=r;
    const id=norm(rawId)||uid("s"),title=required(errors,"Classes",row,rawTitle,"Class Title",100),coach=required(errors,"Classes",row,rawCoach,"Instructor",80);
    if(!idValid(id)||ids.session.has(id))issue(errors,"Classes",row,"Invalid or duplicate Class ID.");
    ids.session.add(id);
    const time=norm(rawTime);
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))issue(errors,"Classes",row,"Time must be HH:MM in 24-hour format.");
    const cap=norm(rawCap),capacity=Number(cap);
    if(!/^\d+$/.test(cap)||!Number.isInteger(capacity)||capacity<1||capacity>100)issue(errors,"Classes",row,"Capacity must be 1–100.");
    const intOpt=(i:number,defaultValue:number,max:number,label:string)=>{const raw=norm(r[i]||"");const n=raw?Number(raw):defaultValue;if(!Number.isSafeInteger(n)||n<0||n>max)issue(errors,"Classes",row,label+" out of range.");return n;};
    const durationMinutes=intOpt(6,50,240,"Duration");
    if(durationMinutes<15)issue(errors,"Classes",row,"Duration must be at least 15 minutes.");
    if(time&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time)&&Number(time.slice(0,2))*60+Number(time.slice(3))+durationMinutes>1440)issue(errors,"Classes",row,"Session crosses midnight.");
    const room=norm(r[7]||"")||"Main studio";
    if(room.length>80)issue(errors,"Classes",row,"Room name too long.");
    const description=norm(r[11]||"");if(description.length>500)issue(errors,"Classes",row,"Description too long.");
    sessions.push({id,title,coach,date:validateDay(errors,"Classes",row,rawDate,"Date"),time,capacity,durationMinutes,room,seriesId:norm(r[8]||"")||undefined,bookingCutoffHours:intOpt(9,0,168,"Booking cutoff"),cancelCutoffHours:intOpt(10,0,168,"Cancellation cutoff"),description,booked:[],waitlist:[]});
  });

  for(const m of members)if(m.sourceLeadId&&!ids.lead.has(m.sourceLeadId))issue(errors,"Members",1,"Source Lead ID "+m.sourceLeadId+" was not found in Leads.");
  for(const [i,session] of sessions.entries())for(const prior of sessions.slice(0,i)){
    const a=Number(session.time.slice(0,2))*60+Number(session.time.slice(3)),b=Number(prior.time.slice(0,2))*60+Number(prior.time.slice(3));
    if(session.date===prior.date&&a<b+(prior.durationMinutes||50)&&b<a+(session.durationMinutes||50)&&(session.coach.toLowerCase()===prior.coach.toLowerCase()||(session.room||"Main studio").toLowerCase()===(prior.room||"Main studio").toLowerCase()))
      issue(errors,"Classes",1,"Coach/room conflict between "+session.id+" and "+prior.id+".");
  }
  const classIds=new Set(sessions.map(s=>s.id)),memberIds=new Set(members.map(m=>m.id)),seenBookings=new Set<string>();
  rows(tables,"Bookings",errors).forEach((r,i)=>{
    const row=i+2,classId=norm(r[0]),memberId=norm(r[1]),status=norm(r[2]);
    if(!classIds.has(classId))issue(errors,"Bookings",row,"Unknown Class ID "+classId);
    if(!memberIds.has(memberId))issue(errors,"Bookings",row,"Unknown Member ID "+memberId);
    if(!["Booked","Waitlisted"].includes(status))issue(errors,"Bookings",row,"Status must be Booked or Waitlisted.");
    const key=classId+"|"+memberId;
    if(seenBookings.has(key))issue(errors,"Bookings",row,"Duplicate member/class booking.");
    seenBookings.add(key);
    const session=sessions.find(s=>s.id===classId);
    if(session&&memberIds.has(memberId)){
      if(status==="Booked")session.booked.push(memberId);
      if(status==="Waitlisted")session.waitlist.push(memberId);
    }
  });
  for(const session of sessions){
    if(session.booked.length>session.capacity)issue(errors,"Bookings",1,"Class "+session.id+" has more bookings than capacity.");
    if(session.waitlist.length&&session.booked.length<session.capacity)issue(errors,"Bookings",1,"Class "+session.id+" has a waitlist while spots are still open.");
  }

  const checkPerson=(kind:string,id:string,sheet:SheetName,row:number)=>{
    if(kind!=="lead"&&kind!=="member"){issue(errors,sheet,row,'Person Type must be "lead" or "member".');return;}
    const present=kind==="lead"?ids.lead.has(id):ids.member.has(id);
    if(!present)issue(errors,sheet,row,"Unknown Person ID "+id);
  };
  rows(tables,"FollowUps",errors).forEach((r,i)=>{
    const row=i+2,id=norm(r[0])||uid("t"),kind=norm(r[1]),personId=norm(r[2]),reason=required(errors,"FollowUps",row,r[3],"Reason",240);
    if(!idValid(id)||ids.task.has(id))issue(errors,"FollowUps",row,"Invalid or duplicate Task ID.");
    ids.task.add(id);checkPerson(kind,personId,"FollowUps",row);
    const category=norm(r[7]||"")||"General",priority=norm(r[8]||"")||"Normal",dueTime=norm(r[9]||""),assignee=norm(r[10]||"")||"Studio owner",repeat=norm(r[11]||"")||"None",notes=norm(r[12]||""),outcome=norm(r[13]||""),completedAt=norm(r[14]||"");
    if(!["Call","Email","Renewal","Trial","General"].includes(category))issue(errors,"FollowUps",row,"Invalid Task Category.");
    if(!["Low","Normal","High"].includes(priority))issue(errors,"FollowUps",row,"Invalid Priority.");
    if(dueTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime))issue(errors,"FollowUps",row,"Due Time must be HH:MM.");
    if(!["None","Weekly","Monthly"].includes(repeat))issue(errors,"FollowUps",row,"Invalid Repeat.");
    if(outcome&&!["Contacted","No answer","Reschedule","Converted","Completed"].includes(outcome))issue(errors,"FollowUps",row,"Invalid Outcome.");
    if(notes.length>500||assignee.length>80)issue(errors,"FollowUps",row,"Task notes or assignee too long.");
    const completed=yesNo(errors,"FollowUps",row,r[5]);
    if(!completed&&outcome)issue(errors,"FollowUps",row,"Open tasks cannot have an Outcome.");
    tasks.push({id,personKind:kind as Task["personKind"],personId,reason,due:validateDay(errors,"FollowUps",row,r[4],"Due"),completed,created:validateDay(errors,"FollowUps",row,r[6],"Created"),category:category as Task["category"],priority:priority as Task["priority"],dueTime,assignee,repeat:repeat as Task["repeat"],notes,outcome:(outcome||undefined) as Task["outcome"],completedAt:validateDay(errors,"FollowUps",row,completedAt,"Completed At",true)||undefined});
  });
  rows(tables,"Activity",errors).forEach((r,i)=>{
    const row=i+2,id=norm(r[0])||uid("a"),kind=norm(r[1]),personId=norm(r[2]),text=required(errors,"Activity",row,r[3],"Description",700);
    if(!idValid(id)||ids.activity.has(id))issue(errors,"Activity",row,"Invalid or duplicate Activity ID.");
    ids.activity.add(id);checkPerson(kind,personId,"Activity",row);
    activities.push({id,personKind:kind as Activity["personKind"],personId,text,date:validateDay(errors,"Activity",row,r[4],"Date")});
  });
  const dismissed:string[]=[];
  rows(tables,"Dismissed",errors).forEach((r,i)=>{
    const id=norm(r[0]);
    if(!/^(trial|lead|renew|winback|expiry):[A-Za-z0-9_-]{1,80}$/.test(id))issue(errors,"Dismissed",i+2,"Unknown Opportunity ID pattern.");
    if(dismissed.includes(id))issue(errors,"Dismissed",i+2,"Duplicate Opportunity ID.");
    dismissed.push(id);
  });
  const counts={leads:leads.length,members:members.length,classes:sessions.length,bookings:sessions.reduce((n,s)=>n+s.booked.length+s.waitlist.length,0),tasks:tasks.length,activity:activities.length};
  if(!leads.length&&!members.length&&!sessions.length)issue(errors,"Guide",1,"Import must contain at least one lead, member or class.");
  return {valid:errors.length===0,errors,data:errors.length?null:{version:3,studioFocus:focus,studioName,leads,members,sessions,tasks,activities,closedOpportunities:dismissed},counts};
}
