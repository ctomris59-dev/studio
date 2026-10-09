import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {sameOrigin,jsonObject,stringField,errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {emailIsValid,normalizeEmail} from "@/lib/auth-crypto";
import {challengeToken,publicMailOrigin} from "@/lib/server/challenges";

export const runtime="nodejs";
const staffRoles=["manager","instructor","receptionist"] as const;

export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const rows=await client.query("SELECT id,email,role,created_at,expires_at,accepted_at FROM staff_invitations WHERE studio_id=$1 AND created_at>now()-interval '30 days' ORDER BY created_at DESC LIMIT 30",[auth.studioId]);
   return rows.rows;
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({invitations:result.value});
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 const raw=body?stringField(body,"email",160):null;
 const email=raw?normalizeEmail(raw):null,role=body?stringField(body,"role",24):null;
 if(!email||!emailIsValid(email)||!role||!(staffRoles as readonly string[]).includes(role))return errorResponse(400,"Enter a valid email and staff role.");
 try{
  const origin=publicMailOrigin();
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   // Serialize invitations per studio and cap accidental staff-mail floods.
   await client.query("SELECT id FROM studios WHERE id=$1 FOR UPDATE",[auth.studioId]);
   const limits=await client.query<{total:number;for_email:number}>(`
    SELECT count(*) FILTER(WHERE created_at>now()-interval '24 hours')::int AS total,
      count(*) FILTER(WHERE created_at>now()-interval '24 hours' AND email=$2)::int AS for_email
    FROM staff_invitations WHERE studio_id=$1`,[auth.studioId,email]);
   if(limits.rows[0].total>=25||limits.rows[0].for_email>=3)return {limited:true as const};
   const existing=await client.query("SELECT id FROM app_users WHERE email=$1 LIMIT 1",[email]);
   if(existing.rowCount)return {existing:true as const};
   await client.query("UPDATE staff_invitations SET revoked_at=now() WHERE studio_id=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL",[auth.studioId,email]);
   const token=challengeToken();
   await client.query("INSERT INTO staff_invitations(studio_id,invited_by,email,role,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '48 hours')",
    [auth.studioId,auth.userId,email,role,token.hash]);
   const url=origin+"/staff-invite#token="+encodeURIComponent(token.secret)+"&studio="+encodeURIComponent(auth.studioId);
   await client.query("INSERT INTO mail_outbox(recipient_email,template,payload) VALUES($1,'staff_invitation',$2::jsonb)",
    [email,JSON.stringify({url,studioName:auth.studioName,role})]);
   return {queued:true as const};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value?.limited)return errorResponse(429,"Too many invitations. Please try again later.");
  if(result.value?.existing)return errorResponse(409,"This email already has an account. Multi-studio invitations are not yet supported.");
  return successResponse({ok:true,notice:"Invitation queued. The recipient has 48 hours to create a staff account."},202);
 }catch{return backendError()}
}
