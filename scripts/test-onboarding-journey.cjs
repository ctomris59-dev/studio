"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");

const client=fs.readFileSync("app/workspace/workspace-client.tsx","utf8");
const billing=fs.readFileSync("app/workspace/billing-panel.tsx","utf8");
const register=fs.readFileSync("app/api/auth/register/route.ts","utf8");
const subscription=fs.readFileSync("app/api/studio/subscription/route.ts","utf8");
const webhook=fs.readFileSync("app/api/billing/paddle-webhook/route.ts","utf8");
const gate=fs.readFileSync("lib/server/auth.ts","utf8");

function contains(source,text,label){
 assert(source.includes(text),label);
}

// Account creation and email verification must preserve the chosen plan.
contains(register,'verificationUrl.searchParams.set("plan",plan)',"Verification email must preserve annual or monthly intent");
contains(register,'verificationUrl.hash="verify="+encodeURIComponent(challenge.secret)',"Verification tokens must remain URL fragments");
contains(client,'attemptedVerification.current===token',"One-click email verification must be guarded against duplicate requests");
contains(client,'method:"POST",credentials:"same-origin"', "Email verification must use a same-origin POST");
contains(client,'window.location.pathname+window.location.search',"Verification must preserve plan selection across login");

// Newly created (unpaid) studios can reach billing, but must not
// fetch normal studio data until a verified Paddle event grants access.
const bootstrap=client.slice(client.indexOf("async function load()"),client.indexOf(" useEffect(()=>",client.indexOf("async function load()")));
const billingCheck=bootstrap.indexOf('fetch("/api/studio/subscription"');
const settingsCheck=bootstrap.indexOf('fetch("/api/studio/settings"');
assert(billingCheck>=0&&settingsCheck>billingCheck,"Check billing entitlement before studio settings");
contains(bootstrap,'if(!billing.subscription?.enabled)',"Unpaid access must remain blocked");
contains(bootstrap,'setBillingAccess("payment_required")',"Unpaid owners must see the billing gate");
contains(client,'if(billingAccess!=="active")return',"Unpaid user must never see the full studio workspace");
contains(client,'<BillingPanel initialPlan={pendingPlan} onActivated=',"Verified payment must unlock onboarding without another sign-in");
contains(subscription,'await authenticated(request,["owner"]',"Only studio owners can create checkout transactions");
contains(subscription,'customData:{',"Paddle checkout must bind to verified studio identity");
contains(webhook,'verifyPaddleWebhookSignature(raw,signature,secret)',"Payment webhook must validate Paddle signatures");
contains(gate,'"/api/studio/subscription"',"Billing endpoints must remain accessible while unpaid");

// A successful payment is not itself evidence of an active subscription.
// Poll server entitlement after the signed webhook confirms it.
contains(billing,'body.subscription?.enabled&&onActivated',"Enable the workspace only after server-side entitlement confirmation");
contains(billing,'if(params.get("billing")!=="success")',"Return from Paddle must activate confirmation polling");
contains(billing,'const successPath="/workspace?billing=success&plan="+plan',"Paddle redirect must retain the plan");
contains(billing,'event.name==="checkout.completed"',"Successful checkout must show the confirmation flow");
assert(!billing.includes("setBillingAccess(\"active\")"),"Paddle UI must never bypass server entitlement");

console.log("Paid onboarding journey guards passed: plan retention, one-click verification, pre-payment billing gate, signed Paddle activation and 5-step handoff.");
