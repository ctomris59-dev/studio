import "server-only";
import type {PoolClient} from "pg";
import {emailIsValid,normalizeEmail} from "@/lib/auth-crypto";
import {parseCsv,headerIndex} from "@/lib/csv-import-core";

export type ImportContact={
 row:number;kind:"lead"|"member";name:string;email:string;phone:string;notes:string;
 leadStage:"New"|"Contacted"|"Trial booked"|"Trial attended"|"Won"|"Lost"|null;
 memberStatus:"Active"|"Paused"|null;plan:string|null;credits:number|null;
 packageStatus:"Pending"|"Paid"|null;expiryDate:string|null;startDate:string|null;
 ready:boolean;issues:string[];warnings:string[];
};
const dateValid=(value:string)=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+"T12:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
};
const clipped=(v:string|undefined,max:number)=>String(v||"").trim().slice(0,max);
export async function analyzeCsvImport(client:PoolClient,studioId:string,csv:string){
 const grid=parseCsv(csv),headers=grid[0];
 const col=(...names:string[])=>headerIndex(headers,names);
 const indexes={
  name:col("name","full name","member name","client name","customer name"),
  email:col("email","email address"),phone:col("phone","mobile","phone number"),
  kind:col("type","kind","contact type"),credits:col("credits","class credits","remaining credits"),
  expiry:col("expiry","expiry date","expires","expiration date"),start:col("start date","joined","join date"),
  stage:col("lead stage","stage"),notes:col("notes","note"),plan:col("plan","package","membership"),
  packageStatus:col("package status","payment status"),memberStatus:col("member status","status")
 };
 if(indexes.name<0)throw new Error("CSV needs a Name or Full Name column.");
 const parsed:ImportContact[]=grid.slice(1).map((cells,idx)=>{
  const issues:string[]=[],warnings:string[]=[];const get=(i:number)=>i<0?"":clipped(cells[i],2000);
  const name=clipped(get(indexes.name),80),rawKind=get(indexes.kind).toLowerCase();
  const kind:ImportContact["kind"]=rawKind==="lead"?"lead":"member";
  if(rawKind&&!["lead","member"].includes(rawKind))issues.push("Type must be lead or member.");
  if(name.length<2)issues.push("Name must contain at least two characters.");
  const rawEmail=normalizeEmail(get(indexes.email)),rawPhone=get(indexes.phone).replace(/[\s().-]/g,"");
  if(!rawEmail&&!rawPhone)issues.push("Email or phone is required.");
  if(rawEmail&&!emailIsValid(rawEmail))issues.push("Email address is invalid.");
  if(rawPhone&&!/^\+?[0-9]{7,15}$/.test(rawPhone))issues.push("Phone number is invalid.");
  const notes=clipped(get(indexes.notes),1600),plan=clipped(get(indexes.plan),70)||null;
  const start=get(indexes.start)||null,expiry=get(indexes.expiry)||null;
  if(start&&!dateValid(start))issues.push("Start date must use YYYY-MM-DD.");
  if(expiry&&!dateValid(expiry))issues.push("Expiry date must use YYYY-MM-DD.");
  if(start&&expiry&&expiry<start)issues.push("Expiry cannot be before start date.");
  if(kind==="lead"){
   const raw=get(indexes.stage)||"New";
   const allowed=["New","Contacted","Trial booked","Trial attended","Won","Lost"] as const;
   const stage=allowed.find(x=>x.toLowerCase()===raw.toLowerCase())||null;
   if(!stage)issues.push("Lead stage is invalid.");
   if(get(indexes.credits)||get(indexes.packageStatus))warnings.push("Package fields are ignored for leads.");
   return {row:idx+2,kind,name,email:rawEmail,phone:rawPhone,notes,leadStage:stage,memberStatus:null,plan:null,credits:null,packageStatus:null,expiryDate:null,startDate:null,ready:issues.length===0,issues,warnings};
  }
  let credits:number|null=null;const rawCredits=get(indexes.credits);
  if(rawCredits!==""){
   const n=Number(rawCredits);if(!Number.isSafeInteger(n)||n<0||n>1000)issues.push("Credits must be a whole number from 0 to 1000.");else credits=n;
  }
  const rawPackage=get(indexes.packageStatus).toLowerCase();
  let packageStatus:"Pending"|"Paid"=rawPackage==="paid"?"Paid":"Pending";
  if(rawPackage&&!["paid","pending"].includes(rawPackage))issues.push("Package status must be Paid or Pending.");
  if(!rawPackage&&credits!==null){packageStatus="Paid";warnings.push("Existing imported credits are treated as a migration entitlement, not as payment verification.");}
  if(packageStatus==="Paid"&&credits===null)issues.push("Paid imports need an explicit credits value. Unlimited migration is not supported yet.");
  if(packageStatus==="Pending")credits=0;
  const rawStatus=get(indexes.memberStatus).toLowerCase();
  const memberStatus:"Active"|"Paused"=rawStatus==="paused"?"Paused":"Active";
  if(rawStatus&&!["active","paused"].includes(rawStatus))issues.push("Member status must be Active or Paused.");
  return {row:idx+2,kind,name,email:rawEmail,phone:rawPhone,notes,leadStage:null,memberStatus,plan:plan||"Imported membership",credits,packageStatus,expiryDate:expiry,startDate:start,ready:issues.length===0,issues,warnings};
 });
 const emails=[...new Set(parsed.filter(x=>x.email).map(x=>x.email))],phones=[...new Set(parsed.filter(x=>x.phone).map(x=>x.phone))];
 const existing=await client.query<{email:string;phone:string}>(`
  SELECT lower(email) AS email,phone FROM people
  WHERE studio_id=$1 AND archived_at IS NULL
   AND (($2::text[]<>ARRAY[]::text[] AND lower(email)=ANY($2::text[]))
    OR ($3::text[]<>ARRAY[]::text[] AND phone=ANY($3::text[])))`,[studioId,emails,phones]);
 const existingEmails=new Set(existing.rows.map(x=>x.email).filter(Boolean)),existingPhones=new Set(existing.rows.map(x=>x.phone).filter(Boolean));
 const seenEmails=new Set<string>(),seenPhones=new Set<string>();
 for(const row of parsed){
  if(row.email&&(existingEmails.has(row.email)||seenEmails.has(row.email)))row.issues.push("Email already exists in this studio or CSV.");
  if(row.phone&&(existingPhones.has(row.phone)||seenPhones.has(row.phone)))row.issues.push("Phone already exists in this studio or CSV.");
  if(row.email)seenEmails.add(row.email);if(row.phone)seenPhones.add(row.phone);
  row.ready=row.issues.length===0;
 }
 return {rows:parsed,summary:{rows:parsed.length,ready:parsed.filter(x=>x.ready).length,skipped:parsed.filter(x=>!x.ready).length,warnings:parsed.reduce((n,x)=>n+x.warnings.length,0)}};
}
