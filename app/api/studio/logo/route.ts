import {NextRequest,NextResponse} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,backendError,sameOrigin,successResponse} from "@/lib/server/responses";
import {StudioOperationError} from "@/lib/server/studio-booking";
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
async function boundedMultipart(request:NextRequest){
 if(!request.body)throw new StudioOperationError(400,"Logo file is missing.");
 const type=request.headers.get("content-type")||"";
 if(!/^multipart\/form-data;\s*boundary=/.test(type))throw new StudioOperationError(400,"Multipart image upload required.");
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let length=0;
 try{
  while(true){
   const {value,done}=await reader.read();if(done)break;
   length+=value.byteLength;
   if(length>MAX_LOGO_BYTES+50000){
    await reader.cancel();
    throw new StudioOperationError(413,"Logo must be 200 KB or smaller.");
   }
   chunks.push(value);
  }
 }finally{reader.releaseLock()}
 if(!length)throw new StudioOperationError(400,"Logo file is empty.");
 const bytes=new Uint8Array(length);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 // Parsing is done only after verifying the authenticated studio role and bounding bytes.
 const safeRequest=new Request(request.url,{method:"POST",headers:{"Content-Type":type},body:bytes.buffer as ArrayBuffer});
 try{return await safeRequest.formData()}
 catch{throw new StudioOperationError(400,"Malformed logo upload.");}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const size=Number(request.headers.get("content-length")||0);
 if(!Number.isFinite(size)||size>MAX_LOGO_BYTES+50000)return errorResponse(413,"Logo must be 200 KB or smaller.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const form=await boundedMultipart(request),value=form.get("logo");
   if(!(value instanceof File))throw new StudioOperationError(400,"Choose a PNG, JPEG or WebP logo.");
   if(value.size<1||value.size>MAX_LOGO_BYTES||!["image/png","image/jpeg","image/webp"].includes(value.type))
    throw new StudioOperationError(400,"Logo must be PNG, JPEG or WebP and 200 KB or smaller.");
   const bytes=new Uint8Array(await value.arrayBuffer());
   if(!validMagic(bytes,value.type))throw new StudioOperationError(400,"Logo file content does not match its image type.");
   await client.query(`INSERT INTO studio_brand_assets(studio_id,logo_mime,logo_bytes,updated_at) VALUES($1,$2,$3,now())
    ON CONFLICT(studio_id) DO UPDATE SET logo_mime=excluded.logo_mime,logo_bytes=excluded.logo_bytes,updated_at=now()`,
    [auth.studioId,value.type,Buffer.from(bytes)]);
   return true;
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({ok:true});
 }catch(e){return e instanceof StudioOperationError?errorResponse(e.status,e.message):backendError()}
}
export async function DELETE(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{await client.query("DELETE FROM studio_brand_assets WHERE studio_id=$1",[auth.studioId]);return true});
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({ok:true});
 }catch{return backendError()}
}
