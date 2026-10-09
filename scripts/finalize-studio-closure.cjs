"use strict";
// Deliberately OFFLINE / OPERATOR-ONLY. Never call this from a web API.
// The customer first submits a closure request; this final step requires
// manual verification of billing, accounting retention, backup scope and holds.
const {Pool}=require("pg");
const {createHmac}=require("node:crypto");
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
async function main(){
 const studioId=process.env.STUDIO_ID||"";
 const key=process.env.STUDIO_CLOSURE_AUDIT_KEY||"";
 if(!uuid.test(studioId)||process.env.CONFIRM_STUDIO_ID!==studioId||
    process.env.CONFIRM_STUDIO_ERASURE!=="ERASE_AFTER_REVIEW"||
    process.env.VERIFIED_BILLING_TERMINATED!=="YES"||
    process.env.LEGAL_RETENTION_REVIEWED!=="YES"||
    process.env.BACKUP_RETENTION_REVIEWED!=="YES"||
    key.length<32||!process.env.MIGRATION_DATABASE_URL)
  throw Error("Erasure blocked: require exact studio confirmation, a 32+ character audit key, reviewed billing/legal/backup checks, and migration admin credentials.");
 const pool=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL,connectionTimeoutMillis:5000,max:1});
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const studio=await client.query("SELECT id FROM studios WHERE id=$1 FOR UPDATE",[studioId]);
  if(!studio.rowCount)throw Error("Studio not found; do not repeat erasure blindly.");
  const request=await client.query("SELECT created_at,actor_id,action FROM activity_log WHERE studio_id=$1 AND action IN('privacy.studio_closure_requested','privacy.studio_closure_withdrawn') ORDER BY created_at DESC,id DESC LIMIT 1",[studioId]);
  if(!request.rowCount||request.rows[0].action!=="privacy.studio_closure_requested")
   throw Error("No active owner closure request recorded; withdrawal blocks erasure.");
  const owner=await client.query("SELECT 1 FROM studio_users WHERE studio_id=$1 AND user_id=$2 AND role='owner'",[studioId,request.rows[0].actor_id]);
  if(!owner.rowCount)throw Error("Closure request is not attributed to a current studio owner.");
  if(Date.now()-new Date(request.rows[0].created_at).getTime()<7*86400000)
   throw Error("Mandatory 7-day cooling-off period has not passed.");
  const sub=await client.query("SELECT status,provider_subscription_id,current_period_end FROM subscriptions WHERE studio_id=$1 FOR UPDATE",[studioId]);
  const billing=sub.rows[0]||{status:"inactive",provider_subscription_id:null,current_period_end:null};
  if(billing.provider_subscription_id){
   if(!["cancelled","expired"].includes(billing.status)||!billing.current_period_end||
      new Date(billing.current_period_end).getTime()>Date.now())
    throw Error("Active or unverified provider subscription prevents account erasure.");
  }else if(!["inactive","cancelled","expired"].includes(billing.status)){
   throw Error("Studio subscription is not inactive.");
  }
  const legal=await client.query("SELECT count(*)::int AS count FROM legal_acceptances WHERE studio_id=$1",[studioId]);
  const members=await client.query("SELECT user_id FROM studio_users WHERE studio_id=$1",[studioId]);
  const fingerprint=createHmac("sha256",key).update(studioId).digest("hex");
  await client.query(`INSERT INTO completed_studio_closures
   (studio_fingerprint,requested_at,retained_legal_acceptance_count,previous_subscription_status)
   VALUES($1,$2,$3,$4)`,[fingerprint,request.rows[0].created_at,legal.rows[0].count,billing.status]);
  // Cascade studio-owned records only; no other tenant is addressed.
  await client.query("DELETE FROM studios WHERE id=$1",[studioId]);
  // An orphaned account must not retain an identifying login or reusable hash.
  for(const row of members.rows){
   await client.query(`UPDATE app_users SET
    email='erased-'||id::text||'@invalid.example',password_hash='studio_erased',disabled_at=now()
    WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM studio_users WHERE user_id=$1)`,[row.user_id]);
  }
  await client.query("COMMIT");
  console.log("Studio erasure committed; pseudonymous closure audit retained.");
 }catch(error){
  await client.query("ROLLBACK").catch(()=>{});
  throw error;
 }finally{client.release();await pool.end()}
}
if(require.main===module)main().catch(e=>{console.error("Studio erasure refused:",e.message);process.exitCode=1});
module.exports={main};
