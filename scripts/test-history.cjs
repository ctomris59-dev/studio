const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");

function transpile(path) {
  const content=fs.readFileSync(path,"utf8");
  const code=ts.transpileModule(content,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const mod={exports:{}};
  new Function("module","exports",code)(mod,mod.exports);
  return mod.exports;
}
const studio=transpile("lib/studio-crm.ts");
const {adjustMemberCredits,initialHistory,studioHistoryReducer}=transpile("lib/studio-history.ts");
const sample=studio.makeSeed("Pilates");
const m=sample.members.find(x=>x.credits!==null && x.credits>=5);
assert(m);
const starting=m.credits;
const added=adjustMemberCredits(sample,m.id,5,"Balance correction","test-add",studio.day());
assert(added.success);
assert.equal(added.data.members.find(x=>x.id===m.id).credits,starting+5);
assert.equal(added.data.activities.length,sample.activities.length+1);
assert(added.data.activities[0].text.includes("Balance correction"));

const removed=adjustMemberCredits(added.data,m.id,-5,"Revoke mistaken credits","test-minus",studio.day());
assert(removed.success);
assert.equal(removed.data.members.find(x=>x.id===m.id).credits,starting);
assert.equal(removed.data.activities.length,sample.activities.length+2);

const belowZero=adjustMemberCredits(sample,m.id,-starting-1,"Overdraw","test-bad",studio.day());
assert(!belowZero.success);
assert.equal(belowZero.data,sample);
assert(!adjustMemberCredits(sample,m.id,0,"Zero","test-bad",studio.day()).success);
assert(!adjustMemberCredits(sample,m.id,-1,"","test-bad",studio.day()).success);
assert(!adjustMemberCredits(sample,m.id,1.5,"Fractional","test-bad",studio.day()).success);
assert(!adjustMemberCredits(sample,m.id,1001,"Too large","test-bad",studio.day()).success);
assert(!adjustMemberCredits(sample,"missing",1,"Missing","test-bad",studio.day()).success);
const unlimited=sample.members.find(x=>x.credits===null);
assert(unlimited);
assert(!adjustMemberCredits(sample,unlimited.id,-1,"Should fail","test-bad",studio.day()).success);

let state=initialHistory(sample);
assert.equal(state.past.length,0);
state=studioHistoryReducer(state,{type:"apply",change:()=>added.data,label:"Added 5 credits"});
assert.equal(state.present.members.find(x=>x.id===m.id).credits,starting+5);
assert.equal(state.past.length,1);
state=studioHistoryReducer(state,{type:"undo"});
assert.equal(state.present.members.find(x=>x.id===m.id).credits,starting);
assert.equal(state.present.activities.length,sample.activities.length);
assert.equal(state.future.length,1);
state=studioHistoryReducer(state,{type:"redo"});
assert.equal(state.present.members.find(x=>x.id===m.id).credits,starting+5);
assert.equal(state.future.length,0);
state=studioHistoryReducer(state,{type:"undo"});
state=studioHistoryReducer(state,{type:"apply",change:()=>removed.data,label:"Manual change"});
assert.equal(state.future.length,0);
assert.equal(studioHistoryReducer(state,{type:"redo"}),state);

const noOp=studioHistoryReducer(state,{type:"apply",change:previous=>previous,label:"No change"});
assert.equal(noOp,state);
let capped=initialHistory(sample);
for(let i=0;i<24;i++){
  const value=i;
  capped=studioHistoryReducer(capped,{type:"apply",change:previous=>({...previous,studioName:"Test "+value}),label:"rename"});
}
assert.equal(capped.past.length,15);
const empty=studioHistoryReducer(initialHistory(sample),{type:"undo"});
assert.equal(empty.present,sample);
assert.equal(empty.past.length,0);

const classId=sample.sessions[0].id;
const booker=sample.members.find(x=>x.id==="m8");
assert(booker);
const booked=studio.bookMember(sample,classId,booker.id);
assert(booked.success);
let bookedState=studioHistoryReducer(initialHistory(sample),{type:"apply",change:()=>booked.data,label:"Booked a class"});
bookedState=studioHistoryReducer(bookedState,{type:"undo"});
assert.equal(bookedState.present.sessions[0].booked.length,sample.sessions[0].booked.length);
assert.equal(bookedState.present.members.find(x=>x.id===booker.id).credits,booker.credits);
const loaded=studioHistoryReducer(state,{type:"load",data:sample});
assert.equal(loaded.present,sample);
assert.equal(loaded.past.length,0);
assert.equal(loaded.future.length,0);
console.log("CRM credit adjustment and Undo / Redo regression checks passed.");
