import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash,createHmac} from "node:crypto";
import {isIP} from "node:net";
// Use the native callback overload; promisify's type only exposes three arguments.
export const SESSION_LIFETIME_SECONDS=60*60*24*14;
const KEY_LENGTH=64;
const V2={N:131072,r:8,p:1,maxmem:256*1024*1024};
const V1={N:16384,r:8,p:1,maxmem:32*1024*1024};
// Bound expensive scrypt jobs per Node process. A full queue fails fast rather than
// exhausting libuv workers, event-loop responsiveness and database health.
let activeKdfs=0;
const MAX_CONCURRENT_KDFS=2;
export class PasswordHashBusyError extends Error{
 constructor(){super("Password verification is temporarily busy.");this.name="PasswordHashBusyError";}
}
function derive(password:string,salt:Buffer,options:typeof V2):Promise<Buffer>{
 if(activeKdfs>=MAX_CONCURRENT_KDFS)return Promise.reject(new PasswordHashBusyError());
 activeKdfs++;
 return new Promise((resolve,reject)=>{
  try{scryptCallback(password,salt,KEY_LENGTH,options,(error,derived)=>{
   activeKdfs--;
   if(error)reject(error);else resolve(derived);
  });}catch(error){activeKdfs--;reject(error)}
 });
}
export const needsPasswordRehash=(hash:string)=>hash.startsWith("scrypt$v1$");
export const DUMMY_PASSWORD_HASH="scrypt$v2$"+"0".repeat(48)+"$"+"0".repeat(128);
export function trustedLoginIp(header:string|null):string|null{
 if(process.env.TRUST_PROXY_IP_HEADERS!=="true"||process.env.LAUNCH_TRUSTED_PROXY_VERIFIED!=="true")return null;
 if(!header||header.length>45||header.includes(",")||header.includes(" "))return null;
 return isIP(header)>0?header:null;
}
export function loginIpKey(ip:string):string|null{
 const secret=process.env.LOGIN_RATE_HMAC_KEY;
 if(!secret||secret.length<32)return null;
 return createHmac("sha256",secret).update("signin:"+ip).digest("hex");
}
export function validatePassword(password:string):boolean{
 return typeof password==="string"&&password.length>=12&&password.length<=128;
}
export async function passwordHash(password:string):Promise<string>{
 if(!validatePassword(password))throw new Error("Password must have 12–128 characters");
 const salt=randomBytes(24);
 const derived=await derive(password,salt,V2);
 return "scrypt$v2$"+salt.toString("hex")+"$"+derived.toString("hex");
}
export async function passwordMatches(password:string,stored:string):Promise<boolean>{
 if(!password||password.length>128||typeof stored!=="string")return false;
 const match=/^scrypt\$(v1|v2)\$([a-f0-9]{48})\$([a-f0-9]{128})$/.exec(stored);
 if(!match)return false;
 const hashed=await derive(password,Buffer.from(match[2],"hex"),match[1]==="v2"?V2:V1);
 return timingSafeEqual(hashed,Buffer.from(match[3],"hex"));
}
export const normalizeEmail=(email:string)=>email.trim().toLowerCase();
export function emailIsValid(email:string){
 return email.length<=160&&email.length>=3&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export const newSessionToken=()=>randomBytes(32).toString("base64url");
export const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export const loginKey=(email:string)=>tokenHash("login:"+normalizeEmail(email));
// __Host- cookies must be Secure, host-only and Path=/ in production.
// Deliberately invalidate legacy domain-scoped sessions during this upgrade;
// existing users sign in once to obtain the hardened cookie.
export const SESSION_COOKIE=process.env.NODE_ENV==="production"?"__Host-studiotasker_session":"studiotasker_session";
export const DEVICE_COOKIE=process.env.NODE_ENV==="production"?"__Host-studiotasker_device":"studiotasker_device";
