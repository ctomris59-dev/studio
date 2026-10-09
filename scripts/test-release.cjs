const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
const source=fs.readFileSync("lib/server/release-config.ts","utf8");
const launch=fs.readFileSync("scripts/verify-launch.cjs","utf8");
assert(launch.includes("schema_migrations")&&launch.includes("relforcerowsecurity")&&launch.includes("transport.verify()")&&launch.includes("newestBackup("), "Paid launch verification must check real database, SMTP and backup readiness.");
require("node:child_process").execFileSync(process.execPath,["--check","scripts/verify-launch.cjs"]);

const compiled={exports:{}};
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function("require","module","exports",js)(name=>name==="server-only"?{}:require(name),compiled,compiled.exports);
const gate=compiled.exports.commercialRegistrationReady;
const names=["PUBLIC_APP_ORIGIN","BILLING_ALLOW_LOCAL_TEST","BILLING_ENFORCEMENT","LAUNCH_PADDLE_ACCOUNT_APPROVED","LAUNCH_LEGAL_REVIEW_CONFIRMED","LAUNCH_TAX_REVIEW_CONFIRMED","TRUST_PROXY_IP_HEADERS","LAUNCH_TRUSTED_PROXY_VERIFIED","LOGIN_RATE_HMAC_KEY",
 "DATABASE_URL","SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD",
 "PADDLE_ENV","PADDLE_API_KEY","NEXT_PUBLIC_PADDLE_CLIENT_TOKEN","PADDLE_MONTHLY_PRICE_ID","PADDLE_ANNUAL_PRICE_ID","PADDLE_WEBHOOK_SECRET",
 "BACKUP_DATABASE_URL","BACKUP_PASSPHRASE","BACKUP_OUTPUT_DIR",
 "LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_COUNTRY","LEGAL_CONTACT_EMAIL","LEGAL_SUPPORT_PHONE",
 "LEGAL_GOVERNING_LAW","LEGAL_JURISDICTION","LEGAL_HOSTING_PROVIDER","LEGAL_HOSTING_REGION","LEGAL_EMAIL_PROVIDER","LEGAL_AUDIT_HASH_KEY"];
const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
try{
 for(const k of names)delete process.env[k];
 assert.equal(gate(),false,"Incomplete config must fail closed");
 process.env.PUBLIC_APP_ORIGIN="https://studio.example.com";
 assert.equal(gate(),false,"HTTPS alone must not enable registration");
 process.env.BILLING_ALLOW_LOCAL_TEST="true";
 assert.equal(gate(),false,"Local test flag must not bypass a public HTTPS origin");
 process.env.PUBLIC_APP_ORIGIN="http://127.0.0.1:3187";
 assert.equal(gate(),true,"Explicit localhost integration mode should remain available");
 process.env.BILLING_ALLOW_LOCAL_TEST="false";
 assert.equal(gate(),false,"Disable local bypass on remote instances");

 process.env.PUBLIC_APP_ORIGIN="https://studio.example.com";
 for(const key of names.filter(k=>!["PUBLIC_APP_ORIGIN","BILLING_ALLOW_LOCAL_TEST","BILLING_ENFORCEMENT","PADDLE_ENV","NEXT_PUBLIC_PADDLE_CLIENT_TOKEN","PADDLE_MONTHLY_PRICE_ID","PADDLE_ANNUAL_PRICE_ID"].includes(k)))
  process.env[key]="test-placeholder";
 process.env.PADDLE_ENV="production";
 process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN="live_ci_only_token_123456";
 process.env.PADDLE_MONTHLY_PRICE_ID="pri_"+"a".repeat(26);
 process.env.PADDLE_ANNUAL_PRICE_ID="pri_"+"b".repeat(26);
 process.env.BILLING_ENFORCEMENT="required";
 assert.equal(gate(),false,"Technical configuration must not bypass manual legal/tax/Paddle approval gates");
 process.env.LAUNCH_PADDLE_ACCOUNT_APPROVED="true";
 process.env.LAUNCH_LEGAL_REVIEW_CONFIRMED="true";
 process.env.LAUNCH_TAX_REVIEW_CONFIRMED="true";
 assert.equal(gate(),false,"Commercial signup must refuse an unverified reverse proxy.");
 process.env.TRUST_PROXY_IP_HEADERS="true";
 process.env.LAUNCH_TRUSTED_PROXY_VERIFIED="true";
 process.env.LOGIN_RATE_HMAC_KEY="c".repeat(40);
 assert.equal(gate(),true,"Fully configured live Paddle setup with verified proxy and commercial reviews may enable registration");
 process.env.LOGIN_RATE_HMAC_KEY="short";
 assert.equal(gate(),false,"Weak IP hash secrets must block public signup.");
 process.env.LOGIN_RATE_HMAC_KEY="c".repeat(40);

 process.env.PADDLE_ENV="sandbox";
 assert.equal(gate(),false,"Sandbox mode must never enable public paid registration");
 process.env.PADDLE_ENV="production";
 process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN="test_wrong_environment_token";
 assert.equal(gate(),false,"Sandbox/client test token must never enable live registration");
 process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN="live_ci_only_token_123456";

 delete process.env.SMTP_PASSWORD;
 assert.equal(gate(),false,"Missing mail credentials must block signup");
 process.env.SMTP_PASSWORD="test-placeholder";
 delete process.env.LEGAL_OPERATOR_NAME;
 assert.equal(gate(),false,"Missing legal operator identity must block signup");
 process.env.LEGAL_OPERATOR_NAME="test-placeholder";
 delete process.env.LEGAL_SUPPORT_PHONE;
 assert.equal(gate(),false,"Missing public support phone must block signup");
 process.env.LEGAL_SUPPORT_PHONE="test-placeholder";
 delete process.env.LEGAL_HOSTING_REGION;
 assert.equal(gate(),false,"Missing production hosting region must block paid signup");
 console.log("Paid registration fail-closed checks passed for live Paddle and individual-operator configuration.");
}finally{
 for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k]}
}
