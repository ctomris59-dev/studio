import {literalLikePattern} from "@/lib/server/sql-search";
import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 const rawOffset=Number(request.nextUrl.searchParams.get("offset")||0);
 const search=request.nextUrl.searchParams.get("search")?.trim()||"";
 if(!Number.isSafeInteger(rawOffset)||rawOffset<0||rawOffset>10000||search.length>80)
  return errorResponse(400,"Invalid member search or page offset.");
 try{
  const result=await authenticated(request,["owner","manager","receptionist"],async(client,auth)=>{
   const records=await client.query(`
    SELECT id,full_name,email,phone,plan,credits,package_status,member_status,start_date::text,expiry_date::text
    FROM people WHERE studio_id=$1 AND kind='member' AND archived_at IS NULL
    AND (full_name ILIKE $2 ESCAPE '~' OR email ILIKE $2 ESCAPE '~' OR phone ILIKE $2 ESCAPE '~')
    ORDER BY created_at DESC,id DESC LIMIT 121 OFFSET $3`,[auth.studioId,literalLikePattern(search),rawOffset]);
   return {members:records.rows.slice(0,120),hasMore:records.rows.length>120,nextOffset:rawOffset+Math.min(120,records.rows.length)};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value);
 }catch{return backendError()}
}
