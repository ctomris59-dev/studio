import {NextRequest,NextResponse} from "next/server";

// Security reports arrive without authentication. Never log untrusted URLs,
// query parameters, script snippets, cookies, user agents or full payloads.
// Emit only bounded, low-cardinality signals for the operator's log alerts.
export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BODY=16_384;
const ALLOWED=new Set(["script-src","script-src-elem","script-src-attr","style-src","style-src-elem","style-src-attr","connect-src","img-src","font-src","frame-src","form-action","default-src","worker-src","object-src","base-uri","frame-ancestors","other"]);
let windowStart=0;
let reportsThisMinute=0;
function safeDirective(value:unknown){
 if(typeof value!=="string")return "other";
 const stripped=value.split(" ")[0].slice(0,40).toLowerCase();
 return ALLOWED.has(stripped)?stripped:"other";
}
function tally(report:unknown){
 if(!report||typeof report!=="object")return;
 const r=report as Record<string,unknown>;
 if(r.type==="csp-violation"&&typeof r.body==="object"){
  const b=r.body as Record<string,unknown>;
  return safeDirective(b.effectiveDirective||b.effective_directive);
 }
 if(typeof r["csp-report"]==="object"){
  const b=r["csp-report"] as Record<string,unknown>;
  return safeDirective(b["effective-directive"]||b.effectiveDirective);
 }
 if(r.effectiveDirective||r["effective-directive"])return safeDirective(r.effectiveDirective||r["effective-directive"]);
}
export async function POST(request:NextRequest){
 const contentType=request.headers.get("content-type")||"";
 const validType=/^(application\/(?:reports\+json|csp-report|json))(?:\s*;|$)/i.test(contentType);
 if(!validType)return new NextResponse(null,{status:415,headers:{"Cache-Control":"no-store"}});
 const declared=Number(request.headers.get("content-length")||0);
 if(declared>MAX_BODY)return new NextResponse(null,{status:413,headers:{"Cache-Control":"no-store"}});
 // Do not buffer unbounded chunked payloads when Content-Length is absent.
 let body:string;
 try{
  if(!request.body)return new NextResponse(null,{status:400});
  const reader=request.body.getReader();
  let total=0;
  const chunks:Uint8Array[]=[];
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>MAX_BODY){
    await reader.cancel();
    return new NextResponse(null,{status:413});
   }
   chunks.push(value);
  }
  body=Buffer.concat(chunks).toString("utf8");
 }catch{return new NextResponse(null,{status:400})}
 let parsed:unknown;
 try{parsed=JSON.parse(body)}catch{return new NextResponse(null,{status:400})}
 const list=Array.isArray(parsed)?parsed.slice(0,8):[parsed];
 const now=Date.now();
 if(now-windowStart>60_000){windowStart=now;reportsThisMinute=0}
 for(const item of list){
  const directive=tally(item);
  if(directive&&reportsThisMinute<30){
   reportsThisMinute++;
   console.warn("StudioTasker CSP violation",JSON.stringify({directive}));
  }
 }
 return new NextResponse(null,{status:204,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
export async function GET(){return new NextResponse(null,{status:405,headers:{"Allow":"POST","Cache-Control":"no-store"}})}
