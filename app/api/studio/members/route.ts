import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner","manager","receptionist"],async(client,auth)=>{
   const rows=await client.query(`SELECT id,full_name,email,phone,plan,credits,package_status,
    member_status,start_date::text,expiry_date::text
    FROM people WHERE studio_id=$1 AND kind='member' AND archived_at IS NULL
    ORDER BY created_at DESC,id DESC LIMIT 120`,[auth.studioId]);
   return rows.rows;
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({members:result.value});
 }catch{return backendError()}
}
