import {dbIsReady,inTransaction} from "@/lib/server/database";
import {errorResponse,successResponse} from "@/lib/server/responses";
export const runtime="nodejs";
export const dynamic="force-dynamic";
// No public credentials, tenant IDs or schema details are disclosed.
export async function GET(){
 if(!dbIsReady())return errorResponse(503,"Service not ready.");
 try{
  await inTransaction(async client=>{await client.query("SELECT 1");return true});
  return successResponse({status:"ready"});
 }catch{return errorResponse(503,"Service not ready.")}
}
