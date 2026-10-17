"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");

// Execute the real TypeScript parser without launching Next.js or a database.
const source=fs.readFileSync("lib/server/billing.ts","utf8");
const compiled={exports:{}};
const js=ts.transpileModule(source,{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
new Function("require","module","exports",js)(
 name=>{if(name==="server-only")return {};throw Error("Unexpected import: "+name)},
 compiled,compiled.exports
);
const parse=compiled.exports.parsePaddleSubscriptionEvent;
const monthly="pri_"+"a".repeat(26);
const annual="pri_"+"b".repeat(26);
const normalId="evt_"+"c".repeat(26);
const simulationId="ntfsimevt_"+"d".repeat(26);
const studioId="be76a99a-a187-4b85-8c3f-5232300ea78c";
const event=id=>({
 event_id:id,event_type:"subscription.created",
 occurred_at:"2026-10-11T12:45:06Z",
 data:{
  id:"sub_"+"e".repeat(26),customer_id:"ctm_"+"f".repeat(26),
  custom_data:{studio_id:studioId,plan:"monthly"},
  items:[{price:{id:monthly}}],
  status:"active",updated_at:"2026-10-11T12:37:22Z",
  current_billing_period:{ends_at:"2026-11-11T12:37:22Z"}
 }
});
const keys=["PADDLE_ENV","PUBLIC_APP_ORIGIN","BILLING_ALLOW_LOCAL_TEST",
 "PADDLE_MONTHLY_PRICE_ID","PADDLE_ANNUAL_PRICE_ID"];
const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
try{
 process.env.PADDLE_MONTHLY_PRICE_ID=monthly;
 process.env.PADDLE_ANNUAL_PRICE_ID=annual;
 process.env.PADDLE_ENV="production";
 process.env.PUBLIC_APP_ORIGIN="https://www.studiotasker.com";
 process.env.BILLING_ALLOW_LOCAL_TEST="false";
 assert.equal(parse(event(simulationId)),null,"Production must reject Paddle simulation IDs");
 const real=parse(event(normalId));
 assert(real&&real.isTestMode===false&&real.plan==="monthly","Production must accept normal Paddle IDs");
 process.env.BILLING_ALLOW_LOCAL_TEST="true";
 assert.equal(parse(event(simulationId)),null,"Production flag must override a local-test toggle");
 process.env.PADDLE_ENV="sandbox";
 process.env.BILLING_ALLOW_LOCAL_TEST="false";
 assert.equal(parse(event(simulationId)),null,"Sandbox without explicit local-test enablement must reject simulated IDs");
 process.env.BILLING_ALLOW_LOCAL_TEST="true";
 assert.equal(parse(event(simulationId)),null,"Public HTTPS origin must not allow simulated IDs");
 process.env.PUBLIC_APP_ORIGIN="http://127.0.0.1:3004";
 const accepted=parse(event(simulationId));
 assert(accepted&&accepted.isTestMode===true&&accepted.studioId===studioId&&
  accepted.priceId===monthly&&accepted.status==="active","Local sandbox should accept Paddle simulated IDs");
 process.env.PUBLIC_APP_ORIGIN="  http://127.0.0.1:3004 \n";
 const paddedOrigin=parse(event(simulationId));
 assert(paddedOrigin&&paddedOrigin.isTestMode===true&&paddedOrigin.studioId===studioId,
  "Local sandbox should tolerate whitespace around PUBLIC_APP_ORIGIN");
 process.env.PUBLIC_APP_ORIGIN="http://127.0.0.1:3004";
 assert.equal(parse(event("ntfsimevt_"+"G".repeat(26))),null,"Malformed event IDs must be rejected");
 const badPrice=event(simulationId);badPrice.data.items[0].price.id="pri_"+"z".repeat(26);
 assert.equal(parse(badPrice),null,"Unknown price must never activate an entitlement");
 const missingStudio=event(simulationId);missingStudio.data.custom_data=null;
 assert.equal(parse(missingStudio),null,"Missing studio id must not be accepted");
 const sandboxReal=parse(event(normalId));
 assert(sandboxReal&&sandboxReal.isTestMode,"Real event ID format must still work in local sandbox");
 console.log("Paddle simulator event parsing passed: local sandbox accepted; public and production rejected.");
}finally{
 for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}
}
