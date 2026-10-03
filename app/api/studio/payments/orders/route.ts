import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const res=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const q=await client.query(`SELECT o.id,o.status,o.amount_cents,o.currency,o.created_at,o.fulfilled_at,o.revoked_at,
    p.full_name AS member_name,p.email AS member_email,s.name AS package_name
    FROM member_purchases o JOIN people p ON p.id=o.member_id AND p.studio_id=o.studio_id
    JOIN studio_packages s ON s.id=o.package_id AND s.studio_id=o.studio_id
    WHERE o.studio_id=$1 ORDER BY o.created_at DESC LIMIT 100`,[auth.studioId]);
   return q.rows;
  });
  if(!res.access.ok)return errorResponse(res.access.status,res.access.message);
  return successResponse({orders:res.value});
 }catch{return backendError()}
}
