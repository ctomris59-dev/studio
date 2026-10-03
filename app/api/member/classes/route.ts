import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {listClasses} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const res=await authenticated(request,["member"],(client,auth)=>listClasses(client,auth.studioId));
  if(!res.access.ok)return errorResponse(res.access.status,res.access.message);
  return successResponse({classes:res.value});
 }catch{return backendError()}
}
