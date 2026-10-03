import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {errorResponse,successResponse,backendError} from "@/lib/server/responses";
import {ownMemberId} from "@/lib/server/member-identity";
import {studioPaymentsReady} from "@/lib/server/studio-payments";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const result=await authenticated(request,["member"],async(client,auth)=>{
   const memberId=await ownMemberId(client,auth);
   const catalog=await client.query(`SELECT id,name,description,currency,price_cents,credits,valid_days
    FROM studio_packages WHERE studio_id=$1 AND active=true ORDER BY price_cents,id LIMIT 50`,[auth.studioId]);
   const orders=await client.query(`SELECT p.id,p.status,p.created_at,p.fulfilled_at,p.amount_cents,p.currency,s.name
    FROM member_purchases p JOIN studio_packages s ON s.id=p.package_id AND s.studio_id=p.studio_id
    WHERE p.studio_id=$1 AND p.member_id=$2 ORDER BY p.created_at DESC LIMIT 20`,[auth.studioId,memberId]);
   const account=await client.query("SELECT 1 FROM studio_payment_accounts WHERE studio_id=$1",[auth.studioId]);
   return {packages:catalog.rows,purchases:orders.rows,checkoutAvailable:studioPaymentsReady()&&Boolean(account.rowCount)};
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse(result.value);
 }catch{return backendError()}
}
