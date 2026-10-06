import "server-only";
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
