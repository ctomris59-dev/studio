import "server-only";
import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import type {PoolClient} from "pg";
import {authenticated,type Authenticated,type StudioRole} from "./auth";
import {sameOrigin,jsonObject,errorResponse,successResponse,backendError} from "./responses";

type Context={
 request:NextRequest;
 client:PoolClient;
 auth:Authenticated;
 body:Record<string,unknown>|undefined;
};
type RoutePolicy={
 roles:readonly StudioRole[];
 origin?:"same";
 body?:"json";
};

/**
 * Authenticates before body parsing and endpoint-specific validation.
 * Keeps the transaction context and studio RLS scope managed by authenticated().
 * Only use for short database work; expensive cryptography/SMTP must stay
 * outside this transaction.
 */
export function defineRoute<T>(policy:RoutePolicy,handle:(context:Context)=>Promise<T|NextResponse>){
 return async function handler(request:NextRequest):Promise<NextResponse>{
  if(policy.origin==="same"&&!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
  try{
   const result=await authenticated(request,policy.roles,async(client,auth)=>{
    const body=policy.body==="json"?await jsonObject(request):undefined;
    if(policy.body==="json"&&!body)return errorResponse(400,"Invalid JSON request.");
    return handle({request,client,auth,body:body||undefined});
   });
   if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
   return result.value instanceof NextResponse?result.value:successResponse(result.value);
  }catch{return backendError()}
 };
}
