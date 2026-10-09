"use strict";
const {Pool}=require("pg");
const allowed=/^[a-z_][a-z0-9_]{2,47}$/;
async function main(){
 const admin=process.env.MIGRATION_DATABASE_URL,role=process.env.MAINTENANCE_ROLE_NAME,password=process.env.MAINTENANCE_ROLE_PASSWORD;
 if(!admin||!allowed.test(role||"")||!password||password.length<32)throw Error("Set admin URL, safe MAINTENANCE_ROLE_NAME and a 32+ character MAINTENANCE_ROLE_PASSWORD.");
 if(["postgres","root","public","reformdesk_app"].includes(role))throw Error("Cannot use built-in/test roles.");
 if(process.env.CONFIRM_CREATE_MAINTENANCE_ROLE!=="YES_I_CONFIRMED")throw Error("Explicit confirmation required.");
 const url=new URL(admin),database=decodeURIComponent(url.pathname.slice(1));
 if(!["postgres:","postgresql:"].includes(url.protocol)||!allowed.test(database))throw Error("Manual review required for database URL.");
 const pool=new Pool({connectionString:admin});
 try{
  const old=await pool.query("SELECT rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname=$1",[role]);
  if(old.rows[0]?.rolsuper||old.rows[0]?.rolbypassrls||old.rows[0]?.rolcreaterole)throw Error("Unsafe maintenance role exists.");
  const literal="'"+password.replace(/'/g,"''")+"'";
  if(!old.rowCount)await pool.query("CREATE ROLE "+role+" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD "+literal);
  else await pool.query("ALTER ROLE "+role+" NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD "+literal);
  await pool.query("GRANT CONNECT ON DATABASE "+database+" TO "+role);
  await pool.query("GRANT USAGE ON SCHEMA public TO "+role);
  await pool.query("GRANT SELECT,UPDATE,DELETE ON mail_outbox TO "+role);
  await pool.query("GRANT SELECT,DELETE ON auth_challenges,auth_sessions,login_attempts,login_ip_attempts TO "+role);
  const extra=await pool.query("SELECT to_regclass('public.public_signup_attempts') AS tab");
  if(extra.rows[0]?.tab)await pool.query("GRANT SELECT,DELETE ON public_signup_attempts TO "+role);
  console.log("Limited maintenance role created. Do not use it for migrations, application requests or backups.");
 }finally{await pool.end()}
}
main().catch(e=>{console.error("Maintenance setup refused:",e.message);process.exitCode=1});
