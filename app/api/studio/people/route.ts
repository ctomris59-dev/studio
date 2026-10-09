import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail} from "@/lib/auth-crypto";
export const runtime="nodejs";
const staffRoles=["owner","manager","receptionist"] as const;
export async function GET(request:NextRequest){
 const offset=Number(request.nextUrl.searchParams.get("offset")||0);
 const search=request.nextUrl.searchParams.get("search")?.trim()||"";
 const pattern="%"+search.replace(/[!%_]/g,character=>"!"+character)+"%";
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000||search.length>80)
  return errorResponse(400,"Invalid search or page offset.");
 try{
  const r=await authenticated(request,staffRoles,async(client,auth)=>{
   const kind=request.nextUrl.searchParams.get("kind");
   if(kind&&kind!=="lead"&&kind!=="member")return {badKind:true};
   const result=await client.query(`SELECT id,kind,full_name,email,phone,lead_stage,notes,member_status,tags,waiver_status,waiver_updated_at,related_contact_name,related_contact_role,related_contact_email,related_contact_phone,created_at
      FROM people WHERE studio_id=$1 AND archived_at IS NULL AND ($2::text IS NULL OR kind=$2)
      AND ($3::text='%%' OR full_name ILIKE $3 ESCAPE '!' OR email ILIKE $3 ESCAPE '!' OR phone ILIKE $3 ESCAPE '!')
      ORDER BY created_at DESC,id DESC LIMIT 101 OFFSET $4`,[auth.studioId,kind||null,pattern,offset]);
   return {records:result.rows.slice(0,100),hasMore:result.rows.length>100,nextOffset:offset+Math.min(100,result.rows.length)};
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  if(r.value&&"badKind" in r.value)return errorResponse(400,"Invalid kind.");
  return successResponse(r.value);
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 if(!body)return errorResponse(400,"Invalid request.");
 const name=stringField(body,"name",80),kind=stringField(body,"kind",12);
 const email=body.email===undefined?"":stringField(body,"email",160);
 const phone=body.phone===undefined?"":stringField(body,"phone",30);
 const notes=body.notes===undefined?"":stringField(body,"notes",1600);
 const tags=body.tags===undefined?[]:Array.isArray(body.tags)&&body.tags.length<=12&&body.tags.every(x=>typeof x==="string"&&x.trim().length>=1&&x.trim().length<=30)
  ?Array.from(new Set((body.tags as string[]).map(x=>x.trim()))):null;
 const waiverStatus=body.waiverStatus===undefined?"not_required":stringField(body,"waiverStatus",20);
 const relatedContactName=body.relatedContactName===undefined?"":stringField(body,"relatedContactName",100);
 const relatedContactRole=body.relatedContactRole===undefined?"":stringField(body,"relatedContactRole",40);
 const relatedContactEmail=body.relatedContactEmail===undefined?"":stringField(body,"relatedContactEmail",160);
 const relatedContactPhone=body.relatedContactPhone===undefined?"":stringField(body,"relatedContactPhone",30);
 if(!name||name.length<2||!["lead","member"].includes(kind||"")||email===null||phone===null||notes===null||tags===null||waiverStatus===null||
    relatedContactName===null||relatedContactRole===null||relatedContactEmail===null||relatedContactPhone===null||
    (!email&&!phone)||email&&!emailIsValid(normalizeEmail(email))||
    phone&&!/^\+?[0-9]{7,15}$/.test(phone.replace(/[\s().-]/g,""))||
    relatedContactEmail&&!emailIsValid(normalizeEmail(relatedContactEmail))||
    relatedContactPhone&&!/^\+?[0-9]{7,15}$/.test(relatedContactPhone.replace(/[\s().-]/g,""))||
    !["not_required","pending","signed","expired"].includes(waiverStatus))
    return errorResponse(400,"Provide valid contact, member tag and waiver details.");
 try{
  const r=await authenticated(request,staffRoles,async(client,auth)=>{
   const normalizedPhone=(phone||"").replace(/[\s().-]/g,"");
   const isMember=kind==="member";
   const record=await client.query(`INSERT INTO people
      (studio_id,kind,full_name,email,phone,lead_stage,member_status,package_status,credits,notes,tags,waiver_status,waiver_updated_at,
       related_contact_name,related_contact_role,related_contact_email,related_contact_phone)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id,kind,full_name,email,phone,notes,tags,waiver_status,related_contact_name,related_contact_role,related_contact_email,related_contact_phone,created_at`,[
       auth.studioId,kind,name,normalizeEmail(email||""),normalizedPhone,
       kind==="lead"?"New":null,isMember?"Active":null,isMember?"Pending":null,isMember?0:null,
       notes||"",isMember?tags:[],isMember?waiverStatus:"not_required",isMember&&waiverStatus!=="not_required"?new Date().toISOString():null,
       isMember?relatedContactName:"",isMember?relatedContactRole:"",isMember?normalizeEmail(relatedContactEmail||""):"",
       isMember?(relatedContactPhone||"").replace(/[\s().-]/g,""):""
      ]);
   await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action)
      VALUES($1,$2,$3,'person.created')`,[auth.studioId,record.rows[0].id,auth.userId]);
   return record.rows[0];
  });
  if(!r.access.ok)return errorResponse(r.access.status,r.access.message);
  return successResponse({record:r.value},201);
 }catch(e){
  if((e as {code?:string}).code==="23505")return errorResponse(409,"Contact already exists in this studio.");
  return backendError();
 }
}
