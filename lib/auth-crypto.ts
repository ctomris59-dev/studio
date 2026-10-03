import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from "node:crypto";
import {promisify} from "node:util";
const scrypt=promisify(scryptCallback);
export const SESSION_LIFETIME_SECONDS=60*60*24*14;
const KEY_LENGTH=64;
export function validatePassword(password:string):boolean{
 return typeof password==="string"&&password.length>=12&&password.length<=128;
}
export async function passwordHash(password:string):Promise<string>{
 if(!validatePassword(password))throw new Error("Password must have 12–128 characters");
 const salt=randomBytes(24);
 const derived=await scrypt(password,salt,KEY_LENGTH) as Buffer;
 return "scrypt$v1$"+salt.toString("hex")+"$"+derived.toString("hex");
}
export async function passwordMatches(password:string,stored:string):Promise<boolean>{
 if(!password||password.length>128||typeof stored!=="string")return false;
 const match=/^scrypt\$v1\$([a-f0-9]{48})\$([a-f0-9]{128})$/.exec(stored);
 if(!match)return false;
 const hashed=await scrypt(password,Buffer.from(match[1],"hex"),KEY_LENGTH) as Buffer;
 return timingSafeEqual(hashed,Buffer.from(match[2],"hex"));
}
export const normalizeEmail=(email:string)=>email.trim().toLowerCase();
export function emailIsValid(email:string){
 return email.length<=160&&email.length>=3&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export const newSessionToken=()=>randomBytes(32).toString("base64url");
export const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export const loginKey=(email:string)=>tokenHash("login:"+normalizeEmail(email));
export const SESSION_COOKIE="reformdesk_session";
