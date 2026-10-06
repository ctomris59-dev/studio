import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
import {Environment,Paddle} from "@paddle/paddle-node-sdk";

let cached:Paddle|undefined;

export function paddleEnvironment():"sandbox"|"production"{
 return process.env.PADDLE_ENV==="production"?"production":"sandbox";
}

export function paddleClient():Paddle{
 const key=(process.env.PADDLE_API_KEY||"").trim();
 if(!key)throw new Error("PADDLE_API_KEY_NOT_CONFIGURED");
 if(!cached)cached=new Paddle(key,{environment:paddleEnvironment()==="sandbox"?Environment.sandbox:Environment.production});
 return cached;
}

export function paddleCheckoutConfigured(){
 const token=(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN||"").trim();
 const monthly=(process.env.PADDLE_MONTHLY_PRICE_ID||"").trim();
 const annual=(process.env.PADDLE_ANNUAL_PRICE_ID||"").trim();
 const secret=(process.env.PADDLE_WEBHOOK_SECRET||"").trim();
 const key=(process.env.PADDLE_API_KEY||"").trim();
 return Boolean(key&&token&&secret&&/^pri_[a-z\d]{26}$/.test(monthly)&&/^pri_[a-z\d]{26}$/.test(annual));
}

export function verifyPaddleWebhookSignature(rawBody:string,signatureHeader:string,secret:string,nowMs=Date.now()){
 if(!rawBody||!signatureHeader||!secret)return false;
 let timestamp:number|undefined;
 const signatures:string[]=[];
 for(const part of signatureHeader.split(";")){
  const eq=part.indexOf("=");if(eq<1)continue;
  const key=part.slice(0,eq),value=part.slice(eq+1);
  if(key==="ts"&&/^\d+$/.test(value))timestamp=Number(value);
  else if(key==="h1"&&/^[a-f\d]{64}$/i.test(value))signatures.push(value.toLowerCase());
 }
 if(!timestamp||!Number.isSafeInteger(timestamp)||!signatures.length)return false;
 const nowSeconds=Math.floor(nowMs/1000);
 // Match Paddle's SDK replay window while rejecting timestamps from either direction.
 if(Math.abs(nowSeconds-timestamp)>5)return false;
 const expected=createHmac("sha256",secret).update(String(timestamp)+":"+rawBody,"utf8").digest("hex");
 const expectedBuf=Buffer.from(expected,"hex");
 return signatures.some(sig=>{
  const received=Buffer.from(sig,"hex");
  return received.length===expectedBuf.length&&timingSafeEqual(received,expectedBuf);
 });
}
