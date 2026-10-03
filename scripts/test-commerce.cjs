const assert=require("node:assert/strict");
const {createServer}=require("node:http"),{spawn}=require("node:child_process");
const {createHmac,randomUUID}=require("node:crypto"),{Pool}=require("pg");
const HOST="http://127.0.0.1:3187";
async function main(){
 const stripeOrders=new Map();
 let sequence=0;
 const fakeStripe=createServer(async(req,res)=>{
  const chunks=[];for await(const x of req)chunks.push(x);
  const data=new URLSearchParams(Buffer.concat(chunks).toString()),url=req.url||"";
  let result={},status=200;
  if(url==="/v1/accounts"&&req.method==="POST")result={id:"acct_MOCKSTUDIO1"};
  else if(url==="/v1/accounts/acct_MOCKSTUDIO1")result={id:"acct_MOCKSTUDIO1",charges_enabled:true,details_submitted:true};
  else if(url==="/v1/account_links")result={url:"https://connect.stripe.com/setup/mock"};
  else if(url==="/v1/checkout/sessions"){
   sequence++;
   const id="cs_test_MOCK"+sequence,pi="pi_MOCK"+sequence;
   stripeOrders.set(pi,{purchaseId:data.get("client_reference_id"),studioId:data.get("metadata[studio_id]"),
    amount:Number(data.get("line_items[0][price_data][unit_amount]")),account:req.headers["stripe-account"],id});
   result={id,url:"https://checkout.stripe.com/c/pay/test"+sequence};
  }else if(url.startsWith("/v1/payment_intents/pi_MOCK")){
   const order=stripeOrders.get(url.substring("/v1/payment_intents/".length));
   result=order?{id:url.split("/").pop(),metadata:{purchase_id:order.purchaseId,studio_id:order.studioId}}:{};
  }else if(url.startsWith("/v1/charges/ch_MOCK")){
   result={id:url.split("/").pop(),payment_intent:"pi_MOCK"+url.split("MOCK").pop()};
  }else{status=404;result={error:"Unexpected fake payment API path "+url};}
  res.writeHead(status,{"Content-Type":"application/json"});res.end(JSON.stringify(result));
 });
 await new Promise(resolve=>fakeStripe.listen(0,"127.0.0.1",resolve));
 const port=fakeStripe.address().port;
 const output=[];
 const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","3187","-H","127.0.0.1"],{
  env:{...process.env,NODE_ENV:"production",AUTH_ALLOW_REGISTRATION:"true",
   STRIPE_STUDIO_PAYMENTS_ENABLED:"true",STRIPE_SECRET_KEY:"sk_test_ci_only",
   STRIPE_CONNECT_WEBHOOK_SECRET:"whsec_ci_only",
   STRIPE_STUDIO_PAYMENTS_TEST_BASE_URL:"http://127.0.0.1:"+port},
  stdio:["ignore","pipe","pipe"]
 });
 server.stdout.on("data",d=>{if(output.length<60)output.push(String(d))});
 server.stderr.on("data",d=>{if(output.length<60)output.push(String(d))});
 const admin=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL});
 const owned={users:[],studios:[]};
 async function api(path,{method="GET",cookie,body,origin=HOST}={}){
  const headers={Origin:origin};
  if(cookie)headers.Cookie=cookie;
  if(body!==undefined)headers["Content-Type"]="application/json";
  const response=await fetch(HOST+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
  return {status:response.status,data:await response.json(),cookie:(response.headers.get("set-cookie")||"").split(";")[0]};
 }
 const wait=async()=>{for(let i=0;i<100;i++){try{if((await fetch(HOST+"/workspace")).status===200)return}catch{}await new Promise(r=>setTimeout(r,200))}throw Error("App did not start: "+output.join("").slice(-2500))};
 const sendEvent=async(payload,correct=true)=>{
  const raw=JSON.stringify(payload),timestamp=Math.floor(Date.now()/1000);
  const signature=createHmac("sha256",correct?"whsec_ci_only":"invalid").update(timestamp+"."+raw).digest("hex");
  const response=await fetch(HOST+"/api/payments/stripe-connect-webhook",{method:"POST",
   headers:{"Content-Type":"application/json","Stripe-Signature":"t="+timestamp+",v1="+signature},body:raw});
  return {status:response.status,data:await response.json()};
 };
 try{
  await wait();
  const id=randomUUID().replace(/-/g,""),password="Secure Pass 2026! "+id.slice(0,6),email="owner-"+id+"@example.com";
  const registered=await api("/api/auth/register",{method:"POST",body:{email,password,studioName:"Commerce Test Studio",focus:"Yoga",timezone:"Europe/London"}});
  assert.equal(registered.status,202,JSON.stringify(registered.data));
  const ownerRow=await admin.query("SELECT id FROM app_users WHERE email=$1",[email]);owned.users.push(ownerRow.rows[0].id);
  const ver=await admin.query("SELECT payload->>'url' AS url FROM mail_outbox WHERE recipient_email=$1 AND template='verify_email' ORDER BY created_at DESC LIMIT 1",[email]);
  const token=new URLSearchParams(new URL(ver.rows[0].url).hash.slice(1)).get("verify");
  assert.equal((await api("/api/auth/verify",{method:"POST",body:{token}})).status,200);
  const login=await api("/api/auth/login",{method:"POST",body:{email,password}});
  assert.equal(login.status,200,JSON.stringify(login.data));const ownerCookie=login.cookie;
  const me=await api("/api/auth/me",{cookie:ownerCookie}),studioId=me.data.studio.id;owned.studios.push(studioId);
  const beforeConnect=await api("/api/studio/payments/connect",{cookie:ownerCookie});
  assert.equal(beforeConnect.data.connected,false);
  const connect=await api("/api/studio/payments/connect",{method:"POST",cookie:ownerCookie,body:{country:"GB"}});
  assert.equal(connect.status,200,JSON.stringify(connect.data));
  assert(connect.data.onboardingUrl.startsWith("https://connect.stripe.com/"));
  const paymentReady=await api("/api/studio/payments/connect",{cookie:ownerCookie});
  assert.equal(paymentReady.data.chargesEnabled,true);
  const pack=await api("/api/studio/packages",{method:"POST",cookie:ownerCookie,
   body:{name:"Ten Visits",description:"Valid 60 days",priceCents:9900,currency:"gbp",credits:10,validDays:60}});
  assert.equal(pack.status,201,JSON.stringify(pack.data));const packId=pack.data.package.id;
  const crossStudio=await api("/api/studio/packages",{cookie:ownerCookie});
  assert.equal(crossStudio.data.packages.length,1);
  const memberEmail="member-"+id+"@example.com";
  const member=await api("/api/studio/people",{method:"POST",cookie:ownerCookie,body:{kind:"member",name:"Test Member",email:memberEmail}});
  assert.equal(member.status,201,JSON.stringify(member.data));const memberId=member.data.record.id;
  const invited=await api("/api/studio/invitations",{method:"POST",cookie:ownerCookie,body:{memberId}});
  assert.equal(invited.status,202,JSON.stringify(invited.data));
  const link=await admin.query("SELECT payload->>'url' AS url FROM mail_outbox WHERE recipient_email=$1 AND template='member_invitation' ORDER BY created_at DESC LIMIT 1",[memberEmail]);
  assert.equal(link.rowCount,1);
  const memberToken=new URLSearchParams(new URL(link.rows[0].url).hash.slice(1)).get("invite");
  const accepted=await api("/api/auth/invite/accept",{method:"POST",body:{token:memberToken,password}});
  assert.equal(accepted.status,200,JSON.stringify(accepted.data));
  const memberRow=await admin.query("SELECT id FROM app_users WHERE email=$1",[memberEmail]);owned.users.push(memberRow.rows[0].id);
  const signIn=await api("/api/auth/login",{method:"POST",body:{email:memberEmail,password}});
  assert.equal(signIn.status,200,JSON.stringify(signIn.data));const memberCookie=signIn.cookie;
  const future=new Date(Date.now()+4*86400000).toISOString();
  const classResult=await api("/api/studio/classes",{method:"POST",cookie:ownerCookie,
   body:{title:"Yoga Foundations",instructor:"Instructor C",room:"Studio A",startsAt:future,durationMinutes:50,capacity:8}});
  assert.equal(classResult.status,201,JSON.stringify(classResult.data));const classId=classResult.data.class.id;
  assert.equal((await api("/api/member/bookings",{method:"POST",cookie:memberCookie,body:{sessionId:classId}})).status,409,"Unpaid member cannot book");
  const memberCatalog=await api("/api/member/packages",{cookie:memberCookie});
  assert.equal(memberCatalog.status,200);assert(memberCatalog.data.packages.some(p=>p.id===packId));
  const buy=async()=>api("/api/member/packages/checkout",{method:"POST",cookie:memberCookie,body:{packageId:packId}});
  const first=await buy();assert.equal(first.status,201,JSON.stringify(first.data));
  assert(first.data.checkoutUrl.startsWith("https://checkout.stripe.com/"));
  assert.equal(stripeOrders.get("pi_MOCK1").amount,9900);
  assert.equal(stripeOrders.get("pi_MOCK1").account,"acct_MOCKSTUDIO1");
  const beforePayment=await api("/api/member/me",{cookie:memberCookie});
  assert.equal(beforePayment.data.member.credits,0,"Checkout creation must not grant credits");
  const event=(n,purchaseId,id2="evt_MOCK"+n)=>({id:id2,type:"checkout.session.completed",account:"acct_MOCKSTUDIO1",livemode:false,
   data:{object:{object:"checkout.session",id:"cs_test_MOCK"+n,payment_status:"paid",mode:"payment",
    amount_total:9900,currency:"gbp",payment_intent:"pi_MOCK"+n,client_reference_id:purchaseId,
    metadata:{purchase_id:purchaseId,studio_id:studioId}}}});
  assert.equal((await sendEvent(event(1,first.data.purchaseId),false)).status,401);
  const wrong=event(1,first.data.purchaseId,"evt_PRICEWRONG");
  wrong.data.object.amount_total=990;
  assert.equal((await sendEvent(wrong)).data.processed,false,"Price mismatch must not grant credits");
  assert.equal((await api("/api/member/me",{cookie:memberCookie})).data.member.credits,0);
  const activated=await sendEvent(event(1,first.data.purchaseId));
  assert.equal(activated.status,200,JSON.stringify(activated.data));
  assert.equal(activated.data.reason,"paid",JSON.stringify(activated.data));
  assert.equal((await sendEvent(event(1,first.data.purchaseId))).data.reason,"duplicate");
  const profile=await api("/api/member/me",{cookie:memberCookie});
  assert.equal(profile.data.member.credits,10);
  assert.equal(profile.data.member.package_status,"Paid");
  const reservation=await api("/api/member/bookings",{method:"POST",cookie:memberCookie,body:{sessionId:classId}});
  assert.equal(reservation.status,201,JSON.stringify(reservation.data));
  assert.equal((await api("/api/member/me",{cookie:memberCookie})).data.member.credits,9);
  const classesBefore=await api("/api/member/classes",{cookie:memberCookie});
  assert(classesBefore.data.classes.some(c=>c.id===classId));
  await admin.query("UPDATE class_sessions SET starts_at=now()-interval '30 minutes' WHERE id=$1",[classId]);
  const attended=await api("/api/studio/bookings/"+reservation.data.booking.id+"/attendance",{method:"POST",cookie:ownerCookie});
  assert.equal(attended.status,200,JSON.stringify(attended.data));
  const visits=await api("/api/member/me",{cookie:memberCookie});
  assert(visits.data.visits.some(v=>v.id===reservation.data.booking.id),"Class attendance appears in member history");
  const second=await buy();assert.equal(second.status,201,JSON.stringify(second.data));
  const renewal=await sendEvent(event(2,second.data.purchaseId));
  assert.equal(renewal.data.reason,"paid",JSON.stringify(renewal.data));
  const afterRenewal=await api("/api/member/me",{cookie:memberCookie});
  assert.equal(afterRenewal.data.member.credits,19);
  assert(new Date(afterRenewal.data.member.expiry_date)>new Date(profile.data.member.expiry_date));
  const dispute={id:"evt_REFUNDED",type:"charge.refunded",account:"acct_MOCKSTUDIO1",livemode:false,
   data:{object:{object:"charge",id:"ch_MOCK2",payment_intent:"pi_MOCK2"}}};
  const refund=await sendEvent(dispute);
  assert.equal(refund.data.reason,"review_required",JSON.stringify(refund.data));
  assert.equal((await sendEvent(dispute)).data.reason,"duplicate");
  const blocked=await api("/api/member/me",{cookie:memberCookie});
  assert.equal(blocked.data.member.member_status,"Paused");
  assert.equal(blocked.data.member.credits,9,"Unused refunded credits removed");
  const newClass=await api("/api/studio/classes",{method:"POST",cookie:ownerCookie,
   body:{title:"Next Flow",instructor:"Instructor D",room:"Studio B",startsAt:new Date(Date.now()+5*86400000).toISOString(),durationMinutes:50,capacity:8}});
  assert.equal(newClass.status,201);
  assert.equal((await api("/api/member/bookings",{method:"POST",cookie:memberCookie,body:{sessionId:newClass.data.class.id}})).status,409);
  const third=await buy();assert.equal(third.status,201);
  assert.equal((await sendEvent(event(3,third.data.purchaseId))).data.reason,"paid");
  assert.equal((await api("/api/member/me",{cookie:memberCookie})).data.member.member_status,"Active");
  console.log("Member commerce E2E passed: Stripe Connect onboarding, catalog, signed payment, no prepayment credits, booking, attendance, renewal, webhook idempotency, refund reversal and reactivation.");
 }catch(e){throw Error(String(e.stack||e)+"\nNext server: "+output.join("").slice(-2200))}
 finally{
  for(const id of owned.studios)await admin.query("DELETE FROM studios WHERE id=$1",[id]).catch(()=>{});
  for(const id of owned.users)await admin.query("DELETE FROM app_users WHERE id=$1",[id]).catch(()=>{});
  await admin.end();
  server.kill("SIGTERM");
  await new Promise(resolve=>fakeStripe.close(resolve));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
