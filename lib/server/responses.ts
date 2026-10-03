import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
export function errorResponse(status:number,message:string){
 return NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
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
 try{return new URL(origin).origin===new URL(request.url).origin}
 catch{return false}
}
export async function jsonObject(request:Request):Promise<Record<string,unknown>|null>{
 const length=Number(request.headers.get("content-length")||0);
 if(length>12_000)return null;
 try{
  const value:unknown=await request.json();
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
 }catch{return null}
}
export function stringField(obj:Record<string,unknown>,key:string,max=180):string|null{
 const value=obj[key];
 return typeof value==="string"&&value.length<=max?value.trim():null;
}
