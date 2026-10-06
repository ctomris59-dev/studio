import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError,jsonObject,sameOrigin,stringField} from "@/lib/server/responses";
import {legalPayloadIsCurrent,recordLegalAcceptance} from "@/lib/server/legal-audit";
import {LEGAL_VERSIONS,type LegalPlan} from "@/lib/legal-versions";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request);if(!body)return errorResponse(400,"Invalid legal acceptance.");
 const plan=stringField(body,"plan",12) as LegalPlan|null;
 if(!plan||!["monthly","annual"].includes(plan)||!legalPayloadIsCurrent(body))
  return errorResponse(409,"Please review and accept the current Terms, DPA and Privacy Policy.");
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   await recordLegalAcceptance(client,{request,studioId:auth.studioId,userId:auth.userId,plan,source:"reauthorization"});
   return {accepted:true,plan,versions:LEGAL_VERSIONS};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value);
 }catch{return backendError()}
}
