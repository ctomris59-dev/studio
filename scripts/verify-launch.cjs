// Run explicitly BEFORE enabling paying studio customers. No credentials are printed.
const needed=["DATABASE_URL","MIGRATION_DATABASE_URL","PUBLIC_APP_ORIGIN","SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD",
 "PADDLE_API_KEY","NEXT_PUBLIC_PADDLE_CLIENT_TOKEN","PADDLE_MONTHLY_PRICE_ID","PADDLE_ANNUAL_PRICE_ID","PADDLE_WEBHOOK_SECRET",
 "BACKUP_DATABASE_URL","BACKUP_PASSPHRASE","BACKUP_OUTPUT_DIR"];
const missing=needed.filter(x=>!process.env[x]);
if(!/^https:\/\//.test(process.env.PUBLIC_APP_ORIGIN||""))missing.push("PUBLIC_APP_ORIGIN must use HTTPS");
if(process.env.BILLING_ENFORCEMENT!=="required")missing.push("BILLING_ENFORCEMENT=required");
if(process.env.AUTH_ALLOW_REGISTRATION!=="true")missing.push("AUTH_ALLOW_REGISTRATION=true");
if(process.env.LAUNCH_PADDLE_ACCOUNT_APPROVED!=="true")missing.push("LAUNCH_PADDLE_ACCOUNT_APPROVED=true only after Paddle has approved the live account/domain");
if(process.env.LAUNCH_LEGAL_REVIEW_CONFIRMED!=="true")missing.push("LAUNCH_LEGAL_REVIEW_CONFIRMED=true only after the live legal identity/terms have been reviewed");
if(process.env.LAUNCH_TAX_REVIEW_CONFIRMED!=="true")missing.push("LAUNCH_TAX_REVIEW_CONFIRMED=true only after the Turkish payout/invoicing/tax treatment has been confirmed");
if(process.env.PADDLE_ENV!=="production")missing.push("PADDLE_ENV=production");
if(!/^live_[A-Za-z0-9_-]{8,}$/.test(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN||""))missing.push("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN must be a live Paddle token");
if(!/^pri_[a-z\d]{26}$/.test(process.env.PADDLE_MONTHLY_PRICE_ID||""))missing.push("PADDLE_MONTHLY_PRICE_ID must be a live configured Paddle price id");
if(!/^pri_[a-z\d]{26}$/.test(process.env.PADDLE_ANNUAL_PRICE_ID||""))missing.push("PADDLE_ANNUAL_PRICE_ID must be a live configured Paddle price id");
for(const key of ["LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_COUNTRY","LEGAL_CONTACT_EMAIL","LEGAL_SUPPORT_PHONE",
 "LEGAL_GOVERNING_LAW","LEGAL_JURISDICTION","LEGAL_HOSTING_PROVIDER","LEGAL_HOSTING_REGION","LEGAL_EMAIL_PROVIDER","LEGAL_AUDIT_HASH_KEY"])
 if(!process.env[key])missing.push(key);
if(process.env.BILLING_ALLOW_LOCAL_TEST==="true")missing.push("BILLING_ALLOW_LOCAL_TEST must be disabled");
const databaseHost=(()=>{try{return new URL(process.env.DATABASE_URL||"").hostname}catch{return ""}})();
if(!["localhost","127.0.0.1","::1"].includes(databaseHost)&&process.env.DATABASE_SSL_REQUIRE!=="true")
 missing.push("Remote database requires DATABASE_SSL_REQUIRE=true");
if(process.env.TRUST_PROXY_IP_HEADERS!=="true"||process.env.LAUNCH_TRUSTED_PROXY_VERIFIED!=="true")
 missing.push("Trusted reverse proxy must overwrite X-Real-IP and X-Forwarded-For and be independently verified");
if(process.env.TURNSTILE_REQUIRED!=="true"||!process.env.TURNSTILE_SECRET_KEY||!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
 missing.push("Cloudflare Turnstile keys and TURNSTILE_REQUIRED=true must be configured for paid launch");
if((process.env.LOGIN_RATE_HMAC_KEY||"").length<32)
 missing.push("LOGIN_RATE_HMAC_KEY must be a random 32+ character secret");
for(const attestation of [
 "LAUNCH_SMTP_DELIVERY_VERIFIED","LAUNCH_BACKUP_RESTORE_VERIFIED",
 "LAUNCH_PADDLE_LIVE_CHECKOUT_VERIFIED","LAUNCH_PRIVACY_RETENTION_VERIFIED"
])if(process.env[attestation]!=="true")missing.push(attestation+" requires a documented real-world verification before launch.");
if(!process.env.RCLONE_REMOTE_DIR||!process.env.RCLONE_CONFIG)missing.push("Encrypted offsite backup destination not configured.");

async function technicalChecks(){
 const {Pool}=require("pg"),nodemailer=require("nodemailer");
 const fs=require("node:fs/promises"),path=require("node:path");
 const {decryptStream}=require("./backup-crypto.cjs");
 const {newestBackup,remotePath}=require("./backup-offsite.cjs");
 const {spawn}=require("node:child_process");
 const pool=new Pool({connectionString:process.env.DATABASE_URL,
  ssl:process.env.DATABASE_SSL_REQUIRE==="true"?{rejectUnauthorized:true}:undefined,max:1});
 const admin=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL,max:1});
 try{
  const runtime=await pool.query("SELECT rolsuper,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname=current_user");
  if(!runtime.rowCount||runtime.rows[0].rolsuper||runtime.rows[0].rolbypassrls||!runtime.rows[0].rolcanlogin)
   throw Error("Application connection does not use a safe restricted login.");
  const tenantTables=["people","class_sessions","bookings","credit_ledger","followup_tasks","activity_log","subscriptions","studio_staff","staff_invitations"];
  const rows=await pool.query(`
   SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=ANY($1::text[])`,[tenantTables]);
  if(rows.rowCount!==tenantTables.length||rows.rows.some(x=>!x.relrowsecurity||!x.relforcerowsecurity))
   throw Error("Critical tenant table is missing FORCE ROW LEVEL SECURITY.");
  const migrations=(await fs.readdir(path.join(__dirname,"../db/migrations"))).filter(x=>/^\d+_[a-z0-9_]+\.sql$/.test(x));
  const applied=await admin.query("SELECT version FROM schema_migrations");
  const existing=new Set(applied.rows.map(x=>x.version));
  const missingMigrations=migrations.filter(x=>!existing.has(x));
  if(missingMigrations.length)throw Error("Unapplied database migrations: "+missingMigrations.join(", "));
  console.log("Restricted role, FORCE RLS and migration sequence verified.");
 }finally{await pool.end();await admin.end()}
 const port=Number(process.env.SMTP_PORT||587);
 if(![465,587].includes(port))throw Error("Unsupported SMTP port.");
 const transport=nodemailer.createTransport({
  host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:true,tls:{rejectUnauthorized:true},
  auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},
  connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000
 });
 try{await transport.verify()}finally{transport.close()}
 console.log("SMTP authenticated connection verified. Real message delivery still needs evidence.");
 const latest=await newestBackup(process.env.BACKUP_OUTPUT_DIR);
 const info=await fs.stat(latest);
 if(Date.now()-info.mtimeMs>48*3600000)throw Error("Newest encrypted backup is older than 48 hours.");
 await decryptStream(latest,process.env.BACKUP_PASSPHRASE);
 console.log("Newest local encrypted backup authenticated and within recency limit.");
 const dest=remotePath(process.env.RCLONE_REMOTE_DIR,path.basename(latest));
 await new Promise((resolve,reject)=>{
  const proc=spawn("rclone",["lsjson","--stat",dest],{env:process.env,stdio:["ignore","pipe","pipe"]});
  let out="",err="";proc.stdout.on("data",x=>{out+=String(x).slice(0,5000)});
  proc.stderr.on("data",x=>{err+=String(x).slice(0,300)});
  proc.on("error",reject);proc.on("close",code=>{
   if(code!==0)return reject(Error("Offsite backup lookup failed."));
   try{if(JSON.parse(out).Size!==info.size)return reject(Error("Remote backup size differs from local archive."));resolve()}
   catch{reject(Error("Invalid offsite backup metadata."))}
  });
 });
 console.log("Matching encrypted offsite archive verified by size. Independently restored backup is still required.");
}
if(missing.length){
 console.error("Paid launch configuration incomplete:\n- "+missing.join("\n- "));
 process.exitCode=1;
}else{
 technicalChecks().then(()=>console.log("Technical launch preflight passed. Business and legal attestations still require real evidence."))
  .catch(e=>{console.error("Technical launch preflight refused:",e instanceof Error?e.message:"Unknown failure");process.exitCode=1});
}
