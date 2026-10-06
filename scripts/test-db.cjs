const assert=require("node:assert/strict");
const {Pool}=require("pg");
const crypto=require("node:crypto");
async function run(){
 if(!process.env.MIGRATION_DATABASE_URL||!process.env.DATABASE_URL)throw new Error("Set both admin migration and restricted runtime URLs");
 const admin=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL});
 const runtime=new Pool({connectionString:process.env.DATABASE_URL});
 const key=crypto.randomUUID();
 let studio1,studio2,user1,user2;
 try{
  const role=await runtime.query("SELECT current_user AS user_name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user");
  assert.equal(role.rows[0].rolsuper,false,"Application role must never be superuser");
  assert.equal(role.rows[0].rolbypassrls,false,"Application role must never bypass RLS");
  async function owner(name,suffix){
   const user=(await admin.query("INSERT INTO app_users(email,password_hash) VALUES($1,$2) RETURNING id",[suffix+key+"@example.com","test-password-hash-only"])).rows[0].id;
   const studio=(await admin.query("INSERT INTO studios(name,focus) VALUES($1,'Pilates') RETURNING id",[name])).rows[0].id;
   await admin.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'owner')",[studio,user]);
   return {studio,user};
  }
  const a=await owner("Tenant A Test","tenant-a-"),b=await owner("Tenant B Test","tenant-b-");
  studio1=a.studio;studio2=b.studio;user1=a.user;user2=b.user;
  async function scoped(id,work){
   const client=await runtime.connect();
   try{
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.studio_id',$1,true)",[id]);
    const result=await work(client);
    await client.query("COMMIT");
    return result;
   }catch(error){await client.query("ROLLBACK");throw error}
   finally{client.release()}
  }
  const insert=async(studio,name,email)=>scoped(studio,async client=>{
   const r=await client.query("INSERT INTO people(studio_id,kind,full_name,email) VALUES($1,'lead',$2,$3) RETURNING id",[studio,name,email]);
   return r.rows[0].id;
  });
  const person1=await insert(studio1,"Alice Example","alice-"+key+"@example.com");
  const person2=await insert(studio2,"Bob Example","bob-"+key+"@example.com");
  const nothing=await runtime.query("SELECT id FROM people WHERE id = $1",[person1]);
  assert.equal(nothing.rowCount,0,"No tenant context must return no data");
  const aView=await scoped(studio1,client=>client.query("SELECT id FROM people ORDER BY id"));
  const bView=await scoped(studio2,client=>client.query("SELECT id FROM people ORDER BY id"));
  assert(aView.rows.some(x=>x.id===person1)&&!aView.rows.some(x=>x.id===person2),"A cannot see B data");
  assert(bView.rows.some(x=>x.id===person2)&&!bView.rows.some(x=>x.id===person1),"B cannot see A data");
  let blocked=false;
  try{
   await scoped(studio1,client=>client.query("INSERT INTO people(studio_id,kind,full_name,email) VALUES($1,'lead','Malicious Example',$2)",[studio2,"malicious-"+key+"@example.com"]));
  }catch(err){blocked=err.code==="42501"}
  assert(blocked,"Cross-tenant insert must be blocked by database policy");
  // Internal package templates must inherit the same forced tenant isolation as customer records.
  const packageA=await scoped(studio1,async client=>{
   const row=await client.query(`INSERT INTO studio_packages(studio_id,name,description,credits,valid_days,price_cents,currency)
    VALUES($1,'Ten Visits','Sample entitlement template',10,60,NULL,NULL) RETURNING id`,[studio1]);
   return row.rows[0].id;
  });
  await scoped(studio1,client=>client.query("INSERT INTO action_center_snoozes(studio_id,action_key,snoozed_until,created_by) VALUES($1,'inactive:test',now()+interval '1 day',$2)",[studio1,user1]));
  assert.equal((await scoped(studio2,client=>client.query("SELECT action_key FROM action_center_snoozes"))).rowCount,0,"Today snoozes must be tenant-isolated.");
  await scoped(studio1,client=>client.query("INSERT INTO import_batches(studio_id,actor_id,filename,row_count,imported_count,skipped_count) VALUES($1,$2,'tenant-a.csv',2,2,0)",[studio1,user1]));
  assert.equal((await scoped(studio2,client=>client.query("SELECT id FROM import_batches"))).rowCount,0,"CSV import audits must be tenant-isolated.");
  const visibleB=await scoped(studio2,client=>client.query("SELECT id FROM studio_packages WHERE id=$1",[packageA]));
  assert.equal(visibleB.rowCount,0,"Tenant B cannot view tenant A class packs.");
  assert.equal((await runtime.query("SELECT id FROM studio_packages WHERE id=$1",[packageA])).rowCount,0,"Unscoped catalog reads must be empty.");
  await scoped(studio1,client=>client.query(`INSERT INTO legal_acceptances(
   studio_id,user_id,source,terms_version,dpa_version,privacy_version,plan,price_cents,acceptance_text_hash,ip_hash,user_agent
  ) VALUES($1,$2,'registration','2026-10-06','2026-10-06','2026-10-06','monthly',3990,$3,$4,'db-test')`,
   [studio1,user1,"a".repeat(64),"b".repeat(64)]));
  assert.equal((await scoped(studio2,client=>client.query("SELECT id FROM legal_acceptances"))).rowCount,0,"Legal acceptance evidence must be tenant-isolated.");
  assert.equal((await runtime.query("SELECT id FROM legal_acceptances")).rowCount,0,"Unscoped legal acceptance reads must be empty.");
  let illegal=false;
  try{
   await scoped(studio1,client=>client.query(`INSERT INTO studio_packages(studio_id,name,credits,valid_days,price_cents,currency)
    VALUES($1,'Cross Studio Pack',2,30,NULL,NULL)`,[studio2]));
  }catch(e){illegal=e.code==="42501"}
  assert(illegal,"Cross-tenant package-template writes must be denied by PostgreSQL RLS.");
    const afterTransaction=await runtime.query("SELECT COUNT(*)::int AS count FROM people");
  assert.equal(afterTransaction.rows[0].count,0,"Tenant context must not leak across pooled connections");
  const permitted=await runtime.query("SELECT 1 FROM studio_users WHERE studio_id=$1 AND user_id=$2",[studio1,user1]);
  assert.equal(permitted.rowCount,1);
  const mismatch=await runtime.query("SELECT 1 FROM studio_users WHERE studio_id=$1 AND user_id=$2",[studio2,user1]);
  assert.equal(mismatch.rowCount,0,"Membership check must fail for another studio");
  console.log("PostgreSQL integration passed: restricted role, forced RLS, tenant isolation, cross-tenant writes, pool context cleanup.");
 }finally{
  if(studio1)await admin.query("DELETE FROM studios WHERE id=$1",[studio1]).catch(()=>{});
  if(studio2)await admin.query("DELETE FROM studios WHERE id=$1",[studio2]).catch(()=>{});
  if(user1)await admin.query("DELETE FROM app_users WHERE id=$1",[user1]).catch(()=>{});
  if(user2)await admin.query("DELETE FROM app_users WHERE id=$1",[user2]).catch(()=>{});
  await runtime.end();await admin.end();
 }
}
run().catch(err=>{console.error(err);process.exitCode=1});
