const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
const source=fs.readFileSync("lib/server/release-config.ts","utf8");
const compiled={exports:{}};
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function("require","module","exports",js)(name=>name==="server-only"?{}:require(name),compiled,compiled.exports);
const gate=compiled.exports.commercialRegistrationReady;
const names=["PUBLIC_APP_ORIGIN","BILLING_ALLOW_LOCAL_TEST","BILLING_ENFORCEMENT",
 "DATABASE_URL","SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD","LEMON_API_KEY","LEMON_STORE_ID",
 "LEMON_MONTHLY_VARIANT_ID","LEMON_ANNUAL_VARIANT_ID","LEMON_WEBHOOK_SECRET","BACKUP_DATABASE_URL",
 "BACKUP_PASSPHRASE","BACKUP_OUTPUT_DIR","STRIPE_SECRET_KEY","STRIPE_CONNECT_WEBHOOK_SECRET","STRIPE_STUDIO_PAYMENTS_ENABLED"];
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
 process.env.STRIPE_STUDIO_PAYMENTS_ENABLED="true";
 assert.equal(gate(),true,"Fully set commercial configuration may proceed to manual launch checks");
 delete process.env.SMTP_PASSWORD;
 assert.equal(gate(),false,"Missing mail credentials must block signup");
 console.log("Commercial registration fail-closed checks passed.");
}finally{for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k]}}
