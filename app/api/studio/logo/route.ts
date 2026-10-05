import {NextRequest,NextResponse} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,backendError,sameOrigin,successResponse} from "@/lib/server/responses";
export const runtime="nodejs";
const MAX_LOGO_BYTES=200000;
function validMagic(bytes:Uint8Array,mime:string){
 if(mime==="image/png")return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 if(mime==="image/jpeg")return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==="image/webp")return bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
 return false;
}
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["owner","manager","receptionist","instructor"],async(client,auth)=>{
   const r=await client.query<{logo_mime:string;logo_bytes:Buffer}>("SELECT logo_mime,logo_bytes FROM studio_brand_assets WHERE studio_id=$1",[auth.studioId]);
   return r.rows[0]||null;
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  if(!result.value)return new NextResponse(null,{status:404,headers:{"Cache-Control":"private, no-store"}});
  return new NextResponse(new Uint8Array(result.value.logo_bytes),{status:200,headers:{
   "Content-Type":result.value.logo_mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"
  }});
 }catch{return backendError()}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const length=Number(request.headers.get("content-length")||0);if(length>MAX_LOGO_BYTES+50000)return errorResponse(413,"Logo must be 200 KB or smaller.");
 try{
  const form=await request.formData(),value=form.get("logo");
  if(!(value instanceof File))return errorResponse(400,"Choose a PNG, JPEG or WebP logo.");
  if(value.size<1||value.size>MAX_LOGO_BYTES||!["image/png","image/jpeg","image/webp"].includes(value.type))
   return errorResponse(400,"Logo must be PNG, JPEG or WebP and 200 KB or smaller.");
  const bytes=new Uint8Array(await value.arrayBuffer());if(!validMagic(bytes,value.type))return errorResponse(400,"Logo file content does not match its image type.");
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   await client.query(`INSERT INTO studio_brand_assets(studio_id,logo_mime,logo_bytes,updated_at) VALUES($1,$2,$3,now())
    ON CONFLICT(studio_id) DO UPDATE SET logo_mime=excluded.logo_mime,logo_bytes=excluded.logo_bytes,updated_at=now()`,
    [auth.studioId,value.type,Buffer.from(bytes)]);
   return true;
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({ok:true});
 }catch{return backendError()}
}
export async function DELETE(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{await client.query("DELETE FROM studio_brand_assets WHERE studio_id=$1",[auth.studioId]);return true});
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({ok:true});
 }catch{return backendError()}
}
