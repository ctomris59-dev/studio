const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
const ExcelJS=require("exceljs");

function transpile(path,customRequire){
  const text=fs.readFileSync(path,"utf8");
  const js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function("require","module","exports",js)(customRequire,module,module.exports);
  return module.exports;
}
const studio=transpile("lib/studio-crm.ts",require);
const format=transpile("lib/studio-excel.ts",path=>path==="./studio-crm"?studio:require(path));
const clone=x=>JSON.parse(JSON.stringify(x));
const original=studio.makeSeed("Pilates");
const rows=format.toExcelTables(original);
const result=format.fromExcelTables(rows);
assert(result.valid,JSON.stringify(result.errors));
assert.equal(result.data.leads.length,original.leads.length);
assert.equal(result.data.members.length,original.members.length);
assert.equal(result.data.sessions.length,original.sessions.length);
assert.equal(result.counts.bookings,original.sessions.reduce((n,s)=>n+s.booked.length+s.waitlist.length,0));
const sessionCore=s=>({id:s.id,title:s.title,coach:s.coach,date:s.date,time:s.time,capacity:s.capacity,booked:s.booked,waitlist:s.waitlist});
const taskCore=t=>({id:t.id,personKind:t.personKind,personId:t.personId,reason:t.reason,due:t.due,completed:t.completed,created:t.created});
assert.deepEqual(result.data.sessions.map(sessionCore),original.sessions.map(sessionCore));
assert.deepEqual(result.data.tasks.map(taskCore),original.tasks.map(taskCore));
assert.equal(result.data.sessions[0].durationMinutes,50);
assert.equal(result.data.sessions[0].room,"Main studio");
assert.equal(result.data.members[0].paymentStatus,"Paid");
assert.deepEqual(result.data.activities,original.activities);
assert.deepEqual(result.data.closedOpportunities,original.closedOpportunities);
assert.equal(format.SHEETS.length,8);
assert.equal(rows.Leads[0].length,format.HEADERS.Leads.length);

const wrongHeader=clone(rows);wrongHeader.Members[0][1]="Client";assert(!format.fromExcelTables(wrongHeader).valid);
const wrongStage=clone(rows);wrongStage.Leads[1][3]="Interested";assert(!format.fromExcelTables(wrongStage).valid);
const duplicateMember=clone(rows);duplicateMember.Members[2][2]=duplicateMember.Members[1][2];assert(!format.fromExcelTables(duplicateMember).valid);
const badDate=clone(rows);badDate.Leads[1][5]="2026-02-30";assert(!format.fromExcelTables(badDate).valid);
const wrongRef=clone(rows);wrongRef.Bookings[1][1]="m-does-not-exist";assert(!format.fromExcelTables(wrongRef).valid);
const overCapacity=clone(rows);overCapacity.Classes[1][5]="1";assert(!format.fromExcelTables(overCapacity).valid);
const duplicateBooking=clone(rows);duplicateBooking.Bookings.push(clone(rows.Bookings[1]));assert(!format.fromExcelTables(duplicateBooking).valid);
const badConsent=clone(rows);badConsent.Members[1][7]="Maybe";assert(!format.fromExcelTables(badConsent).valid);
const wrongVersion=clone(rows);wrongVersion.Guide[1][1]="Unknown format";assert(!format.fromExcelTables(wrongVersion).valid);
const empty=format.toExcelTables(original,true);assert(!format.fromExcelTables(empty).valid);
const oneLead=clone(empty);oneLead.Leads.push(rows.Leads[1]);assert(format.fromExcelTables(oneLead).valid);
const priorError=clone(rows);priorError.Bookings[1][2]="Paid";assert(!format.fromExcelTables(priorError).valid);
const old=clone(rows);
old.Guide[1][1]="ReformDesk Excel v1";
for(const name of ["Leads","Members","Classes","FollowUps"]){
 const minimum={Leads:10,Members:10,Classes:6,FollowUps:7}[name];
 old[name]=old[name].map(row=>row.slice(0,minimum));
}
assert(format.fromExcelTables(old).valid,"Legacy v1 data must remain importable");
const withPhone=clone(rows);withPhone.Leads[1][2]="";withPhone.Leads[1][10]="+441234567890";
assert(format.fromExcelTables(withPhone).valid,"Phone-only leads must import");
const badPhone=clone(withPhone);badPhone.Leads[1][10]="abc";
assert(!format.fromExcelTables(badPhone).valid);
const badPayment=clone(rows);badPayment.Members[1][13]="Pending";badPayment.Members[1][4]="4";assert(!format.fromExcelTables(badPayment).valid);
const enriched=clone(rows);enriched.Classes[1][6]="75";enriched.Classes[1][7]="Room D";enriched.Classes[1][9]="3";
enriched.Members[1][12]=studio.day(60);enriched.Leads[1][11]="Pilates";
enriched.FollowUps[1][7]="Call";enriched.FollowUps[1][8]="High";
const enrichedResult=format.fromExcelTables(enriched);
assert(enrichedResult.valid,JSON.stringify(enrichedResult.errors));
assert.equal(enrichedResult.data.sessions[0].durationMinutes,75);
assert.equal(enrichedResult.data.sessions[0].room,"Room D");
assert.equal(enrichedResult.data.leads[0].preferredService,"Pilates");


async function main(){
  const wb=new ExcelJS.Workbook();
  for(const name of format.SHEETS){
    const sheet=wb.addWorksheet(name);
    for(const row of rows[name])sheet.addRow(row);
  }
  const binary=await wb.xlsx.writeBuffer();
  assert(binary.byteLength>1000);
  const saved=new ExcelJS.Workbook();
  await saved.xlsx.load(binary);
  const restored={};
  for(const name of format.SHEETS){
    const sheet=saved.getWorksheet(name);assert(sheet);
    restored[name]=[];
    for(let i=1;i<=sheet.rowCount;i++){
      const row=[];
      for(let j=1;j<=format.HEADERS[name].length;j++){
        const value=sheet.getRow(i).getCell(j).value;
        row.push(value==null?"":String(value));
      }
      restored[name].push(row);
    }
  }
  const roundTrip=format.fromExcelTables(restored);
  assert(roundTrip.valid,JSON.stringify(roundTrip.errors));
  assert.deepEqual(roundTrip.data.sessions.map(sessionCore),original.sessions.map(sessionCore));
  console.log("Excel: v2 workbook round-trip, legacy v1 import and expanded validation cases passed.");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
