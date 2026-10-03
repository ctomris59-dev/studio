import "server-only";
import {randomBytes,createHash} from "node:crypto";
import type {PoolClient} from "pg";
import {normalizeEmail} from "@/lib/auth-crypto";

export type ChallengeKind="verify_email"|"password_reset"|"member_invitation";
export function challengeToken(){
 const secret=randomBytes(32).toString("base64url");
 return {secret,hash:createHash("sha256").update(secret).digest("hex")};
}
export function tokenDigest(secret:string){return createHash("sha256").update(secret).digest("hex");}
export const validChallengeToken=(value:unknown):value is string=>
 typeof value==="string"&&/^[-_A-Za-z0-9]{43}$/.test(value);
export async function newChallenge(client:PoolClient,values:{
 purpose:ChallengeKind;email:string;userId?:string|null;studioId?:string|null;
 memberId?:string|null;hours?:number
}){
 const {secret,hash}=challengeToken();
 const result=await client.query<{id:string}>(`
 INSERT INTO auth_challenges(token_hash,purpose,email,user_id,studio_id,member_id,expires_at)
 VALUES($1,$2,$3,$4,$5,$6,now()+($7::int*interval '1 hour'))
 RETURNING id`,[hash,values.purpose,normalizeEmail(values.email),values.userId||null,values.studioId||null,values.memberId||null,values.hours||1]);
 return {secret,id:result.rows[0].id};
}
export async function queueMessage(client:PoolClient,email:string,template:ChallengeKind|
 "booking_confirmed"|"booking_cancelled"|"waitlist_promoted"|"renewal_alert",
 payload:Record<string,unknown>){
 await client.query("INSERT INTO mail_outbox(recipient_email,template,payload) VALUES($1,$2,$3::jsonb)",
 [normalizeEmail(email),template,JSON.stringify(payload)]);
}
export function publicMailOrigin(){
 const origin=process.env.PUBLIC_APP_ORIGIN||"";
 if(!origin)throw new Error("PUBLIC_APP_ORIGIN is missing");
 const url=new URL(origin);
 const local=["localhost","127.0.0.1"].includes(url.hostname);
 if(url.protocol!=="https:"&&!(local&&url.protocol==="http:"))throw new Error("Mail links must use HTTPS outside localhost");
 if(url.username||url.password||url.pathname!=="/"||url.search||url.hash)throw new Error("Invalid mail URL");
 return url.origin;
}
