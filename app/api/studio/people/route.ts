import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail} from "@/lib/auth-crypto";
export const runtime="nodejs";
const staffRoles=["owner","manager","receptionist"] as const;
export async function GET(request:NextRequest){
 try{
  const r=await authenticated(request,staffRoles,async(client,auth)=>{
   const kind=request.nextUrl.searchParams.get("kind");
   if(kind&&kind!=="lead"&&kind!=="member")return {badKind:true};
   const result=await client.query(`SELECT id,kind,full_name,email,phone,lead_stage,notes,created_at
      FROM people WHERE studio_id=$1 AND ($2::text IS NULL OR kind=$2)
      ORDER BY created_at DESC,id DESC LIMIT 101`,[auth.studioId,kind||null]);
   return {records:result.rows.slice(0,100),hasMore:result.rows.length>100};
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
 if(!name||name.length<2||!["lead","member"].includes(kind||"")||email===null||phone===null||
    (!email&&!phone)||email&& !emailIsValid(normalizeEmail(email))||
    phone&&!/^\+?[0-9]{7,15}$/.test(phone.replace(/[\s().-]/g,"")))
    return errorResponse(400,"Provide a name and valid email or phone.");
 try{
  const r=await authenticated(request,staffRoles,async(client,auth)=>{
   const normalizedPhone=(phone||"").replace(/[\s().-]/g,"");
   const record=await client.query(`INSERT INTO people
      (studio_id,kind,full_name,email,phone,lead_stage,member_status,package_status,credits)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id,kind,full_name,email,phone,created_at`,[
       auth.studioId,kind,name,normalizeEmail(email||""),normalizedPhone,
       kind==="lead"?"New":null,kind==="member"?"Active":null,
       kind==="member"?"Pending":null,kind==="member"?0:null
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
