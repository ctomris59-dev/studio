import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash,createHmac} from "node:crypto";
import {isIP} from "node:net";
import {promisify} from "node:util";
const scrypt=promisify(scryptCallback);
export const SESSION_LIFETIME_SECONDS=60*60*24*14;
const KEY_LENGTH=64;
const V2={N:131072,r:8,p:1,maxmem:256*1024*1024};
const V1={N:16384,r:8,p:1,maxmem:32*1024*1024};
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
 const derived=await scrypt(password,salt,KEY_LENGTH,V2) as Buffer;
 return "scrypt$v2$"+salt.toString("hex")+"$"+derived.toString("hex");
}
export async function passwordMatches(password:string,stored:string):Promise<boolean>{
 if(!password||password.length>128||typeof stored!=="string")return false;
 const match=/^scrypt\$(v1|v2)\$([a-f0-9]{48})\$([a-f0-9]{128})$/.exec(stored);
 if(!match)return false;
 const hashed=await scrypt(password,Buffer.from(match[2],"hex"),KEY_LENGTH,match[1]==="v2"?V2:V1) as Buffer;
 return timingSafeEqual(hashed,Buffer.from(match[3],"hex"));
}
export const normalizeEmail=(email:string)=>email.trim().toLowerCase();
export function emailIsValid(email:string){
 return email.length<=160&&email.length>=3&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export const newSessionToken=()=>randomBytes(32).toString("base64url");
export const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export const loginKey=(email:string)=>tokenHash("login:"+normalizeEmail(email));
export const SESSION_COOKIE="reformdesk_session";
