import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {newChallenge,queueMessage,publicMailOrigin} from "@/lib/server/challenges";
import {validUUID} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid origin.");
 const body=await jsonObject(request),memberId=body?stringField(body,"memberId",36):null;
 if(!validUUID(memberId))return errorResponse(400,"Select a member.");
 try{
  const origin=publicMailOrigin();
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const member=await client.query<{email:string;full_name:string;id:string}>(`
    SELECT id,email,full_name FROM people
    WHERE studio_id=$1 AND id=$2 AND kind='member' AND archived_at IS NULL`,[auth.studioId,memberId]);
   if(!member.rowCount)return {error:"Member not found.",status:404};
   const row=member.rows[0];
   if(!row.email)return {error:"Member email required for account invitation.",status:409};
   const exists=await client.query("SELECT 1 FROM app_users WHERE email=$1 LIMIT 1",[row.email]);
   if(exists.rowCount)return {error:"This email already has an account. Existing-account joining is not available yet.",status:409};
   const linked=await client.query("SELECT 1 FROM member_identities WHERE studio_id=$1 AND person_id=$2",[auth.studioId,memberId]);
   if(linked.rowCount)return {error:"This member already has a login.",status:409};
   const recent=await client.query("SELECT 1 FROM auth_challenges WHERE studio_id=$1 AND member_id=$2 AND purpose='member_invitation' AND created_at>now()-interval '10 minutes'",[auth.studioId,memberId]);
   if(recent.rowCount)return {error:"Invitation recently queued. Wait 10 minutes.",status:429};
   const challenge=await newChallenge(client,{purpose:"member_invitation",email:row.email,studioId:auth.studioId,memberId:row.id,hours:24});
   await queueMessage(client,row.email,"member_invitation",{
    url:origin+"/workspace?invite="+encodeURIComponent(challenge.secret),
    studio:auth.studioName,
    memberName:row.full_name
   });
   return {sent:true};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value&&"error" in result.value)return errorResponse(result.value.status as number,result.value.error as string);
  return successResponse({ok:true,notice:"Invitation queued for email delivery. Not sent until SMTP is configured."},202);
 }catch{return backendError()}
}
