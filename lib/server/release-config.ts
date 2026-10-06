import "server-only";
/** Fail closed: paid studio signup requires an identified legal operator (individual or business),
    transactional account mail, StudioTasker billing and verified backups. Member payments stay outside the product. */
export function commercialRegistrationReady():boolean{
 const origin=process.env.PUBLIC_APP_ORIGIN||"";
 const testLoopback=process.env.BILLING_ALLOW_LOCAL_TEST==="true"&&/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
 if(testLoopback)return true;
 const required=["DATABASE_URL","SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD",
  "PADDLE_API_KEY","NEXT_PUBLIC_PADDLE_CLIENT_TOKEN","PADDLE_MONTHLY_PRICE_ID","PADDLE_ANNUAL_PRICE_ID",
  "PADDLE_WEBHOOK_SECRET","BACKUP_DATABASE_URL","BACKUP_PASSPHRASE","BACKUP_OUTPUT_DIR",
  "LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_COUNTRY","LEGAL_CONTACT_EMAIL","LEGAL_SUPPORT_PHONE",
  "LEGAL_GOVERNING_LAW","LEGAL_JURISDICTION","LEGAL_HOSTING_PROVIDER","LEGAL_HOSTING_REGION","LEGAL_EMAIL_PROVIDER","LEGAL_AUDIT_HASH_KEY"];
 const productionBilling=process.env.PADDLE_ENV==="production"&&
  /^live_[A-Za-z0-9_-]{8,}$/.test(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN||"")&&
  /^pri_[a-z\d]{26}$/.test(process.env.PADDLE_MONTHLY_PRICE_ID||"")&&
  /^pri_[a-z\d]{26}$/.test(process.env.PADDLE_ANNUAL_PRICE_ID||"");
 const manualGates=process.env.LAUNCH_PADDLE_ACCOUNT_APPROVED==="true"&&
  process.env.LAUNCH_LEGAL_REVIEW_CONFIRMED==="true"&&process.env.LAUNCH_TAX_REVIEW_CONFIRMED==="true";
 return origin.startsWith("https://")&&process.env.BILLING_ENFORCEMENT==="required"&&productionBilling&&manualGates&&required.every(k=>Boolean(process.env[k]));
}
