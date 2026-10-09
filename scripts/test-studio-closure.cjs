"use strict";
const assert=require("node:assert/strict");
const {randomUUID,createHmac}=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {Pool}=require("pg");
async function run(){
 const db=process.env.MIGRATION_DATABASE_URL;
 if(!db)throw Error("An isolated migration database is required.");
 const pool=new Pool({connectionString:db,max:1});
 const email="closure-fixture-"+randomUUID()+"@example.com";
 const secret="closure-audit-ci-secret-"+randomUUID();
 let id,userId;
 try{
  const user=await pool.query("INSERT INTO app_users(email,password_hash) VALUES($1,'test-only') RETURNING id",[email]);
  userId=user.rows[0].id;
  const studio=await pool.query("INSERT INTO studios(name,focus) VALUES('Closure CI Studio','Pilates') RETURNING id");
  id=studio.rows[0].id;
  await pool.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'owner')",[id,userId]);
  await pool.query("INSERT INTO subscriptions(studio_id,status) VALUES($1,'inactive')",[id]);
  await pool.query("INSERT INTO people(studio_id,kind,full_name,email) VALUES($1,'lead','Closure Fixture',$2)",[id,"client-"+randomUUID()+"@example.com"]);
  await pool.query(`INSERT INTO activity_log(studio_id,actor_id,action,created_at,details)
   VALUES($1,$2,'privacy.studio_closure_requested',now()-interval '8 days','{"status":"pending_verification"}'::jsonb)`,[id,userId]);
  const env={...process.env,STUDIO_ID:id,CONFIRM_STUDIO_ID:id,
   CONFIRM_STUDIO_ERASURE:"ERASE_AFTER_REVIEW",VERIFIED_BILLING_TERMINATED:"YES",
   LEGAL_RETENTION_REVIEWED:"YES",BACKUP_RETENTION_REVIEWED:"YES",STUDIO_CLOSURE_AUDIT_KEY:secret};
  assert.throws(()=>execFileSync(process.execPath,["scripts/finalize-studio-closure.cjs"],{
   env:{...env,CONFIRM_STUDIO_ERASURE:"NO"},stdio:"pipe"}),"Missing explicit erasure confirmation must fail.");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM studios WHERE id=$1",[id])).rows[0].n,1);
  execFileSync(process.execPath,["scripts/finalize-studio-closure.cjs"],{env,stdio:"pipe",timeout:30000});
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM studios WHERE id=$1",[id])).rows[0].n,0);
  const deletedUser=await pool.query("SELECT email,disabled_at FROM app_users WHERE id=$1",[userId]);
  assert(deletedUser.rows[0].email.endsWith("@invalid.example")&&deletedUser.rows[0].disabled_at);
  const fingerprint=createHmac("sha256",secret).update(id).digest("hex");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM completed_studio_closures WHERE studio_fingerprint=$1",[fingerprint])).rows[0].n,1);
  await pool.query("DELETE FROM completed_studio_closures WHERE studio_fingerprint=$1",[fingerprint]);
  console.log("Operator-only studio erasure: confirmation guard, cascade, orphan-account anonymization and audit passed.");
 }finally{
  if(id)await pool.query("DELETE FROM studios WHERE id=$1",[id]).catch(()=>{});
  if(userId)await pool.query("DELETE FROM app_users WHERE id=$1",[userId]).catch(()=>{});
  await pool.end();
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});
