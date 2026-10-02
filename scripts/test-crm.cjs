const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
const src=fs.readFileSync("lib/studio-crm.ts","utf8");
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function("module","exports",js)(mod,mod.exports);
const api=mod.exports;

const studio=api.makeSeed("Pilates");
assert.equal(studio.version,3);
assert.equal(studio.studioFocus,"Pilates");
assert.equal(studio.members.length,12);
assert.equal(studio.leads.length,10);
assert.equal(studio.sessions.length,9);
assert(api.isStudioData(studio));
assert(api.opportunities(studio).length>0);

const session=studio.sessions[0],member=studio.members.find(m=>m.id==="m8");
assert(member);
assert(!session.booked.includes(member.id));
const credits=member.credits;
assert.equal(typeof credits,"number");
const booked=api.bookMember(studio,session.id,member.id);
assert(booked.success);
assert.equal(booked.data.sessions[0].booked.length,session.booked.length+1);
assert.equal(booked.data.members.find(m=>m.id===member.id).credits,credits-1);
const duplicate=api.bookMember(booked.data,session.id,member.id);
assert(!duplicate.success);
const cancelled=api.cancelBooking(booked.data,session.id,member.id);
assert(cancelled.success);
assert.equal(cancelled.data.members.find(m=>m.id===member.id).credits,credits);
assert(!cancelled.data.sessions[0].booked.includes(member.id));

const full=studio.sessions[1];
assert.equal(full.booked.length,full.capacity);
const waiting=api.bookMember(studio,full.id,"m12");
assert(waiting.success);
assert.equal(waiting.data.sessions[1].booked.length,full.capacity);
assert(waiting.data.sessions[1].waitlist.includes("m12"));
const promoted=api.cancelBooking(studio,full.id,full.booked[0]);
assert(promoted.success);
assert.equal(promoted.data.sessions[1].booked.length,full.capacity);
assert(promoted.data.sessions[1].booked.includes("m9"));
assert(!promoted.data.sessions[1].waitlist.includes("m9"));
const waitExit=api.cancelBooking(waiting.data,full.id,"m12");
assert(waitExit.success);
assert(!waitExit.data.sessions[1].waitlist.includes("m12"));

const metrics=api.report(studio);
assert.equal(metrics.leads,10);
assert(metrics.occupancy>0&&metrics.occupancy<=100);
assert.equal(api.creditsFor("Unlimited Monthly"),null);
assert.equal(api.creditsFor("5 Class Pack"),5);
assert(api.draftFor("Amelia Hart","Renewal",studio.studioName).subject.includes(studio.studioName));

for(const focus of api.focuses){
  const sample=api.makeSeed(focus);
  assert.equal(sample.studioFocus,focus);
  assert(sample.sessions.every(s=>api.focusClasses[focus].includes(s.title)));
}
console.log("CRM regression suite: 19 assertions/workflow checks passed.");
