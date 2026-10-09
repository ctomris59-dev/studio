import "server-only";
import {createHash,createHmac} from "node:crypto";
import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {dbIsReady,inTransaction} from "./database";
import {trustedLoginIp} from "../auth-crypto";

// Two layers: cheap process-local admission prevents KDF/DB/SMTP bursts;
// shared PostgreSQL counters coordinate quotas across app replicas.
// Edge/CDN enforcement is still necessary for large distributed attacks.
type Scope="register"|"password-reset"|"verify-resend"|"contact";
const LIMITS:Record<Scope,{burst:number;global:number;sender:number;ip:number}>={
 register:{burst:10,global:120,sender:4,ip:18},
 "password-reset":{burst:20,global:180,sender:4,ip:30},
 "verify-resend":{burst:20,global:180,sender:5,ip:30},
 contact:{burst:15,global:150,sender:5,ip:12}
};
const WINDOW_MS=60_000;
const windows=new Map<string,{count:number;expires:number}>();
function key(value:string){
 const secret=process.env.LOGIN_RATE_HMAC_KEY;
 return secret&&secret.length>=32?createHmac("sha256",secret).update(value).digest("hex"):
  createHash("sha256").update(value).digest("hex");
}
function localAdmission(scope:Scope){
 const now=Date.now();
 if(windows.size>256){
  for(const [k,v] of windows)if(v.expires<=now)windows.delete(k);
 }
 const stored=windows.get(scope);
 const value=stored&&stored.expires>now?stored:{count:0,expires:now+WINDOW_MS};
 value.count++;
 windows.set(scope,value);
 return value.count<=LIMITS[scope].burst;
}
function throttled(seconds=60){
 return NextResponse.json({error:"Too many requests. Try again later."},{
  status:429,headers:{"Retry-After":String(seconds),"Cache-Control":"no-store"}
 });
}
export async function publicAbuseGuard(
 request:NextRequest,scope:Scope,email:string
):Promise<NextResponse|null>{
 if(!localAdmission(scope))return throttled();
 if(!dbIsReady())return NextResponse.json({error:"Service temporarily unavailable."},{status:503});
 const budget=LIMITS[scope];
 // Never trust forwarding headers unless proxy identity has been verified.
 const trusted=trustedLoginIp(request.headers.get("x-real-ip"));
 const counters=[
  {id:key("public:v1:"+scope+":global"),max:budget.global},
  {id:key("public:v1:"+scope+":address:"+email.trim().toLowerCase()),max:budget.sender},
  ...(trusted?[{id:key("public:v1:"+scope+":ip:"+trusted),max:budget.ip}]:[])
 ];
 try{
  const allowed=await inTransaction(async client=>{
   for(const counter of counters){
    const result=await client.query<{attempts:number}>(`
     INSERT INTO login_ip_attempts(ip_hash,attempts,window_started_at) VALUES($1,1,now())
     ON CONFLICT(ip_hash) DO UPDATE SET
      attempts=CASE WHEN login_ip_attempts.window_started_at<now()-interval '15 minutes'
       THEN 1 ELSE login_ip_attempts.attempts+1 END,
      window_started_at=CASE WHEN login_ip_attempts.window_started_at<now()-interval '15 minutes'
       THEN now() ELSE login_ip_attempts.window_started_at END
     RETURNING attempts`,[counter.id]);
    if(result.rows[0].attempts>counter.max)return false;
   }
   return true;
  });
  return allowed?null:throttled(900);
 }catch{
  // Fail closed when rate-limit storage cannot be reached; never send mail
  // or run expensive KDFs after a failed quota reservation.
  return NextResponse.json({error:"Public request service temporarily unavailable."},{
   status:503,headers:{"Retry-After":"60","Cache-Control":"no-store"}
  });
 }
}
