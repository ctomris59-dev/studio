import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {createClass,parseClass,StudioOperationError} from "@/lib/server/studio-booking";
import {applyClassMetadata,listClassesExtended,resolveClassMetadata} from "@/lib/server/class-based-os";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 const offset=Number(request.nextUrl.searchParams.get("offset")||0),search=request.nextUrl.searchParams.get("search")?.trim()||"";
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000||search.length>80)return errorResponse(400,"Invalid search or offset.");
 try{
  const result=await authenticated(request,["owner","manager","receptionist","instructor"],(client,auth)=>listClassesExtended(client,auth.studioId,search,offset));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  const rows=result.value??[];
  return successResponse({classes:rows.slice(0,120),hasMore:rows.length>120,nextOffset:offset+Math.min(rows.length,120)});
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const data=await jsonObject(request);
 if(!data)return errorResponse(400,"Invalid class details.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const meta=await resolveClassMetadata(client,auth.studioId,data);
   const input=parseClass({...data,instructor:meta.effectiveInstructor});
   const created=await createClass(client,auth,input);
   await applyClassMetadata(client,auth.studioId,[created.id],meta);
   const rows=await listClassesExtended(client,auth.studioId);
   return rows.find((row:{id:string})=>row.id===created.id)||created;
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({class:result.value},201);
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
