import {NextRequest} from "next/server";
import {authenticated} from "@/lib/server/auth";
import {jsonObject,stringField,errorResponse,successResponse,backendError,sameOrigin} from "@/lib/server/responses";
import {validUUID,StudioOperationError} from "@/lib/server/studio-booking";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,"Invalid request origin.");
 const body=await jsonObject(request),packageId=body?stringField(body,"packageId",36):null;
 if(!validUUID(packageId))return errorResponse(400,"Select an internal class package.");
 const {id}=await context.params;
 if(!validUUID(id))return errorResponse(400,"Invalid member identifier.");
 try{
  const result=await authenticated(request,["owner","manager"],async(client,auth)=>{
   const member=await client.query<{kind:string;package_status:string|null}>(`
    SELECT kind,package_status FROM people WHERE studio_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE`,
    [auth.studioId,id]);
   if(!member.rowCount||member.rows[0].kind!=="member")throw new StudioOperationError(404,"Member not found.");
   if(member.rows[0].package_status==="Confirmed")
    throw new StudioOperationError(409,"Member already has a confirmed package. Use audited credit adjustment or a future renewal workflow.");
   const pack=await client.query<{name:string;credits:number;valid_days:number}>(`
    SELECT name,credits,valid_days FROM studio_packages
    WHERE studio_id=$1 AND id=$2 AND active=true`,[auth.studioId,packageId]);
   if(!pack.rowCount)throw new StudioOperationError(404,"Class package not found.");
   const p=pack.rows[0];
   const studio=await client.query<{today:string}>(`
    SELECT (now() AT TIME ZONE timezone)::date::text AS today FROM studios WHERE id=$1`,[auth.studioId]);
   const today=studio.rows[0].today;
   const updated=await client.query(`
     UPDATE people SET package_status='Confirmed',plan=$3,credits=$4,initial_credits=$4,
      start_date=coalesce(start_date,$5::date),
      expiry_date=greatest(coalesce(expiry_date,$5::date),$5::date)+$6::int,
      member_status=coalesce(member_status,'Active'),updated_at=now()
     WHERE studio_id=$1 AND id=$2
     RETURNING id,plan,credits,package_status,expiry_date`,
     [auth.studioId,id,p.name,p.credits,today,p.valid_days]);
   if(p.credits>0)await client.query(`
     INSERT INTO credit_ledger(studio_id,member_id,delta,reason,created_by)
     VALUES($1,$2,$3,'studio_package_confirmation',$4)`,[auth.studioId,id,p.credits,auth.userId]);
   await client.query(`INSERT INTO activity_log(studio_id,person_id,actor_id,action,details)
     VALUES($1,$2,$3,'package.studio_confirmed',$4::jsonb)`,
     [auth.studioId,id,auth.userId,JSON.stringify({packageId,name:p.name,credits:p.credits,validDays:p.valid_days})]);
   return updated.rows[0];
  });
  if(!result.access.ok)return errorResponse(result.access.status,result.access.message);
  return successResponse({member:result.value,note:"Studio-confirmed package entitlement recorded. StudioTasker did not collect or verify member payment."});
 }catch(error){return error instanceof StudioOperationError?errorResponse(error.status,error.message):backendError()}
}
