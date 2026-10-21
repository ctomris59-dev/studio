"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {spawn}=require("node:child_process"),{once}=require("node:events");
const {randomBytes,createHmac}=require("node:crypto"),{Pool}=require("pg");
const HOST="http://127.0.0.1:3192",pause=n=>new Promise(r=>setTimeout(r,n));
let passed=0;
function check(x,msg){assert(x,msg);console.log("ACCEPTANCE PASS:",msg);passed++}
async function api(route,options={}){
 const headers={Origin:HOST};if(options.body!==undefined)headers["Content-Type"]="application/json";
 if(options.cookie)headers.Cookie=options.cookie;
 const r=await fetch(HOST+route,{method:options.method||"GET",headers,body:options.body===undefined?undefined:JSON.stringify(options.body),signal:AbortSignal.timeout(12000)});
 let data={};try{data=await r.json()}catch{}return{status:r.status,data};
}
async function server(startRegistration){
 const logs=[];
 const p=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","3192","-H","127.0.0.1"],{env:{...process.env,NODE_ENV:"production",PUBLIC_APP_ORIGIN:HOST,BILLING_ALLOW_LOCAL_TEST:"true",AUTH_ALLOW_REGISTRATION:startRegistration?"true":"false"},stdio:["ignore","pipe","pipe"]});
 p.stdout.on("data",v=>{if(logs.length<50)logs.push(String(v))});p.stderr.on("data",v=>{if(logs.length<50)logs.push(String(v))});
 for(let i=0;i<100;i++){if(p.exitCode!==null)throw Error("Next quit: "+logs.join("").slice(-1500));try{if((await fetch(HOST+"/workspace")).status===200)return p}catch{}await pause(200)}
 p.kill();throw Error("Server timeout "+logs.join("").slice(-1800));
}
async function stop(p){if(!p)return;p.kill("SIGTERM");await Promise.race([once(p,"close"),pause(2500)])}
function connect(ws){return new Promise((resolve,reject)=>{
 const socket=new WebSocket(ws),queue=new Map();let id=0;
 socket.addEventListener("open",()=>resolve({
  send:(method,params={})=>new Promise((ok,fail)=>{const number=++id;queue.set(number,{ok,fail});socket.send(JSON.stringify({id:number,method,params}))}),
  close:()=>socket.close()
 }));socket.addEventListener("error",reject);socket.addEventListener("message",e=>{const msg=JSON.parse(String(e.data)),p=queue.get(msg.id);if(p){queue.delete(msg.id);msg.error?p.fail(Error(msg.error.message)):p.ok(msg.result)}});
})}
async function main(){
 assert(process.env.MIGRATION_DATABASE_URL&&process.env.PADDLE_WEBHOOK_SECRET,"CI-only Postgres and Paddle credentials required");
 const url=new URL(process.env.MIGRATION_DATABASE_URL);
 check(["localhost","127.0.0.1","::1"].includes(url.hostname),"CI migrator limited to loopback");
 check(process.env.BILLING_ALLOW_LOCAL_TEST==="true","Explicit isolated billing test mode");
 const admin=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL,max:2});
 const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"].find(p=>fs.existsSync(p))||process.env.CHROME_BIN;
 assert(chrome,"Real Chrome is mandatory");
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),"st-acceptance-"));
 const child=spawn(chrome,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--remote-debugging-port=9238","--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
 let next,peer;const accounts=[];
 try{
  next=await server(false);
  let target;
  for(let i=0;i<80;i++){try{target=(await (await fetch("http://127.0.0.1:9238/json/list")).json()).find(x=>x.type==="page");if(target)break}catch{}await pause(190)}
  assert(target,"Chrome CDP unavailable");peer=await connect(target.webSocketDebuggerUrl);
  await peer.send("Page.enable");await peer.send("Runtime.enable");
  const evalJs=async src=>{const r=await peer.send("Runtime.evaluate",{expression:src,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error("Browser eval "+JSON.stringify(r.exceptionDetails).slice(0,500));return r.result?.value};
  const text=sel=>evalJs("document.querySelector("+JSON.stringify(sel)+")?.textContent||''");
  const exists=sel=>evalJs("Boolean(document.querySelector("+JSON.stringify(sel)+"))");
  const navigate=async route=>{await peer.send("Page.navigate",{url:HOST+route});await pause(1000)};
  const waitText=async(sel,fragment)=>{for(let i=0;i<50;i++){const v=await text(sel);if(v.includes(fragment))return;await pause(200)}throw Error("Timed out waiting for "+fragment+" in "+sel+" current "+(await text(sel)).slice(0,120))};
  await navigate("/workspace?mode=register&plan=annual");
  check(!(await exists("#auth-tab-register")),"Closed registration hides signup form");
  check((await text(".rd-purchase-intent")).includes("$406.80"),"Annual plan shown while registration disabled");
  check((await text(".rd-auth-closed")).includes("temporarily closed"),"Closed signup is explained");
  check((await api("/api/auth/register",{method:"POST",body:{email:"unavailable@example.test"}})).status===403,"Closed registration rejects API POST");
  await stop(next);next=null;await pause(500);
  next=await server(true);
  for(const plan of ["annual","monthly"]){
   const nonce=randomBytes(8).toString("hex");
   const email="accept-"+plan+"-"+nonce+"@example.test",password="CI-Test-"+randomBytes(16).toString("hex")+"!",studioName="Acceptance "+plan+" "+nonce;
   await navigate("/workspace?mode=register&plan="+plan);
   check(await exists("#auth-tab-register"),plan+" registration tab opens");
   check((await evalJs("document.querySelector('#auth-tab-register')?.getAttribute('aria-selected')"))==="true",plan+" correct signup tab is active");
   check((await evalJs('Array.from(document.querySelectorAll("select")).map(x=>x.value)')).includes(plan),plan+" preselected plan survives navigation");
   const registered=await api("/api/auth/register",{method:"POST",body:{email,password,studioName,focus:"Pilates",timezone:"Europe/Berlin",plan,termsVersion:"2026-10-09.1",dpaVersion:"2026-10-09.1",privacyVersion:"2026-10-09.1",cancellationVersion:"2026-10-09.1",legalAccepted:true}});
   check(registered.status===202,plan+" registration accepted");
   const found=await admin.query("SELECT s.id AS studio_id,(SELECT payload->>'url' FROM mail_outbox WHERE recipient_email=$1 AND template='verify_email' ORDER BY created_at DESC LIMIT 1) AS link FROM studios s JOIN studio_users su ON su.studio_id=s.id JOIN app_users u ON u.id=su.user_id WHERE u.email=$1",[email]);
   check(found.rowCount===1&&!!found.rows[0].link,plan+" verification email queued");
   const studioId=found.rows[0].studio_id,verify=new URL(found.rows[0].link);
   accounts.push({email,studioId});
   check(verify.searchParams.get("plan")===plan,plan+" verification plan matches purchase intent");
   await navigate(verify.pathname+verify.search+verify.hash);
   await waitText(".rd-feedback","Email verified");
   check((await text(".rd-auth-heading")).includes("Welcome back"),plan+" email link verifies automatically");
   check(!(await evalJs("location.hash")),plan+" verification secret cleared from URL");
   check((await api("/api/auth/verify",{method:"POST",body:{token:new URLSearchParams(verify.hash.slice(1)).get("verify")}})).status===400,plan+" single-use verification token");
   async function fill(selector,value){return evalJs("(function(){var e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Input missing');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,"+JSON.stringify(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()")}
   await fill('input[type="email"]',email);await fill('input[type="password"]',password);
   await evalJs("document.querySelector('#auth-form').requestSubmit();true");
   await waitText(".rd-auth-heading","One last step");
   check(!(await exists(".rd-live-shell")),plan+" unpaid workspace UI is gated");
   const cookies=await peer.send("Network.getCookies",{urls:[HOST+"/workspace"]});
   const session=cookies.cookies.find(c=>c.name==="__Host-studiotasker_session");
   check(!!session,plan+" browser persisted secure session cookie");
   const cookie="__Host-studiotasker_session="+session.value;
   const pre=await api("/api/studio/subscription",{cookie});
   check(pre.status===200&&pre.data.subscription.enabled===false,plan+" unpaid entitlement remains disabled");
   const event={event_id:"evt_"+randomBytes(13).toString("hex"),event_type:"subscription.created",occurred_at:new Date().toISOString(),data:{
    id:"sub_"+randomBytes(13).toString("hex"),status:"active",customer_id:"ctm_"+randomBytes(13).toString("hex"),updated_at:new Date().toISOString(),
    current_billing_period:{starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+32*86400000).toISOString()},
    items:[{price:{id:process.env[plan==="annual"?"PADDLE_ANNUAL_PRICE_ID":"PADDLE_MONTHLY_PRICE_ID"]}}],custom_data:{studio_id:studioId,plan}}};
   const body=JSON.stringify(event),ts=String(Math.floor(Date.now()/1000));
   async function webhook(secret){const sign=createHmac("sha256",secret).update(ts+":"+body).digest("hex");const r=await fetch(HOST+"/api/billing/paddle-webhook",{method:"POST",headers:{"Content-Type":"application/json","Paddle-Signature":"ts="+ts+";h1="+sign},body});return{status:r.status,data:await r.json()}}
   check((await webhook("invalid-test-secret")).status===401,plan+" bad webhook signature rejected");
   check((await api("/api/studio/subscription",{cookie})).data.subscription.enabled===false,plan+" invalid webhook does not activate paid workspace");
   const paid=await webhook(process.env.PADDLE_WEBHOOK_SECRET);
   check(paid.status===200&&paid.data.processed===true,plan+" signed webhook activates paid studio");
   check((await webhook(process.env.PADDLE_WEBHOOK_SECRET)).data.processed===false,plan+" duplicate webhook idempotent");
   await navigate("/workspace?billing=success&plan="+plan);
   await waitText("#quick-start-title","5-step quick start");
   check(await exists(".rd-live-shell"),plan+" first paid workspace is visible");
   const pending=await api("/api/studio/onboarding",{cookie});
   check(pending.status===200&&pending.data.steps.length===5&&!pending.data.finished,plan+" five-step onboarding begins incomplete");
   check((await api("/api/studio/onboarding",{method:"POST",cookie,body:{operation:"complete_setup"}})).status===409,plan+" setup cannot finish prematurely");
   const member=await api("/api/studio/people",{method:"POST",cookie,body:{kind:"member",name:"Acceptance Member "+nonce,email:"member-"+nonce+"@example.test"}});
   check(member.status===201,plan+" first member created");
   const course=await api("/api/studio/classes",{method:"POST",cookie,body:{title:"QA First Class "+nonce,instructor:"QA Instructor",room:"Main studio",startsAt:new Date(Date.now()+3*86400000).toISOString(),durationMinutes:60,capacity:8,spotBookingEnabled:false}});
   check(course.status===201,plan+" first class created");
   const packageResult=await api("/api/studio/packages",{method:"POST",cookie,body:{name:"QA Package "+nonce,credits:5,validDays:30}});
   check(packageResult.status===201,plan+" first internal package created");
   await navigate("/workspace");await waitText("#quick-start-title","5-step quick start");
   check((await api("/api/studio/onboarding",{cookie})).data.basics===true,plan+" onboarding requirements complete");
   const clicked=await evalJs("(function(){var b=Array.from(document.querySelectorAll('.rd-onboarding button')).find(x=>x.textContent.trim()==='Finish setup');if(!b||b.disabled)return false;b.click();return true})()");
   check(clicked===true,plan+" onboarding Finish setup clicked in real browser");
   await waitText(".rd-onboarding .rd-feedback","Setup complete");
   check((await api("/api/studio/onboarding",{cookie})).data.finished===true,plan+" finished setup persisted");
   await peer.send("Emulation.setDeviceMetricsOverride",{width:390,height:830,deviceScaleFactor:1,mobile:true});
   await navigate("/workspace");
   const mobile=await evalJs('({overflow:document.documentElement.scrollWidth>innerWidth+4,landmarks:document.querySelectorAll("main").length})');
   check(!mobile.overflow&&mobile.landmarks===1,plan+" logged-in 390px mobile layout no overflow");
   await peer.send("Emulation.clearDeviceMetricsOverride");
   console.log("ACCEPTANCE JOURNEY COMPLETED",plan);
  }
  console.log("ACCEPTANCE_BROWSER_PASSED:",passed);
 }finally{
  await stop(next);if(peer)peer.close();child.kill("SIGTERM");
  if(accounts.length){try{await admin.query("DELETE FROM studios WHERE id=ANY($1::uuid[])",[accounts.map(a=>a.studioId)])}catch(e){console.warn("Cleanup studios:",e.message)}}
  for(const a of accounts){try{await admin.query("DELETE FROM app_users WHERE email=$1",[a.email])}catch(e){console.warn("Cleanup user:",e.message)}}
  await admin.end();fs.rmSync(profile,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error("ACCEPTANCE BROWSER FAILED:",e.stack||String(e));process.exitCode=1});
