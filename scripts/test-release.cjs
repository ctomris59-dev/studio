const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
const source=fs.readFileSync("lib/server/release-config.ts","utf8");
const compiled={exports:{}};
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function("require","module","exports",js)(name=>name==="server-only"?{}:require(name),compiled,compiled.exports);
const gate=compiled.exports.commercialRegistrationReady;
const names=["PUBLIC_APP_ORIGIN","BILLING_ALLOW_LOCAL_TEST","BILLING_ENFORCEMENT",
 "DATABASE_URL","SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD","LEMON_API_KEY","LEMON_STORE_ID",
 "LEMON_MONTHLY_VARIANT_ID","LEMON_ANNUAL_VARIANT_ID","LEMON_WEBHOOK_SECRET","BACKUP_DATABASE_URL",
 "BACKUP_PASSPHRASE","BACKUP_OUTPUT_DIR","LEGAL_OPERATOR_NAME","LEGAL_OPERATOR_ADDRESS","LEGAL_OPERATOR_COUNTRY",
 "LEGAL_CONTACT_EMAIL","LEGAL_GOVERNING_LAW","LEGAL_JURISDICTION","LEGAL_HOSTING_PROVIDER","LEGAL_HOSTING_REGION","LEGAL_EMAIL_PROVIDER","LEGAL_AUDIT_HASH_KEY"];
const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
try{
 for(const k of names)delete process.env[k];
 assert.equal(gate(),false,"Incomplete config must fail closed");
 process.env.PUBLIC_APP_ORIGIN="https://studio.example.com";
 assert.equal(gate(),false,"HTTPS alone must not enable registration");
 process.env.BILLING_ALLOW_LOCAL_TEST="true";
 assert.equal(gate(),false,"Local test flag must not bypass a public HTTPS origin");
 process.env.PUBLIC_APP_ORIGIN="http://127.0.0.1:3187";
 assert.equal(gate(),true,"Explicit local integration mode should remain available");
 process.env.BILLING_ALLOW_LOCAL_TEST="false";
 assert.equal(gate(),false,"Disable local bypass on remote instances");
 process.env.PUBLIC_APP_ORIGIN="https://studio.example.com";
 for(const key of names.filter(k=>!["PUBLIC_APP_ORIGIN","BILLING_ALLOW_LOCAL_TEST","BILLING_ENFORCEMENT"].includes(k)))process.env[key]="test-placeholder";
 process.env.BILLING_ENFORCEMENT="required";
 assert.equal(gate(),true,"Fully set individual-operator paid configuration may proceed to manual launch checks");
 delete process.env.SMTP_PASSWORD;
 assert.equal(gate(),false,"Missing mail credentials must block signup");
 process.env.SMTP_PASSWORD="test-placeholder";delete process.env.LEGAL_OPERATOR_NAME;
 assert.equal(gate(),false,"Missing individual legal operator identity must block signup");
 process.env.LEGAL_OPERATOR_NAME="test-placeholder";delete process.env.LEGAL_HOSTING_REGION;
 assert.equal(gate(),false,"Missing production hosting region must block paid signup");
 console.log("Paid registration fail-closed checks passed for individual operator configuration.");
}finally{for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k]}}
