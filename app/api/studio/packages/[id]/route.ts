import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,jsonObject,sameOrigin} from "@/lib/server/responses";
import {validUUID} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function PATCH(request:NextRequest,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid origin.");
 const {id}=await ctx.params;
 const data=await jsonObject(request);
 if(!validUUID(id)||!data||typeof data.active!=="boolean")return errorResponse(400,"Choose an active or archived package.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   // Existing purchases retain historical price/credits; only visibility is editable.
   const res=await client.query("UPDATE studio_packages SET active=$3 WHERE studio_id=$1 AND id=$2 RETURNING *",[auth.studioId,id,data.active]);
   return res.rows[0]||null;
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(!result.value)return errorResponse(404,"Package not found.");
  return successResponse({package:result.value});
 }catch{return backendError()}
}
