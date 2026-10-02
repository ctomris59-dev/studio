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
assert.deepEqual(result.data.sessions,original.sessions);
assert.deepEqual(result.data.tasks,original.tasks);
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
  assert.deepEqual(roundTrip.data.sessions,original.sessions);
  console.log("Excel workbook: export/import round-trip + 12 validation cases passed.");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
