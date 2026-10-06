// Run explicitly BEFORE enabling paying studio customers. No credentials are printed.
const needed=["DATABASE_URL","MIGRATION_DATABASE_URL","PUBLIC_APP_ORIGIN","SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD",
 "LEMON_API_KEY","LEMON_STORE_ID","LEMON_MONTHLY_VARIANT_ID","LEMON_ANNUAL_VARIANT_ID","LEMON_WEBHOOK_SECRET",
 "BACKUP_DATABASE_URL","BACKUP_PASSPHRASE","BACKUP_OUTPUT_DIR"];
const missing=needed.filter(x=>!process.env[x]);
if(!/^https:\/\//.test(process.env.PUBLIC_APP_ORIGIN||""))missing.push("PUBLIC_APP_ORIGIN must use HTTPS");
if(process.env.BILLING_ENFORCEMENT!=="required")missing.push("BILLING_ENFORCEMENT=required");
if(process.env.AUTH_ALLOW_REGISTRATION!=="true")missing.push("AUTH_ALLOW_REGISTRATION=true");
for(const key of ["LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_COUNTRY","LEGAL_CONTACT_EMAIL","LEGAL_GOVERNING_LAW","LEGAL_JURISDICTION","LEGAL_HOSTING_PROVIDER","LEGAL_EMAIL_PROVIDER","LEGAL_AUDIT_HASH_KEY"])if(!process.env[key])missing.push(key);
if(process.env.BILLING_ALLOW_LOCAL_TEST==="true")missing.push("BILLING_ALLOW_LOCAL_TEST must be disabled");
if(process.env.DATABASE_SSL_REQUIRE!=="true")missing.push("DATABASE_SSL_REQUIRE=true for a verified hosted provider");
console.log(missing.length?"Launch configuration incomplete:\n- "+missing.join("\n- "):"Environment gate passed. Environment gate passed. Manual counsel review, SMTP delivery, actual backup restore and security checks are still required.");
if(missing.length)process.exitCode=1;
