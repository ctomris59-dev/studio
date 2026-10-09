const {Pool}=require("pg");
async function main(){
 if(!process.env.MAINTENANCE_DATABASE_URL)throw Error("MAINTENANCE_DATABASE_URL is required. Scheduled cleanup must not use the migration/admin identity.");
 const pool=new Pool({connectionString:process.env.MAINTENANCE_DATABASE_URL});
 try{
  // Remove raw, expired one-time URLs from a queued email, even when SMTP wasn't configured.
  const clear=await pool.query(`
   UPDATE mail_outbox SET payload='{}'::jsonb,last_error=COALESCE(last_error,'One-time link expired')
   WHERE dispatched_at IS NULL AND template IN ('verify_email','password_reset','member_invitation','staff_invitation')
    AND created_at<now()-interval '48 hours' AND payload<>'{}'::jsonb`);
  const challenges=await pool.query(`
   DELETE FROM auth_challenges WHERE expires_at<now()-interval '30 days'`);
  const oldMail=await pool.query("DELETE FROM mail_outbox WHERE dispatched_at<now()-interval '90 days'");
  const expiredSessions=await pool.query("DELETE FROM auth_sessions WHERE expires_at<now()-interval '30 days'");
  const expiredDevices=await pool.query("DELETE FROM auth_trusted_devices WHERE expires_at<now()");
  const loginAttempts=await pool.query("DELETE FROM login_attempts WHERE window_started_at<now()-interval '7 days'");
  const ipAttempts=await pool.query("DELETE FROM login_ip_attempts WHERE window_started_at<now()-interval '7 days'");
  const publicAttempts=await pool.query(`
   DELETE FROM public_signup_attempts WHERE window_started_at<now()-interval '2 days'`).catch(()=>({rowCount:0}));
  console.log("Expired sensitive notification payloads cleared:",clear.rowCount,
    "expired auth challenges purged:",challenges.rowCount,
    "delivered outbox rows past retention:",oldMail.rowCount,
    "old public signup throttle rows purged:",publicAttempts.rowCount,
    "expired sessions:",expiredSessions.rowCount,
    "old login counters:",loginAttempts.rowCount,
    "old IP counters:",ipAttempts.rowCount);
 }finally{await pool.end()}
}
main().catch(e=>{console.error("Cleanup failed:",e.message);process.exitCode=1});
