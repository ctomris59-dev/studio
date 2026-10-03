import "server-only";
import type {PoolClient} from "pg";
import type {Authenticated} from "@/lib/server/auth";
import {StudioOperationError} from "@/lib/server/studio-booking";
export async function ownMemberId(client:PoolClient,auth:Authenticated):Promise<string>{
 const row=await client.query<{person_id:string}>(`
 SELECT mi.person_id FROM member_identities mi
 JOIN people p ON p.id=mi.person_id AND p.studio_id=mi.studio_id
 WHERE mi.studio_id=$1 AND mi.user_id=$2 AND p.kind='member' AND p.archived_at IS NULL
 LIMIT 1`,[auth.studioId,auth.userId]);
 if(!row.rowCount)throw new StudioOperationError(403,"Member profile is not linked to this account.");
 return row.rows[0].person_id;
}
