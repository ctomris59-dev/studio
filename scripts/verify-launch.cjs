// Run explicitly BEFORE enabling paying studio customers. No credentials are printed.
const needed=["DATABASE_URL","MIGRATION_DATABASE_URL","PUBLIC_APP_ORIGIN","SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD",
 "PADDLE_API_KEY","NEXT_PUBLIC_PADDLE_CLIENT_TOKEN","PADDLE_MONTHLY_PRICE_ID","PADDLE_ANNUAL_PRICE_ID","PADDLE_WEBHOOK_SECRET",
 "BACKUP_DATABASE_URL","BACKUP_PASSPHRASE","BACKUP_OUTPUT_DIR"];
const missing=needed.filter(x=>!process.env[x]);
if(!/^https:\/\//.test(process.env.PUBLIC_APP_ORIGIN||""))missing.push("PUBLIC_APP_ORIGIN must use HTTPS");
if(process.env.BILLING_ENFORCEMENT!=="required")missing.push("BILLING_ENFORCEMENT=required");
if(process.env.AUTH_ALLOW_REGISTRATION!=="true")missing.push("AUTH_ALLOW_REGISTRATION=true");
if(process.env.PADDLE_ENV!=="production")missing.push("PADDLE_ENV=production");
if(!/^live_[A-Za-z0-9_-]{8,}$/.test(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN||""))missing.push("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN must be a live Paddle token");
if(!/^pri_[a-z\d]{26}$/.test(process.env.PADDLE_MONTHLY_PRICE_ID||""))missing.push("PADDLE_MONTHLY_PRICE_ID must be a live configured Paddle price id");
if(!/^pri_[a-z\d]{26}$/.test(process.env.PADDLE_ANNUAL_PRICE_ID||""))missing.push("PADDLE_ANNUAL_PRICE_ID must be a live configured Paddle price id");
for(const key of ["LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_COUNTRY","LEGAL_CONTACT_EMAIL","LEGAL_SUPPORT_PHONE",
 "LEGAL_GOVERNING_LAW","LEGAL_JURISDICTION","LEGAL_HOSTING_PROVIDER","LEGAL_HOSTING_REGION","LEGAL_EMAIL_PROVIDER","LEGAL_AUDIT_HASH_KEY"])
 if(!process.env[key])missing.push(key);
if(process.env.BILLING_ALLOW_LOCAL_TEST==="true")missing.push("BILLING_ALLOW_LOCAL_TEST must be disabled");
if(process.env.DATABASE_SSL_REQUIRE!=="true")missing.push("DATABASE_SSL_REQUIRE=true for a verified hosted provider");
console.log(missing.length?"Paid launch configuration incomplete:\n- "+missing.join("\n- "):
 "Technical environment gate passed. Live Paddle checkout, tax/MoR behavior, SMTP delivery, backup restore, privacy/security procedures and Turkish legal/tax treatment still require real-environment validation and appropriate professional review.");
if(missing.length)process.exitCode=1;
