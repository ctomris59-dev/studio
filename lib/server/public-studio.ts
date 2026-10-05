import "server-only";
import {randomBytes} from "node:crypto";
import type {PoolClient} from "pg";
export function makePublicSlug(name:string){
 const base=name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,52)||"studio";
 return base+"-"+randomBytes(4).toString("hex");
}
export const validPublicSlug=(slug:unknown):slug is string=>
 typeof slug==="string"&&/^[a-z0-9][a-z0-9-]{2,70}$/.test(slug);
export async function findPublicStudio(client:PoolClient,slug:string){
 if(!validPublicSlug(slug))return null;
 const row=await client.query<{id:string;name:string;focus:string;timezone:string;public_slug:string;public_booking_enabled:boolean;self_signup_enabled:boolean}>(`
  SELECT id,name,focus,timezone,public_slug,public_booking_enabled,self_signup_enabled
  FROM studios WHERE public_slug=$1 LIMIT 1`,[slug]);
 return row.rows[0]||null;
}
