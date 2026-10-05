import {NextRequest} from "next/server";
import {authenticated,type StudioRole} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
export const runtime="nodejs";
const roles:StudioRole[]=["owner","manager","instructor","receptionist"];
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,roles,async(_client,auth)=>({user:{id:auth.userId,email:auth.email,role:auth.role},studio:{id:auth.studioId,name:auth.studioName}}));
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value);
 }catch{return backendError()}
}
