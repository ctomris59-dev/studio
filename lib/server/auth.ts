import "server-only";
import type {NextRequest} from "next/server";
import type {PoolClient} from "pg";
import {inTransaction,dbIsReady} from "./database";
import {SESSION_COOKIE,tokenHash,SESSION_LIFETIME_SECONDS} from "../auth-crypto";
export type StudioRole="owner"|"manager"|"instructor"|"receptionist";
export type Authenticated={userId:string;studioId:string;role:StudioRole;email:string;studioName:string};
export const sessionCookieConfig=()=>({
 httpOnly:true,secure:process.env.NODE_ENV==="production",
 sameSite:"lax" as const,path:"/",maxAge:SESSION_LIFETIME_SECONDS
});
export type Access={ok:true;auth:Authenticated}|{ok:false;status:number;message:string};
export async function authenticated<T>(
 request:NextRequest,
 roles:readonly StudioRole[],
 execute:(client:PoolClient,auth:Authenticated)=>Promise<T>
):Promise<{access:Access;value?:T}>{
 if(!dbIsReady())return {access:{ok:false,status:503,message:"Workspace backend is not configured."}};
 const token=request.cookies.get(SESSION_COOKIE)?.value;
 if(!token||!/^[-_A-Za-z0-9]{43}$/.test(token))return {access:{ok:false,status:401,message:"Sign in required."}};
 return inTransaction(async client=>{
  const found=await client.query<{
   user_id:string;studio_id:string;role:StudioRole;email:string;studio_name:string
  }>(`SELECT s.user_id,s.studio_id,su.role,u.email,st.name AS studio_name
    FROM auth_sessions s
    JOIN app_users u ON u.id=s.user_id AND u.disabled_at IS NULL
    JOIN studio_users su ON su.studio_id=s.studio_id AND su.user_id=s.user_id
    JOIN studios st ON st.id=s.studio_id
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()
    LIMIT 1`,[tokenHash(token)]);
  if(!found.rowCount)return {access:{ok:false as const,status:401,message:"Session expired. Please sign in."}};
  const row=found.rows[0];
  if(!roles.includes(row.role))return {access:{ok:false as const,status:403,message:"Insufficient permissions."}};
  // SET LOCAL is isolated to the current transaction and the checked membership.
  await client.query("SELECT set_config('app.studio_id',$1,true)",[row.studio_id]);
  await client.query("SELECT set_config('app.user_id',$1,true)",[row.user_id]);
  // Opt-in production license gate. Auth, checkout, account exports and privacy requests
  // remain accessible without a paid entitlement.
  if(process.env.BILLING_ENFORCEMENT==="required"&&
   !request.nextUrl.pathname.startsWith("/api/auth/")&&
   !["/api/studio/subscription","/api/studio/export","/api/studio/privacy"].some(path=>request.nextUrl.pathname.startsWith(path))){
   const {entitlement}=await import("./billing");
   const access=await entitlement(client,row.studio_id);
   if(!access.enabled)return {access:{ok:false as const,status:402,
     message:"An active StudioTasker subscription is required for this workspace."}};
  }
  const context:Authenticated={userId:row.user_id,studioId:row.studio_id,role:row.role,email:row.email,studioName:row.studio_name};
  const value=await execute(client,context);
  return {access:{ok:true as const,auth:context},value};
 });
}
