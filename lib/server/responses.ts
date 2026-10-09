import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
export function errorResponse(status:number,message:string){
 return NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
}
export function busyResponse(message:string){
 return NextResponse.json({error:message},{status:429,headers:{"Cache-Control":"no-store","Retry-After":"60"}});
}
export function successResponse(value:unknown,status=200){
 return NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
}
export function backendError(){
 return errorResponse(503,"Workspace temporarily unavailable. Try again later.");
}
export function sameOrigin(request:NextRequest):boolean{
 const origin=request.headers.get("origin");
 if(!origin)return false;
 try{
  const provided=new URL(origin);
  const canonical=new URL(request.url);
  if(provided.origin===canonical.origin)return true;
  // Next.js may normalize the absolute URL hostname on self-hosted Node.
  // In that case require the browser Origin to match the HTTP Host header
  // AND the request scheme. Do not trust arbitrary Origin or X-Forwarded-Host.
  const host=request.headers.get("host")?.toLowerCase();
  const scheme=request.headers.get("x-forwarded-proto")||canonical.protocol.slice(0,-1);
  return Boolean(host&&provided.host.toLowerCase()===host&&provided.protocol===scheme+":");
 }catch{return false}
}
export async function jsonObject(request:Request):Promise<Record<string,unknown>|null>{
 const contentType=request.headers.get("content-type")||"";
 if(!/^application\/json(?:\s*;|$)/i.test(contentType))return null;
 const length=Number(request.headers.get("content-length")||0);
 if(length>12_000||!request.body)return null;
 try{
  const reader=request.body.getReader(),parts:Uint8Array[]=[];let total=0;
  try{
   while(true){
    const {value,done}=await reader.read();if(done)break;
    total+=value.byteLength;
    if(total>12_000){await reader.cancel();return null}
    parts.push(value);
   }
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(total);let pos=0;
  for(const part of parts){bytes.set(part,pos);pos+=part.length}
  const value:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
 }catch{return null}
}
export function stringField(obj:Record<string,unknown>,key:string,max=180):string|null{
 const value=obj[key];
 return typeof value==="string"&&value.length<=max?value.trim():null;
}
