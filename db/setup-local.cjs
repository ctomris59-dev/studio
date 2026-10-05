// LOCAL/CI USE ONLY: creates a restricted runtime role with known development credentials.
// Never run against a production or shared database.
const {Pool}=require("pg");
const {main:migrate}=require("./migrate.cjs");
async function main(){
 const url=process.env.MIGRATION_DATABASE_URL;
 if(!url)throw new Error("Set MIGRATION_DATABASE_URL");
 const parsed=new URL(url);
 if(!["localhost","127.0.0.1","postgres"].includes(parsed.hostname))throw new Error("Local setup REFUSES remote databases.");
 await migrate();
 const pool=new Pool({connectionString:url});
 try{
  await pool.query(`DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='reformdesk_app') THEN
      CREATE ROLE reformdesk_app LOGIN PASSWORD 'reformdesk_dev_only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    END IF;
  END $$`);
  await pool.query("GRANT CONNECT ON DATABASE \""+parsed.pathname.slice(1).replace(/"/g,"\"\"")+"\" TO reformdesk_app");
  await pool.query("GRANT USAGE ON SCHEMA public TO reformdesk_app");
  await pool.query("GRANT SELECT, INSERT, UPDATE ON app_users, studios, studio_users, auth_sessions, login_attempts TO reformdesk_app");
  await pool.query("GRANT SELECT, INSERT, UPDATE ON people, class_sessions, bookings, credit_ledger, followup_tasks, activity_log, subscriptions TO reformdesk_app");
  await pool.query("GRANT SELECT, INSERT, UPDATE ON billing_events TO reformdesk_app");
  await pool.query("GRANT SELECT, INSERT, UPDATE ON auth_challenges, mail_outbox, member_identities, data_export_audits TO reformdesk_app");
  await pool.query("GRANT SELECT, INSERT, UPDATE ON studio_payment_accounts, studio_packages, member_purchases, studio_payment_events TO reformdesk_app");
  await pool.query("GRANT SELECT, INSERT, UPDATE, DELETE ON action_center_snoozes TO reformdesk_app");
  await pool.query("GRANT SELECT, INSERT, UPDATE ON public_signup_attempts, import_batches TO reformdesk_app");
  await pool.query("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO reformdesk_app");
  const check=await pool.query("SELECT rolbypassrls,rolsuper FROM pg_roles WHERE rolname='reformdesk_app'");
  if(check.rows[0]?.rolsuper||check.rows[0]?.rolbypassrls)throw new Error("Unsafe application role detected.");
  console.log("Local restricted reformdesk_app role ready. Do NOT reuse credentials in production.");
 }finally{await pool.end()}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={main};
