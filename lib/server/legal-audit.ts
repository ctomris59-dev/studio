import "server-only";
import {createHash,createHmac} from "node:crypto";
import type {NextRequest} from "next/server";
import type {PoolClient} from "pg";
import {LEGAL_ACCEPTANCE_TEXT,LEGAL_PLAN_PRICE_CENTS,LEGAL_VERSIONS,type LegalPlan} from "../legal-versions";

function auditKey(){
 const key=process.env.LEGAL_AUDIT_HASH_KEY;
 if(key)return key;
 if(process.env.BILLING_ALLOW_LOCAL_TEST==="true")return "local-test-legal-audit-key-only";
 throw new Error("LEGAL_AUDIT_HASH_KEY_NOT_CONFIGURED");
}
function clientIp(request:NextRequest){
 const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
 return forwarded||request.headers.get("x-real-ip")?.trim()||"unknown";
}
export function legalEvidence(request:NextRequest){
 const ipHash=createHmac("sha256",auditKey()).update(clientIp(request)).digest("hex");
 const userAgent=(request.headers.get("user-agent")||"").slice(0,512);
 const acceptanceTextHash=createHash("sha256").update(
  LEGAL_ACCEPTANCE_TEXT+"|"+LEGAL_VERSIONS.terms+"|"+LEGAL_VERSIONS.dpa+"|"+LEGAL_VERSIONS.privacy
 ).digest("hex");
 return {ipHash,userAgent,acceptanceTextHash};
}
export function legalPayloadIsCurrent(body:Record<string,unknown>){
 return body.legalAccepted===true&&
  body.termsVersion===LEGAL_VERSIONS.terms&&
  body.dpaVersion===LEGAL_VERSIONS.dpa&&
  body.privacyVersion===LEGAL_VERSIONS.privacy;
}
export async function recordLegalAcceptance(client:PoolClient,args:{
 request:NextRequest;studioId:string;userId:string;plan:LegalPlan;source:"registration"|"checkout"|"reauthorization";
}){
 const evidence=legalEvidence(args.request),price=LEGAL_PLAN_PRICE_CENTS[args.plan];
 await client.query(`INSERT INTO legal_acceptances(
  studio_id,user_id,source,terms_version,dpa_version,privacy_version,plan,price_cents,acceptance_text_hash,ip_hash,user_agent
 ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
 ON CONFLICT(studio_id,user_id,terms_version,dpa_version,privacy_version,plan,price_cents) DO NOTHING`,[
  args.studioId,args.userId,args.source,LEGAL_VERSIONS.terms,LEGAL_VERSIONS.dpa,LEGAL_VERSIONS.privacy,args.plan,price,
  evidence.acceptanceTextHash,evidence.ipHash,evidence.userAgent
 ]);
}
export async function hasCurrentLegalAcceptance(client:PoolClient,studioId:string,userId:string,plan:LegalPlan){
 const result=await client.query(`SELECT 1 FROM legal_acceptances
  WHERE studio_id=$1 AND user_id=$2 AND terms_version=$3 AND dpa_version=$4 AND privacy_version=$5
   AND plan=$6 AND price_cents=$7 LIMIT 1`,[
  studioId,userId,LEGAL_VERSIONS.terms,LEGAL_VERSIONS.dpa,LEGAL_VERSIONS.privacy,plan,LEGAL_PLAN_PRICE_CENTS[plan]
 ]);
 return Boolean(result.rowCount);
}
