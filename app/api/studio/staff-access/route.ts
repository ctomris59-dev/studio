import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {sameOrigin,jsonObject,stringField,errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {validUUID} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const rows=await client.query(`SELECT su.user_id AS id,u.email,su.role,u.disabled_at
     FROM studio_users su JOIN app_users u ON u.id=su.user_id
     WHERE su.studio_id=$1 AND su.role IN ('manager','instructor','receptionist')
     ORDER BY u.email LIMIT 200`,[auth.studioId]);
   return rows.rows;
  });
  return result.access.ok?successResponse({staff:result.value}):errorResponse(result.access.status,result.access.message);
 }catch{return backendError()}
}
export async function PATCH(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 const userId=body?stringField(body,"userId",40):null;
 if(!userId||!validUUID(userId)||body?.confirm!=="RESTORE")return errorResponse(400,"Confirm staff access restoration.");
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const row=await client.query<{role:string;disabled_at:Date|null;email:string;password_hash:string}>(`
    SELECT su.role,u.disabled_at,u.email,u.password_hash
    FROM studio_users su JOIN app_users u ON u.id=su.user_id
    WHERE su.studio_id=$1 AND su.user_id=$2 FOR UPDATE OF u`,[auth.studioId,userId]);
   if(!row.rowCount||row.rows[0].role==="owner")return {notFound:true};
   if(row.rows[0].email.endsWith("@invalid.example")||!row.rows[0].password_hash.startsWith("scrypt$"))
    return {unrestorable:true};
   const other=await client.query<{count:string}>("SELECT count(*)::text AS count FROM studio_users WHERE user_id=$1",[userId]);
   if(Number(other.rows[0].count)>1)return {multiStudio:true};
   if(!row.rows[0].disabled_at)return {alreadyActive:true};
   await client.query("UPDATE app_users SET disabled_at=NULL WHERE id=$1",[userId]);
   // Previously revoked sessions remain revoked. Restoration requires fresh login.
   await client.query("UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[userId]);
   return {restored:true};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value?.notFound)return errorResponse(404,"Staff account not found.");
  if(result.value?.unrestorable)return errorResponse(409,"This account cannot be restored.");
  if(result.value?.multiStudio)return errorResponse(409,"Multi-studio identity requires administrative review.");
  return successResponse({ok:true,alreadyActive:Boolean(result.value?.alreadyActive)});
 }catch{return backendError()}
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);
 const userId=body?stringField(body,"userId",40):null;
 if(!userId||!validUUID(userId)||body?.confirm!=="REVOKE")return errorResponse(400,"Confirm staff access revocation.");
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const row=await client.query<{role:string}>(`
     SELECT su.role FROM studio_users su JOIN app_users u ON u.id=su.user_id
     WHERE su.studio_id=$1 AND su.user_id=$2 FOR UPDATE OF u`,[auth.studioId,userId]);
   if(!row.rowCount||row.rows[0].role==="owner")return {notFound:true};
   const count=await client.query<{count:string}>("SELECT count(*)::text AS count FROM studio_users WHERE user_id=$1",[userId]);
   if(Number(count.rows[0].count)>1)return {multiStudio:true};
   await client.query("UPDATE app_users SET disabled_at=COALESCE(disabled_at,now()) WHERE id=$1",[userId]);
   await client.query("UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[userId]);
   await client.query("DELETE FROM auth_trusted_devices WHERE user_id=$1",[userId]);
   return {revoked:true};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(result.value?.notFound)return errorResponse(404,"Staff membership not found.");
  if(result.value?.multiStudio)return errorResponse(409,"Multi-studio account needs administrator review.");
  return successResponse({ok:true});
 }catch{return backendError()}
}
