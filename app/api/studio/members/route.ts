import {defineRoute} from "@/lib/server/define-route";
import {literalLikePattern} from "@/lib/server/sql-search";
import {errorResponse} from "@/lib/server/responses";

export const runtime="nodejs";
export const GET=defineRoute({roles:["owner","manager","receptionist"]},async({request,client,auth})=>{
 const rawOffset=Number(request.nextUrl.searchParams.get("offset")||0);
 const search=request.nextUrl.searchParams.get("search")?.trim()||"";
 if(!Number.isSafeInteger(rawOffset)||rawOffset<0||rawOffset>10000||search.length>80)
  return errorResponse(400,"Invalid member search or page offset.");
 const records=await client.query(`
  SELECT id,full_name,email,phone,plan,credits,package_status,member_status,start_date::text,expiry_date::text
  FROM people WHERE studio_id=$1 AND kind='member' AND archived_at IS NULL
    AND (full_name ILIKE $2 ESCAPE '~' OR email ILIKE $2 ESCAPE '~' OR phone ILIKE $2 ESCAPE '~')
  ORDER BY created_at DESC,id DESC LIMIT 121 OFFSET $3`,[auth.studioId,literalLikePattern(search),rawOffset]);
 return {members:records.rows.slice(0,120),hasMore:records.rows.length>120,nextOffset:rawOffset+Math.min(120,records.rows.length)};
});
