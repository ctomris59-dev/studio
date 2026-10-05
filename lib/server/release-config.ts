import "server-only";
/** Fail closed: public paid studio signup requires transactional account mail,
    StudioTasker billing and verified backups. Member payments are intentionally outside the product. */
export function commercialRegistrationReady():boolean{
 const origin=process.env.PUBLIC_APP_ORIGIN||"";
 const testLoopback=process.env.BILLING_ALLOW_LOCAL_TEST==="true"&&/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
 if(testLoopback)return true;
 const required=["DATABASE_URL","SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD",
  "LEMON_API_KEY","LEMON_STORE_ID","LEMON_MONTHLY_VARIANT_ID","LEMON_ANNUAL_VARIANT_ID",
  "LEMON_WEBHOOK_SECRET","BACKUP_DATABASE_URL","BACKUP_PASSPHRASE","BACKUP_OUTPUT_DIR"];
 return origin.startsWith("https://")&&process.env.BILLING_ENFORCEMENT==="required"&&required.every(k=>Boolean(process.env[k]));
}
