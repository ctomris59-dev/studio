const {Pool}=require("pg");
async function main(){
 if(!process.env.MIGRATION_DATABASE_URL)throw Error("MIGRATION_DATABASE_URL or a dedicated maintenance connection is required");
 const pool=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL});
 try{
  // Remove raw, expired one-time URLs from a queued email, even when SMTP wasn't configured.
  const clear=await pool.query(`
   UPDATE mail_outbox SET payload='{}'::jsonb,last_error=COALESCE(last_error,'One-time link expired')
   WHERE dispatched_at IS NULL AND template IN ('verify_email','password_reset','member_invitation')
    AND created_at<now()-interval '48 hours' AND payload<>'{}'::jsonb`);
  const challenges=await pool.query(`
   DELETE FROM auth_challenges WHERE expires_at<now()-interval '30 days'`);
  const expiredSessions=await pool.query("DELETE FROM auth_sessions WHERE expires_at<now()-interval '30 days'");
  const loginAttempts=await pool.query("DELETE FROM login_attempts WHERE window_started_at<now()-interval '7 days'");
  const ipAttempts=await pool.query("DELETE FROM login_ip_attempts WHERE window_started_at<now()-interval '7 days'");
  const publicAttempts=await pool.query(`
   DELETE FROM public_signup_attempts WHERE window_started_at<now()-interval '2 days'`).catch(()=>({rowCount:0}));
  console.log("Expired sensitive notification payloads cleared:",clear.rowCount,
    "expired auth challenges purged:",challenges.rowCount,
    "old public signup throttle rows purged:",publicAttempts.rowCount,
    "expired sessions:",expiredSessions.rowCount,
    "old login counters:",loginAttempts.rowCount,
    "old IP counters:",ipAttempts.rowCount);
 }finally{await pool.end()}
}
main().catch(e=>{console.error("Cleanup failed:",e.message);process.exitCode=1});
