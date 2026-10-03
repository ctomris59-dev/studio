const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const {once}=require("node:events");
const {randomUUID,randomBytes,scryptSync,createHmac}=require("node:crypto");
const {Pool}=require("pg");
const HOST="http://127.0.0.1:3187";
function cookieFrom(response){
 const raw=response.headers.get("set-cookie")||"";
 return raw.split(";")[0];
}
async function call(path,{method="GET",body,cookie,origin=HOST}={}){
 const headers={"Origin":origin};
 if(body!==undefined)headers["Content-Type"]="application/json";
 if(cookie)headers.Cookie=cookie;
 const response=await fetch(HOST+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual",cache:"no-store"});
 let data;try{data=await response.json()}catch{data={}};
 return {status:response.status,data,cookie:cookieFrom(response),headers:response.headers};
}
async function waitForBoot(proc,logs){
 for(let i=0;i<100;i++){
  if(proc.exitCode!==null)throw Error("Next.js server exited before ready: "+logs.join("").slice(-2500));
  try{const res=await fetch(HOST+"/workspace",{signal:AbortSignal.timeout(900)});if(res.status===200)return;}
  catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 throw Error("Server did not start: "+logs.join("").slice(-2500));
}
async function main(){
 const logs=[];
 const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","3187","-H","127.0.0.1"],{
  env:{...process.env,NODE_ENV:"production",AUTH_ALLOW_REGISTRATION:"true"},
  stdio:["ignore","pipe","pipe"]
 });
 server.stdout.on("data",d=>{if(logs.length<100)logs.push(d.toString())});
 server.stderr.on("data",d=>{if(logs.length<100)logs.push(d.toString())});
 const admin=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL});
 let studioA,studioB,ownerA,ownerB,instructor,invitedUser;
 try{
  await waitForBoot(server,logs);
  assert.equal((await call("/api/auth/me")).status,401);
  assert.equal((await call("/api/studio/people")).status,401);
  const badOrigin=await call("/api/auth/register",{method:"POST",origin:"https://cross-origin.example",body:{email:"x@example.com"}});
  assert.equal(badOrigin.status,403);
  const unique=randomUUID().replace(/-/g,"");
  const password="Test Password 34! "+unique.slice(0,5);
  async function register(prefix){
   const email=prefix+"-"+unique+"@example.com";
   const res=await call("/api/auth/register",{method:"POST",body:{email,password,studioName:prefix+" Studio",focus:"Pilates"}});
   assert.equal(res.status,202,JSON.stringify(res.data));
   assert.equal((await call("/api/auth/login",{method:"POST",body:{email,password}})).status,401,"Unverified users cannot sign in.");
   const emailRow=await admin.query("SELECT payload->>'url' AS url FROM mail_outbox WHERE recipient_email=$1 AND template='verify_email' ORDER BY created_at DESC LIMIT 1",[email]);
   assert.equal(emailRow.rowCount,1,"A verification notification should be queued.");
   const verifyToken=new URLSearchParams(new URL(emailRow.rows[0].url).hash.slice(1)).get("verify");
   const verified=await call("/api/auth/verify",{method:"POST",body:{token:verifyToken}});
   assert.equal(verified.status,200,JSON.stringify(verified.data));
   assert.equal((await call("/api/auth/verify",{method:"POST",body:{token:verifyToken}})).status,400,"Verification links must be single-use.");
   const login=await call("/api/auth/login",{method:"POST",body:{email,password}});
   assert.equal(login.status,200,JSON.stringify(login.data));
   assert(login.cookie.startsWith("reformdesk_session="));
   assert((login.headers.get("set-cookie")||"").includes("HttpOnly"));
   const account=(await call("/api/auth/me",{cookie:login.cookie}));
   assert.equal(account.status,200);
   assert.equal(account.data.user.email,email);
   assert.equal(account.data.user.role,"owner");
   return {email,cookie:login.cookie,studioId:account.data.studio.id,userId:account.data.user.id};
  }
  const a=await register("alpine");const b=await register("bluebird");
  studioA=a.studioId;studioB=b.studioId;ownerA=a.userId;ownerB=b.userId;
  const duplicate=await call("/api/auth/register",{method:"POST",body:{email:a.email,password,studioName:"Duplicate Studio",focus:"Pilates"}});
  assert.equal(duplicate.status,409);
  const create=async(account,name)=>call("/api/studio/people",{method:"POST",cookie:account.cookie,body:{kind:"lead",name,email:name.toLowerCase().replace(/ /g,".")+"-"+unique+"@example.com",phone:""}});
  const pa=await create(a,"Alice Client");assert.equal(pa.status,201,JSON.stringify(pa.data));
  const pb=await create(b,"Bob Client");assert.equal(pb.status,201,JSON.stringify(pb.data));
  const aList=await call("/api/studio/people",{cookie:a.cookie});
  const bList=await call("/api/studio/people",{cookie:b.cookie});
  assert.equal(aList.status,200);assert.equal(bList.status,200);
  assert(aList.data.records.some(x=>x.id===pa.data.record.id));
  assert(!aList.data.records.some(x=>x.id===pb.data.record.id),"Tenant A must not see B");
  assert(!bList.data.records.some(x=>x.id===pa.data.record.id),"Tenant B must not see A");
  const forged=await call("/api/studio/people",{method:"POST",cookie:a.cookie,body:{kind:"lead",name:"Another Client",email:"another-"+unique+"@example.com",studioId:studioB}});
  assert.equal(forged.status,201);
  const checkB=await call("/api/studio/people",{cookie:b.cookie});
  assert(!checkB.data.records.some(x=>x.id===forged.data.record.id),"Body cannot override verified studio context");
  assert.equal((await call("/api/studio/people",{method:"POST",cookie:a.cookie,origin:"https://evil.example",body:{kind:"lead",name:"CSRF Client",email:"csrf-"+unique+"@example.com"}})).status,403);
  const duplicateContact=await create(a,"Alice Client");assert.equal(duplicateContact.status,409);
  const invalid=await call("/api/studio/people",{method:"POST",cookie:a.cookie,body:{kind:"member",name:"X",email:""}});assert.equal(invalid.status,400);
  const invalidLogin=await call("/api/auth/login",{method:"POST",body:{email:a.email,password:"incorrect"}});
  assert.equal(invalidLogin.status,401);
  const signin=await call("/api/auth/login",{method:"POST",body:{email:a.email,password}});
  assert.equal(signin.status,200,JSON.stringify(signin.data));
  assert.equal((await call("/api/auth/me",{cookie:signin.cookie})).status,200);
  // Instructor accounts authenticate but cannot list or create customer PII.
  const instructorEmail="coach-"+unique+"@example.com";
  const salt=randomBytes(24),hashed=scryptSync(password,salt,64);
  const stored="scrypt$v1$"+salt.toString("hex")+"$"+hashed.toString("hex");
  instructor=(await admin.query("INSERT INTO app_users(email,password_hash,email_verified_at) VALUES($1,$2,now()) RETURNING id",[instructorEmail,stored])).rows[0].id;
  await admin.query("INSERT INTO studio_users(studio_id,user_id,role) VALUES($1,$2,'instructor')",[studioA,instructor]);
  const coachLogin=await call("/api/auth/login",{method:"POST",body:{email:instructorEmail,password}});
  assert.equal(coachLogin.status,200);
  assert.equal((await call("/api/auth/me",{cookie:coachLogin.cookie})).status,200);
  assert.equal((await call("/api/studio/people",{cookie:coachLogin.cookie})).status,403);
  assert.equal((await call("/api/studio/people",{method:"POST",cookie:coachLogin.cookie,body:{kind:"lead",name:"No Access",email:"no-access-"+unique+"@example.com"}})).status,403);

  // Server-backed studio booking, credit ledger and action center regression.
  const future=(days,hour)=>{
   const d=new Date();d.setUTCDate(d.getUTCDate()+days);d.setUTCHours(hour,0,0,0);
   return d.toISOString();
  };
  async function createMember(account,name){
   const result=await call("/api/studio/people",{method:"POST",cookie:account.cookie,body:{
    kind:"member",name,email:name.toLowerCase().replaceAll(" ",".")+"-"+unique+"@example.com"
   }});
   assert.equal(result.status,201,JSON.stringify(result.data));
   return result.data.record.id;
  }
  const config=await call("/api/studio/settings",{cookie:a.cookie});
  assert.equal(config.status,200);assert.equal(config.data.studio.timezone,"UTC");
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:b.cookie,body:{name:"Bluebird Studio",focus:"Yoga",timezone:"Europe/London"}})).status,200);
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:a.cookie,body:{name:"Alpine Studio",focus:"Pilates",timezone:"Not/A_Zone"}})).status,400);
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:coachLogin.cookie,body:{name:"Forbidden",focus:"Yoga",timezone:"UTC"}})).status,403);
  const member1=await createMember(a,"Member One");
  const member2=await createMember(a,"Member Two");
  const member3=await createMember(a,"Member Pending");
  assert.equal((await call("/api/studio/members",{cookie:coachLogin.cookie})).status,403);
  const member3Before=(await call("/api/studio/members",{cookie:a.cookie})).data.members.find(m=>m.id===member3);
  assert.equal(member3Before.credits,0);
  assert.equal(member3Before.package_status,"Pending");
  const crossConfirm=await call("/api/studio/members/"+member1+"/package",{method:"POST",cookie:b.cookie,body:{plan:"5 Class Pack",credits:5}});
  assert.equal(crossConfirm.status,404,JSON.stringify(crossConfirm.data));
  const confirmMember=async id=>{
   const r=await call("/api/studio/members/"+id+"/package",{method:"POST",cookie:a.cookie,body:{plan:"5 Class Pack",credits:5}});
   assert.equal(r.status,200,JSON.stringify(r.data));
  };
  await confirmMember(member1);await confirmMember(member2);
  const repeatConfirm=await call("/api/studio/members/"+member1+"/package",{method:"POST",cookie:a.cookie,body:{plan:"5 Class Pack",credits:5}});
  assert.equal(repeatConfirm.status,409);
  const key=randomUUID(), adjustment={delta:2,reason:"Correction after staff review",requestKey:key};
  const adjusted=await call("/api/studio/members/"+member1+"/credits",{method:"POST",cookie:a.cookie,body:adjustment});
  assert.equal(adjusted.status,200,JSON.stringify(adjusted.data));
  assert.equal(adjusted.data.adjustment.credits,7);
  const repeated=await call("/api/studio/members/"+member1+"/credits",{method:"POST",cookie:a.cookie,body:adjustment});
  assert.equal(repeated.status,200);
  assert.equal(repeated.data.adjustment.alreadyApplied,true);
  assert.equal(repeated.data.adjustment.credits,7);
  assert.equal((await call("/api/studio/members/"+member2+"/credits",{method:"POST",cookie:a.cookie,body:adjustment})).status,409);
  assert.equal((await call("/api/studio/members/"+member1+"/credits",{method:"POST",cookie:a.cookie,body:{
   delta:-20,reason:"Should not overdraw",requestKey:randomUUID()
  }})).status,409);
  assert.equal((await call("/api/studio/members/"+member1+"/credits",{method:"POST",cookie:coachLogin.cookie,body:{
   delta:1,reason:"Forbidden instructor update",requestKey:randomUUID()
  }})).status,403);
  const start=future(3,15);
  const classInput={title:"Reformer Test",instructor:"Coach A",room:"Room A",startsAt:start,durationMinutes:50,capacity:1};
  const createdClass=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:classInput});
  assert.equal(createdClass.status,201,JSON.stringify(createdClass.data));
  const classId=createdClass.data.class.id;
  const crossClass=await call("/api/studio/classes",{method:"POST",cookie:b.cookie,body:classInput});
  assert.equal(crossClass.status,201,JSON.stringify(crossClass.data));
  const conflict=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:{
   ...classInput,title:"Overlap",room:"Other room",startsAt:new Date(Date.parse(start)+15*60000).toISOString()
  }});
  assert.equal(conflict.status,409,JSON.stringify(conflict.data));
  const coachClassWrite=await call("/api/studio/classes",{method:"POST",cookie:coachLogin.cookie,body:classInput});
  assert.equal(coachClassWrite.status,403);
  const repeatDate=new Date(Date.now()+6*86400000).toISOString().slice(0,10);
  const repeatUntil=new Date(Date.now()+12*86400000).toISOString().slice(0,10);
  const allDays=[0,1,2,3,4,5,6];
  const weekly=await call("/api/studio/classes/series",{method:"POST",cookie:a.cookie,body:{title:"Morning Class",instructor:"Coach Series",room:"Studio S",durationMinutes:50,capacity:6,startDate:repeatDate,endDate:repeatUntil,time:"08:00",weekdays:allDays}});
  assert.equal(weekly.status,201,JSON.stringify(weekly.data));
  assert.equal(weekly.data.classes.length,7);
  assert(weekly.data.classes.every(c=>c.series_id===weekly.data.seriesId));
  const recurringConflict=await call("/api/studio/classes/series",{method:"POST",cookie:a.cookie,body:{title:"Collision",instructor:"Coach Series",room:"Studio T",durationMinutes:50,capacity:6,startDate:repeatDate,endDate:repeatUntil,time:"08:00",weekdays:allDays}});
  assert.equal(recurringConflict.status,409,JSON.stringify(recurringConflict.data));
  const noPartial=await admin.query("SELECT count(*)::int AS n FROM class_sessions WHERE studio_id=$1 AND title=$2",[studioA,"Collision"]);
  assert.equal(noPartial.rows[0].n,0,"Recurring conflict must roll back entire batch");
  assert.equal((await call("/api/studio/classes/series",{method:"POST",cookie:coachLogin.cookie,body:{title:"Forbidden",startDate:repeatDate,endDate:repeatUntil,time:"08:00",weekdays:allDays}})).status,403);
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:a.cookie,body:{name:"Alpine Studio",focus:"Pilates",timezone:"Europe/Paris"}})).status,409,"Prevent timezone reconfiguration after booked sessions.");
  const aClasses=await call("/api/studio/classes",{cookie:a.cookie});
  assert(aClasses.data.classes.some(c=>c.id===classId));
  assert(!aClasses.data.classes.some(c=>c.id===crossClass.data.class.id));
  const bookMember=async(account,id,sessionId=classId)=>call("/api/studio/bookings",{
   method:"POST",cookie:account.cookie,body:{sessionId,memberId:id}
  });
  assert.equal((await bookMember(a,member3)).status,409,"Pending member must not book");
  const first=await bookMember(a,member1);
  assert.equal(first.status,201,JSON.stringify(first.data));
  assert.equal(first.data.booking.status,"booked");
  const second=await bookMember(a,member2);
  assert.equal(second.status,201,JSON.stringify(second.data));
  assert.equal(second.data.booking.status,"waitlisted");
  assert.equal((await bookMember(a,member1)).data.booking.alreadyExists,true);
  assert.equal((await call("/api/studio/bookings?sessionId="+classId,{cookie:b.cookie})).data.bookings.length,0);
  assert.equal((await call("/api/studio/bookings/"+first.data.booking.id,{method:"DELETE",cookie:b.cookie})).status,404);
  const bookedRows=await call("/api/studio/bookings?sessionId="+classId,{cookie:a.cookie});
  assert.equal(bookedRows.data.bookings.length,2);
  assert.equal(bookedRows.data.bookings.filter(x=>x.status==="booked").length,1);
  const firstBalance=(await call("/api/studio/members",{cookie:a.cookie})).data.members.find(x=>x.id===member1);
  assert.equal(firstBalance.credits,6,"Booking must debit one credit");
  const cancel=await call("/api/studio/bookings/"+first.data.booking.id,{method:"DELETE",cookie:a.cookie});
  assert.equal(cancel.status,200,JSON.stringify(cancel.data));
  assert.equal(cancel.data.booking.promoted.id,second.data.booking.id);
  const afterCancel=await call("/api/studio/members",{cookie:a.cookie});
  assert.equal(afterCancel.data.members.find(x=>x.id===member1).credits,7,"Cancellation must refund once");
  assert.equal(afterCancel.data.members.find(x=>x.id===member2).credits,4,"Promotion must debit once");
  const cancelAgain=await call("/api/studio/bookings/"+first.data.booking.id,{method:"DELETE",cookie:a.cookie});
  assert.equal(cancelAgain.status,200);
  assert.equal(cancelAgain.data.booking.alreadyCancelled,true);
  assert.equal((await call("/api/studio/members",{cookie:a.cookie})).data.members.find(x=>x.id===member1).credits,7);
  const ledger=await admin.query("SELECT reason,delta FROM credit_ledger WHERE studio_id=$1 AND booking_id=$2 ORDER BY created_at,id",[studioA,first.data.booking.id]);
  assert.equal(ledger.rows.filter(x=>x.reason==="class_booking").length,1);
  assert.equal(ledger.rows.filter(x=>x.reason==="class_refund").length,1);
  // Concurrent booking requests for the last seat cannot both be booked.
  const secondClass=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:{
   ...classInput,title:"Concurrent test",room:"Room B",instructor:"Coach B",startsAt:future(4,15)
  }});
  assert.equal(secondClass.status,201,JSON.stringify(secondClass.data));
  const race=await Promise.all([bookMember(a,member1,secondClass.data.class.id),bookMember(a,member2,secondClass.data.class.id)]);
  assert(race.every(x=>x.status===201),JSON.stringify(race.map(x=>x.data)));
  assert.deepEqual(race.map(x=>x.data.booking.status).sort(),["booked","waitlisted"]);
  const concurrentStatus=await call("/api/studio/classes",{cookie:a.cookie});
  assert.equal(concurrentStatus.data.classes.find(x=>x.id===secondClass.data.class.id).booked_count,1);
  // Underfilled classes and overdue leads create transparent opportunity signals.
  const thirdClass=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:{
   ...classInput,title:"Underfilled",room:"Room C",instructor:"Coach C",startsAt:future(1,12),capacity:5
  }});
  assert.equal(thirdClass.status,201,JSON.stringify(thirdClass.data));
  await admin.query("UPDATE people SET next_contact=current_date-interval '3 days' WHERE id=$1 AND studio_id=$2",[pa.data.record.id,studioA]);
  const actionA=await call("/api/studio/action-center",{cookie:a.cookie});
  assert.equal(actionA.status,200,JSON.stringify(actionA.data));
  assert(actionA.data.items.some(x=>x.personId===pa.data.record.id&&x.kind==="lead_followup"));
  assert(actionA.data.items.some(x=>x.sessionId===thirdClass.data.class.id&&x.kind==="open_seats"));
  assert.equal((await call("/api/studio/action-center",{cookie:coachLogin.cookie})).status,403);
  const actionB=await call("/api/studio/action-center",{cookie:b.cookie});
  assert(!actionB.data.items.some(x=>x.personId===pa.data.record.id));
  assert(!actionB.data.items.some(x=>x.sessionId===thirdClass.data.class.id));
  const followup={personId:pa.data.record.id,title:"Follow up with lead",dueAt:future(1,10),category:"Call",priority:"High"};
  const task=await call("/api/studio/tasks",{method:"POST",cookie:a.cookie,body:followup});
  assert.equal(task.status,201,JSON.stringify(task.data));
  assert.equal((await call("/api/studio/tasks",{method:"POST",cookie:a.cookie,body:followup})).status,409);
  assert.equal((await call("/api/studio/tasks",{method:"POST",cookie:b.cookie,body:followup})).status,404);
  const finished=await call("/api/studio/tasks/"+task.data.task.id,{method:"PATCH",cookie:a.cookie,body:{outcome:"Contacted"}});
  assert.equal(finished.status,200,JSON.stringify(finished.data));
  assert.equal((await call("/api/studio/tasks",{cookie:a.cookie})).data.tasks.some(x=>x.id===task.data.task.id),false);
  assert.equal((await call("/api/studio/tasks/"+task.data.task.id,{method:"PATCH",cookie:b.cookie,body:{outcome:"Completed"}})).status,404);
  console.log("Operational API integration passed: manual packs, credit idempotency, capacity locks, waitlist refunds/promotions, role and tenant checks, actionable signals.");
  // Self-service member portal: invitation is single-use, password must be independent.
  const memberEmail=(await admin.query("SELECT email FROM people WHERE id=$1 AND studio_id=$2",[member1,studioA])).rows[0].email;
  const invitation=await call("/api/studio/invitations",{method:"POST",cookie:a.cookie,body:{memberId:member1}});
  assert.equal(invitation.status,202,JSON.stringify(invitation.data));
  const invitationRow=await admin.query("SELECT payload->>'url' AS url FROM mail_outbox WHERE recipient_email=$1 AND template='member_invitation' ORDER BY created_at DESC LIMIT 1",[memberEmail]);
  assert.equal(invitationRow.rowCount,1);
  const inviteToken=new URLSearchParams(new URL(invitationRow.rows[0].url).hash.slice(1)).get("invite");
  const memberPassword="Member Test Pass 2026! "+unique.slice(0,5);
  const accepted=await call("/api/auth/invite/accept",{method:"POST",body:{token:inviteToken,password:memberPassword}});
  assert.equal(accepted.status,200,JSON.stringify(accepted.data));
  assert.equal((await call("/api/auth/invite/accept",{method:"POST",body:{token:inviteToken,password:memberPassword}})).status,400);
  const memberLogin=await call("/api/auth/login",{method:"POST",body:{email:memberEmail,password:memberPassword}});
  assert.equal(memberLogin.status,200,JSON.stringify(memberLogin.data));
  const memberCookie=memberLogin.cookie;
  invitedUser=(await admin.query("SELECT id FROM app_users WHERE email=$1",[memberEmail])).rows[0].id;
  const memberMe=await call("/api/member/me",{cookie:memberCookie});
  assert.equal(memberMe.status,200,JSON.stringify(memberMe.data));
  assert.equal(memberMe.data.member.id,member1);
  assert.equal((await call("/api/studio/people",{cookie:memberCookie})).status,403);
  assert.equal((await call("/api/member/classes",{cookie:memberCookie})).status,200);
  assert.equal((await call("/api/member/bookings",{method:"POST",cookie:memberCookie,body:{sessionId:crossClass.data.class.id}})).status,404);
  const memberBooked=await call("/api/member/bookings",{method:"POST",cookie:memberCookie,body:{sessionId:thirdClass.data.class.id,memberId:member2}});
  assert.equal(memberBooked.status,201,JSON.stringify(memberBooked.data));
  assert.equal(memberBooked.data.booking.status,"booked");
  assert.equal((await call("/api/member/bookings/"+second.data.booking.id,{method:"DELETE",cookie:memberCookie})).status,404);
  const ownCancellation=await call("/api/member/bookings/"+memberBooked.data.booking.id,{method:"DELETE",cookie:memberCookie});
  assert.equal(ownCancellation.status,200,JSON.stringify(ownCancellation.data));
  assert.equal((await call("/api/member/bookings/"+memberBooked.data.booking.id,{method:"DELETE",cookie:memberCookie})).status,200);
  // Verified, idempotent Lemon Squeezy test-mode webhooks.
  const secret=process.env.LEMON_WEBHOOK_SECRET;
  assert(secret,"Webhook test secret must be set on isolated CI.");
  const eventBody={
   meta:{event_name:"subscription_created",custom_data:{studio_id:studioA}},
   data:{type:"subscriptions",id:"987654",attributes:{
    store_id:Number(process.env.LEMON_STORE_ID),variant_id:Number(process.env.LEMON_MONTHLY_VARIANT_ID),
    test_mode:true,status:"active",renews_at:future(30,12),ends_at:null,updated_at:new Date().toISOString()
   }}
  };
  async function signedEvent(event,valid=true){
   const body=JSON.stringify(event);
   const signature=createHmac("sha256",valid?secret:"incorrect-secret").update(body).digest("hex");
   const response=await fetch(HOST+"/api/billing/lemon-webhook",{
    method:"POST",headers:{"Content-Type":"application/json","X-Signature":signature},body
   });
   return {status:response.status,data:await response.json()};
  }
  assert.equal((await signedEvent(eventBody,false)).status,401);
  const paid=await signedEvent(eventBody);
  assert.equal(paid.status,200,JSON.stringify(paid.data));
  assert.equal(paid.data.processed,true);
  const duplicateWebhook=await signedEvent(eventBody);
  assert.equal(duplicateWebhook.status,200);
  assert.equal(duplicateWebhook.data.processed,false);
  const subscribed=await call("/api/studio/subscription",{cookie:a.cookie});
  assert.equal(subscribed.status,200);
  assert.equal(subscribed.data.subscription.enabled,true);
  assert.equal(subscribed.data.subscription.plan,"monthly");
  const otherSubscription=await call("/api/studio/subscription",{cookie:b.cookie});
  assert.equal(otherSubscription.data.subscription.enabled,false);
  const expiryEvent=structuredClone(eventBody);
  expiryEvent.meta.event_name="subscription_expired";
  expiryEvent.data.attributes.status="expired";
  expiryEvent.data.attributes.ends_at=new Date(Date.now()-86400000).toISOString();
  expiryEvent.data.attributes.updated_at=new Date(Date.now()+2000).toISOString();
  assert.equal((await signedEvent(expiryEvent)).status,200);
  const afterExpiry=await call("/api/studio/subscription",{cookie:a.cookie});
  assert.equal(afterExpiry.data.subscription.enabled,false,"Expired subscription must not grant access.");
  // Owner-only data portability, contact updates and safe soft-archive.
  const exported=await call("/api/studio/export",{cookie:a.cookie});
  assert.equal(exported.status,200,JSON.stringify(exported.data));
  assert.equal(exported.data.format,"StudioTasker Studio Export v1");
  assert.equal(exported.data.studio.id,studioA);
  assert(exported.data.people.every(p=>p.id!==pb.data.record.id),"Tenant export must never leak another studio.");
  assert.equal((await call("/api/studio/export",{cookie:memberCookie})).status,403);
  const edited=await call("/api/studio/people/"+pa.data.record.id,{
   method:"PATCH",cookie:a.cookie,body:{name:"Alice Updated",stage:"Contacted",notes:"Prefers morning classes"}
  });
  assert.equal(edited.status,200,JSON.stringify(edited.data));
  assert.equal(edited.data.contact.full_name,"Alice Updated");
  assert.equal((await call("/api/studio/people/"+pa.data.record.id,{
   method:"PATCH",cookie:b.cookie,body:{name:"Not Allowed"}
  })).status,404);
  const archived=await call("/api/studio/people/"+pa.data.record.id,{method:"DELETE",cookie:a.cookie});
  assert.equal(archived.status,200,JSON.stringify(archived.data));
  const afterArchive=await call("/api/studio/people",{cookie:a.cookie});
  assert(!afterArchive.data.records.some(x=>x.id===pa.data.record.id),"Archived contacts must be hidden from active CRM.");
  assert.equal((await call("/api/studio/privacy",{cookie:a.cookie})).status,200);
  assert.equal((await call("/api/studio/privacy",{cookie:memberCookie})).status,403);
  const twoDozen=await Promise.all(Array.from({length:24},async()=>{
   const started=performance.now();
   const r=await call("/api/studio/classes",{cookie:a.cookie});
   return {status:r.status,elapsed:performance.now()-started};
  }));
  assert(twoDozen.every(t=>t.status===200),"Concurrent read smoke check failed.");
  const p95=twoDozen.map(t=>t.elapsed).sort((x,y)=>x-y)[Math.floor(twoDozen.length*.95)];
  assert(p95<10000,"CI smoke-test 95th percentile exceeded 10 seconds");
  console.log("Performance smoke: 24 concurrent class reads; p95",Math.round(p95),"ms (CI test only, not capacity SLA)");
  // Password reset is one-time and revokes all sessions belonging to the user.
  const forgot=await call("/api/auth/password/forgot",{method:"POST",body:{email:a.email}});
  assert.equal(forgot.status,200);
  const forgotUnknown=await call("/api/auth/password/forgot",{method:"POST",body:{email:"absent-"+unique+"@example.com"}});
  assert.equal(forgotUnknown.status,200,"No user enumeration.");
  const resetRow=await admin.query("SELECT payload->>'url' AS url FROM mail_outbox WHERE recipient_email=$1 AND template='password_reset' ORDER BY created_at DESC LIMIT 1",[a.email]);
  assert.equal(resetRow.rowCount,1);
  const resetToken=new URLSearchParams(new URL(resetRow.rows[0].url).hash.slice(1)).get("reset");
  const resetDone=await call("/api/auth/password/reset",{method:"POST",body:{token:resetToken,password:"A New Password 2026! "+unique.slice(0,5)}});
  assert.equal(resetDone.status,200,JSON.stringify(resetDone.data));
  assert.equal((await call("/api/auth/password/reset",{method:"POST",body:{token:resetToken,password:"Another Test Password 2026!"}})).status,400);
  assert.equal((await call("/api/auth/me",{cookie:a.cookie})).status,401);

  assert.equal((await call("/api/auth/logout",{method:"POST",cookie:signin.cookie})).status,200);
  assert.equal((await call("/api/auth/me",{cookie:signin.cookie})).status,401,"Revoked session should not work");
  console.log("HTTP integration passed: register/login/logout, CSRF, roles, tenant isolation and cross-tenant forgery protection.");
 }catch(e){
  throw Error(e.message+"\nServer logs:\n"+logs.join("").slice(-2500));
 }finally{
  if(studioA)await admin.query("DELETE FROM studios WHERE id=$1",[studioA]).catch(()=>{});
  if(studioB)await admin.query("DELETE FROM studios WHERE id=$1",[studioB]).catch(()=>{});
  for(const id of [invitedUser,instructor,ownerA,ownerB])if(id)await admin.query("DELETE FROM app_users WHERE id=$1",[id]).catch(()=>{});
  await admin.end();
  server.kill("SIGTERM");
  await Promise.race([once(server,"close"),new Promise(r=>setTimeout(r,2000))]);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
