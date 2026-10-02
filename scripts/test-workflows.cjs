const assert=require("node:assert/strict");
const fs=require("node:fs");const ts=require("typescript");
function load(file,customRequire=require){
  const js=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};new Function("require","module","exports",js)(customRequire,module,module.exports);return module.exports;
}
const crm=load("lib/studio-crm.ts");
const workflow=load("lib/studio-workflows.ts",p=>p==="./studio-crm"?crm:require(p));
let sample=crm.makeSeed("Pilates");
const source={
  name:"Taylor Example",email:"",phone:"+441234567890",source:"Website",stage:"New",
  nextContact:crm.day(1),notes:"Morning classes",preferredService:"Pilates",
  preferredChannel:"Phone",interestPlan:"5 Class Pack",consent:false
};
const lead=workflow.addLead(sample,source);
assert(lead.ok,lead.message);
assert.equal(lead.data.leads[0].email,"");
assert.equal(lead.data.leads[0].phone,"+441234567890");
assert.equal(lead.data.tasks.length,sample.tasks.length+1);
assert(!workflow.addLead(lead.data,source).ok);
assert(!workflow.addLead(sample,{...source,email:"",phone:""}).ok);
const linked=workflow.convertLead(lead.data,lead.data.leads[0].id);
assert(linked.ok,linked.message);
const member=linked.data.members[0];
assert.equal(member.phone,source.phone);
assert.equal(member.notes,source.notes);
assert.equal(member.sourceLeadId,lead.data.leads[0].id);
assert.equal(member.paymentStatus,"Pending");
assert.equal(member.credits,0);
assert.equal(member.initialCredits,5);
assert.equal(linked.data.leads[0].stage,"Won");
assert(!workflow.convertLead(linked.data,lead.data.leads[0].id).ok);
assert(!crm.bookMember(linked.data,linked.data.sessions[0].id,member.id).success);
const activated=workflow.confirmPackage(linked.data,member.id);
assert(activated.ok);
assert.equal(activated.data.members.find(m=>m.id===member.id).credits,5);
assert.equal(activated.data.members.find(m=>m.id===member.id).paymentStatus,"Paid");
const booked=crm.bookMember(activated.data,activated.data.sessions[0].id,member.id);
assert(booked.success);
assert(!workflow.confirmPackage(activated.data,member.id).ok);

const memberInput={name:"Another Member",email:"another@example.org",phone:"",plan:"10 Class Pack",startDate:crm.day(),expiryDate:crm.day(10),
  credits:10,paymentStatus:"Pending",status:"Active",notes:"",consent:false,sourceLeadId:""};
const pending=workflow.addMember(sample,memberInput);
assert(pending.ok);assert.equal(pending.data.members[0].credits,0);
assert(!workflow.addMember(sample,{...memberInput,expiryDate:crm.day(-1)}).ok);

const nextDate=crm.day(22);
const classInput={title:"Functional Circuit",coach:"New Coach",date:nextDate,time:"10:00",durationMinutes:50,capacity:8,room:"Studio B",
  bookingCutoffHours:0,cancelCutoffHours:0,description:"",repeat:false,weekdays:[1,3,5],endDate:crm.day(40)};
const one=workflow.addClasses(sample,classInput);
assert(one.ok,one.message);assert.equal(one.created,1);
assert.equal(one.data.sessions[one.data.sessions.length-1].room,"Studio B");
const collision=workflow.addClasses(one.data,{...classInput,title:"Other workout",coach:"Different coach",time:"10:15"});
assert(!collision.ok);
assert.equal(collision.data,one.data);
const repeat=workflow.addClasses(one.data,{...classInput,date:crm.day(35),time:"13:00",room:"Other room",repeat:true,endDate:crm.day(56),weekdays:[1,3,5]});
assert(repeat.ok,repeat.message);assert(repeat.created>=8&&repeat.created<=12);
assert.equal(new Set(repeat.data.sessions.slice(-repeat.created).map(c=>c.seriesId)).size,1);
assert(!workflow.addClasses(sample,{...classInput,repeat:true,endDate:crm.day(300)}).ok);
assert(!workflow.addClasses(sample,{...classInput,date:crm.day(7),time:"23:50"}).ok);

const task=workflow.addTask(sample,{personKind:"lead",personId:sample.leads[0].id,reason:"Call",category:"Call",priority:"High",due:crm.day(1),dueTime:"12:30",assignee:"Studio owner",repeat:"Weekly",notes:"Follow up"});
assert(task.ok);
const completion=workflow.completeTask(task.data,task.data.tasks[0].id,"No answer");
assert(completion.ok);
assert.equal(completion.data.tasks.filter(t=>t.completed&&t.outcome==="No answer").length,1);
assert.equal(completion.data.tasks.filter(t=>!t.completed&&t.reason==="Call").length,1);
assert.equal(completion.data.tasks.find(t=>!t.completed&&t.reason==="Call").due,crm.day(8));
assert(!workflow.completeTask(completion.data,task.data.tasks[0].id,"Contacted").ok);
const resched=workflow.addTask(sample,{personKind:"lead",personId:sample.leads[0].id,reason:"Call again",category:"Call",priority:"Normal",due:crm.day(1),dueTime:"",assignee:"Owner",repeat:"None",notes:""});
assert(resched.ok);
const reDone=workflow.completeTask(resched.data,resched.data.tasks[0].id,"Reschedule");
assert(reDone.ok);
assert(reDone.data.tasks.some(t=>!t.completed&&t.reason==="Call again"));

const convertFollow=workflow.addTask(sample,{personKind:"lead",personId:sample.leads[1].id,reason:"Convert trial",category:"Trial",priority:"High",due:crm.day(),dueTime:"",assignee:"Owner",repeat:"None",notes:""});
assert(convertFollow.ok);
const converted=workflow.completeTask(convertFollow.data,convertFollow.data.tasks[0].id,"Converted");
assert(converted.ok,converted.message);
assert(converted.data.members.some(m=>m.sourceLeadId===sample.leads[1].id&&m.paymentStatus==="Pending"));
assert(converted.data.leads.find(l=>l.id===sample.leads[1].id).stage==="Won");

console.log("Extended CRM flows: contact validation, pending credits, conversion, recurrence, conflict, follow-up outcomes passed.");
