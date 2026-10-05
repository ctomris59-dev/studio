"use client";

import {HEADERS,SHEETS,toExcelTables,fromExcelTables,type ExcelTables,type SheetName,type ValidationOutcome} from "./studio-excel";
import type {StudioData} from "./studio-crm";

const MIME="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const palettes={ink:"1B2237",blue:"334BDD",cream:"F4F0E7",citrus:"E7F982",white:"FFFFFF",gray:"68738A"};
const widths:Record<SheetName,number[]>={
  Guide:[29,94],Leads:[18,27,35,20,19,23,28,19,44,30,22,23,21,23],
  Members:[20,29,37,23,15,24,28,19,17,45,22,25,25,22,24,20],
  Classes:[20,30,24,25,21,15,20,22,22,23,23,38],Bookings:[22,22,27],
  FollowUps:[20,27,20,44,24,23,26,20,16,19,24,18,34,20,22],
  Activity:[20,27,20,54,26],Dismissed:[32]
};
const selection:Partial<Record<SheetName,{col:number;items:string[]}[]>>={
  Leads:[{col:4,items:["New","Contacted","Trial booked","Trial attended","Won","Lost"]},{col:8,items:["Yes","No"]},{col:13,items:["Either","Email","Phone"]}],
  Members:[{col:4,items:["5 Class Pack","10 Class Pack","Unlimited Monthly"]},{col:8,items:["Yes","No"]},{col:9,items:["Active","Paused"]},{col:14,items:["Pending","Confirmed"]}],
  Bookings:[{col:3,items:["Booked","Waitlisted"]}],
  FollowUps:[{col:2,items:["lead","member"]},{col:6,items:["Yes","No"]},{col:8,items:["Call","Email","Renewal","Trial","General"]},{col:9,items:["Low","Normal","High"]},{col:12,items:["None","Weekly","Monthly"]},{col:14,items:["Contacted","No answer","Reschedule","Converted","Completed"]}],
  Activity:[{col:2,items:["lead","member"]}]
};
function cellValue(value:unknown):string{
  if(value===null||value===undefined)return "";
  if(value instanceof Date){
    if(!Number.isFinite(value.getTime()))return "";
    return value.toISOString().slice(0,10);
  }
  if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value);
  if(typeof value==="object"){
    const v=value as Record<string,unknown>;
    if("formula" in v||"sharedFormula" in v)throw new Error("Excel formulas cannot be imported. Please paste plain values.");
    if("text" in v&&typeof v.text==="string")return v.text;
    if("richText" in v)throw new Error("Please convert rich-text cells to plain text before import.");
  }
  throw new Error("Unsupported Excel cell. Use plain text, number, or dates in YYYY-MM-DD.");
}
function saveBlob(blob:Blob,name:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export async function downloadExcelWorkbook(data:StudioData,template=false):Promise<void>{
  const ExcelJS=await import("exceljs");
  const wb=new ExcelJS.Workbook();
  wb.creator="StudioTasker";wb.title=template?"StudioTasker CRM Import Template":"StudioTasker CRM Export";
  wb.subject="Studio CRM structured records";wb.company="StudioTasker";
  const tables=toExcelTables(data,template);
  for(const name of SHEETS){
    const sheet=wb.addWorksheet(name);
    const rows=tables[name];
    sheet.columns=HEADERS[name].map((h,i)=>({header:h,key:"c"+i,width:widths[name][i]||19,style:{numFmt:"@"}}));
    sheet.views=[{state:"frozen",ySplit:1}];
    sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:HEADERS[name].length}};
    sheet.getRow(1).height=33;
    sheet.getRow(1).eachCell(cell=>{
      cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+palettes.ink}};
      cell.font={name:"Aptos",size:11,bold:true,color:{argb:"FF"+palettes.white}};
      cell.alignment={vertical:"middle",wrapText:true,indent:1};
      cell.border={bottom:{style:"medium",color:{argb:"FF"+palettes.blue}}};
    });
    // Column definitions write headers; data begins on row 2.
    for(const [i,row] of rows.slice(1).entries()){
      const excelRow=sheet.addRow(row);
      excelRow.height=23;
      excelRow.eachCell({includeEmpty:true},cell=>{
        cell.font={name:"Aptos",size:11,color:{argb:"FF"+palettes.ink}};
        cell.alignment={vertical:"middle",wrapText:false};
        cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+(i%2===0?"FFFFFF":"F4F0E7")}};
      });
    }
    if(template&&name!=="Guide"){
      for(let i=2;i<=101;i++){
        sheet.getRow(i).height=22;
        if(i%2===0){
          const row=sheet.getRow(i);
          for(let c=1;c<=HEADERS[name].length;c++)row.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF4F0E7"}};
        }
      }
    }
    const maxValidationRow=Math.max(101,Math.min(5001,rows.length+50));
    for(const rule of selection[name]||[]){
      for(let i=2;i<=maxValidationRow;i++){
        sheet.getRow(i).getCell(rule.col).dataValidation={type:"list",allowBlank:true,formulae:['"'+rule.items.join(",")+'"']};
      }
    }
    if(name==="Guide"){
      sheet.getColumn(2).alignment={vertical:"middle",wrapText:true};
      for(let i=2;i<=Math.max(2,rows.length);i++)sheet.getRow(i).height=30;
      sheet.properties.tabColor={argb:"FF"+palettes.blue};
    }else if(name==="Leads"||name==="Members"){
      sheet.properties.tabColor={argb:"FF"+palettes.citrus};
    }
  }
  const out=await wb.xlsx.writeBuffer();
  saveBlob(new Blob([new Uint8Array(out as unknown as ArrayBuffer)],{type:MIME}),template?"StudioTasker_Excel_Import_Template.xlsx":"StudioTasker_CRM_Export.xlsx");
}
export async function previewExcelImport(file:File):Promise<ValidationOutcome>{
  if(!/\.xlsx$/i.test(file.name))throw new Error("Only .xlsx files are supported. Download and use the StudioTasker Excel template.");
  if(file.size>8*1024*1024)throw new Error("Excel file too large (maximum 8 MB).");
  const ExcelJS=await import("exceljs");
  const wb=new ExcelJS.Workbook();
  await wb.xlsx.load(new Uint8Array(await file.arrayBuffer()) as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const tables={} as ExcelTables;
  for(const name of SHEETS){
    const sheet=wb.getWorksheet(name);
    if(!sheet){tables[name]=[];continue;}
    if(sheet.rowCount>5001)throw new Error(name+" has too many rows (maximum 5,000 plus header).");
    const matrix:string[][]=[];
    // Preserve declared header order. Reject non-empty, undocumented extra columns.
    for(let i=1;i<=Math.max(1,sheet.rowCount);i++){
      const row=sheet.getRow(i);
      const record:string[]=[];
      for(let j=1;j<=HEADERS[name].length;j++){
        try{record.push(cellValue(row.getCell(j).value));}
        catch(e){throw new Error(name+"!"+i+": "+(e instanceof Error?e.message:"Unsupported cell."));}
      }
      const extraneous=row.values as unknown[];
      if(extraneous&&extraneous.length>HEADERS[name].length+1&&extraneous.slice(HEADERS[name].length+1).some(v=>v!==null&&v!==undefined&&String(v).trim()!=="")){
        throw new Error(name+"!"+i+": Unexpected extra columns. Use the original template.");
      }
      matrix.push(record);
    }
    tables[name]=matrix;
  }
  return fromExcelTables(tables);
}
