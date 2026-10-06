import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {hasCurrentLegalAcceptance} from "@/lib/server/legal-audit";
import {LEGAL_ACCEPTANCE_TEXT,LEGAL_PLAN_LABEL,LEGAL_VERSIONS} from "@/lib/legal-versions";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner"],async(client,auth)=>{
   const [monthly,annual]=await Promise.all([
    hasCurrentLegalAcceptance(client,auth.studioId,auth.userId,"monthly"),
    hasCurrentLegalAcceptance(client,auth.studioId,auth.userId,"annual")
   ]);
   return {versions:LEGAL_VERSIONS,acceptanceText:LEGAL_ACCEPTANCE_TEXT,planLabels:LEGAL_PLAN_LABEL,accepted:{monthly,annual}};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({legal:result.value});
 }catch{return backendError()}
}
