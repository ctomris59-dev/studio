export type CsvGrid=string[][];
export function parseCsv(text:string):CsvGrid{
 if(typeof text!=="string"||text.length===0)throw new Error("CSV file is empty.");
 if(text.length>512000)throw new Error("CSV file must be 500 KB or smaller.");
 if(text.includes("\u0000"))throw new Error("CSV contains unsupported null bytes.");
 const source=text.replace(/^\uFEFF/,"");

 // Infer separator from unquoted header delimiters, including Excel's regional exports.
 const delimiters=[",",";","\t"],counts=[0,0,0];let headerQuoted=false;
 for(let i=0;i<source.length;i++){
  const ch=source[i];if(ch==='"'){if(headerQuoted&&source[i+1]==='"'){i++;continue}headerQuoted=!headerQuoted;continue}
  if(!headerQuoted&&(ch==="\r"||ch==="\n"))break;
  if(!headerQuoted){const index=delimiters.indexOf(ch);if(index>=0)counts[index]++}
 }
 const delimiter=delimiters[counts.indexOf(Math.max(...counts))];
 const rows:string[][]=[];let row:string[]=[],field="",quoted=false;
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(quoted){
   if(ch==='"'&&source[i+1]==='"'){field+='"';i++;continue}
   if(ch==='"'){quoted=false;continue}
   field+=ch;
  }else{
   if(ch==='"'&&field.length===0){quoted=true;continue}
   if(ch===delimiter){row.push(field);field="";continue}
   if(ch==="\n"||ch==="\r"){
    if(ch==="\r"&&source[i+1]==="\n")i++;
    row.push(field);field="";
    if(row.some(x=>x.trim()!==""))rows.push(row);
    row=[];
    if(rows.length>501)throw new Error("CSV supports at most 500 data rows.");
    continue;
   }
   field+=ch;
  }
  if(field.length>2000)throw new Error("A CSV field is longer than 2,000 characters.");
 }
 if(quoted)throw new Error("CSV has an unterminated quoted field.");
 row.push(field);if(row.some(x=>x.trim()!==""))rows.push(row);
 if(rows.length<2)throw new Error("CSV needs a header and at least one data row.");
 if(rows.length>501)throw new Error("CSV supports at most 500 data rows.");
 if(rows[0].length>30)throw new Error("CSV supports at most 30 columns.");
 return rows;
}
export const headerKey=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9]+/g,"");
export function headerIndex(headers:string[],aliases:string[]):number{
 const normalized=headers.map(headerKey),wanted=new Set(aliases.map(headerKey));
 return normalized.findIndex(x=>wanted.has(x));
}
