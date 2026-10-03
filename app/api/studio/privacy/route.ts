import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const res=await authenticated(request,["owner"],async(client,auth)=>{
   const q=await client.query(`SELECT id,full_name,kind,archived_at
    FROM people WHERE studio_id=$1 AND archived_at IS NOT NULL
    ORDER BY archived_at DESC LIMIT 100`,[auth.studioId]);
   const audit=await client.query(`SELECT created_at,reason FROM data_export_audits
    WHERE studio_id=$1 ORDER BY created_at DESC LIMIT 30`,[auth.studioId]);
   return {archivedRecords:q.rows,exportHistory:audit.rows,notice:"Archiving is not erasure. Regulated retention and verified data-deletion workflows remain pending legal review."};
  });
  if(!res.access.ok)return errorResponse(res.access.status,res.access.message);
  return successResponse(res.value);
 }catch{return backendError()}
}
