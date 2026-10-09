"use strict";
// Explicit one-time administrative setup. Run only after a verified backup and migrations.
const {Pool}=require("pg");
const {randomBytes}=require("node:crypto");
const allowed=/^[a-z_][a-z0-9_]{2,47}$/;
async function main(){
 const adminUrl=process.env.MIGRATION_DATABASE_URL,role=process.env.RUNTIME_ROLE_NAME;
 const password=process.env.RUNTIME_ROLE_PASSWORD;
 if(!adminUrl||!allowed.test(role||"")||!password||password.length<32)
  throw Error("Provide admin URL, a safe RUNTIME_ROLE_NAME and a random RUNTIME_ROLE_PASSWORD (32+ characters).");
 if(["postgres","public","root","reformdesk_app"].includes(role))throw Error("Use a unique production role, never a built-in or test identity.");
 if(process.env.CONFIRM_CREATE_PRODUCTION_ROLE!=="YES_I_CONFIRMED")
  throw Error("Set CONFIRM_CREATE_PRODUCTION_ROLE=YES_I_CONFIRMED to execute.");
 const parsed=new URL(adminUrl);if(!["postgres:","postgresql:"].includes(parsed.protocol))throw Error("Invalid admin URL.");
 const pool=new Pool({connectionString:adminUrl});
 try{
  const existing=await pool.query("SELECT rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname=$1",[role]);
  if(existing.rows[0]?.rolsuper||existing.rows[0]?.rolbypassrls||existing.rows[0]?.rolcreaterole)
   throw Error("Unsafe existing runtime role. Do not modify it automatically.");
  const quoteLiteral=s=>"'"+s.replace(/'/g,"''")+"'";
  if(!existing.rowCount)await pool.query("CREATE ROLE "+role+" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD "+quoteLiteral(password));
  else await pool.query("ALTER ROLE "+role+" NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD "+quoteLiteral(password));
  const database=decodeURIComponent(parsed.pathname.slice(1));
  if(!allowed.test(database))throw Error("Database name requires manual GRANT review.");
  await pool.query("GRANT CONNECT ON DATABASE "+database+" TO "+role);
  await pool.query("GRANT USAGE ON SCHEMA public TO "+role);
  const general="app_users,studios,studio_users,auth_sessions,login_attempts,login_ip_attempts,staff_invitations,people,class_sessions,bookings,credit_ledger,followup_tasks,activity_log,subscriptions,studio_staff,billing_events,auth_challenges,mail_outbox,data_export_audits,studio_packages,import_batches";
  await pool.query("GRANT SELECT,INSERT,UPDATE ON "+general+" TO "+role);
  await pool.query("GRANT SELECT,INSERT,UPDATE,DELETE ON auth_trusted_devices TO "+role);
  await pool.query("GRANT SELECT,INSERT,UPDATE,DELETE ON studio_brand_assets,action_center_snoozes TO "+role);
  await pool.query("GRANT SELECT,INSERT ON legal_acceptances TO "+role);
  await pool.query("GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO "+role);
  const verify=await pool.query("SELECT rolsuper,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname=$1",[role]);
  if(!verify.rowCount||verify.rows[0].rolsuper||verify.rows[0].rolbypassrls||!verify.rows[0].rolcanlogin)throw Error("Created runtime role failed safety checks.");
  console.log("Restricted production role permissions configured. Verify FORCE RLS and cross-tenant tests before launch.");
 }finally{await pool.end()}
}
main().catch(e=>{console.error("Production role setup refused:",e.message);process.exitCode=1});
