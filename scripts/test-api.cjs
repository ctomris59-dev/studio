const assert=require("node:assert/strict");
const fs=require("node:fs");
const {spawn}=require("node:child_process");
const {once}=require("node:events");
const {randomUUID,randomBytes,scryptSync,createHmac}=require("node:crypto");
const {Pool}=require("pg");
const HOST="http://127.0.0.1:3187";
const LEGAL={termsVersion:"2026-10-06.4",dpaVersion:"2026-10-06.3",privacyVersion:"2026-10-06.4",cancellationVersion:"2026-10-06.3",legalAccepted:true,plan:"monthly"};
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
async function callRaw(path,{method="POST",text="",cookie,origin=HOST,filename="studio-import.csv"}={}){
 const headers={"Origin":origin,"Content-Type":"text/csv","X-StudioTasker-Filename":filename};
 if(cookie)headers.Cookie=cookie;
 const response=await fetch(HOST+path,{method,headers,body:text,redirect:"manual",cache:"no-store"});
 let data;try{data=await response.json()}catch{data={}};
 return {status:response.status,data,cookie:cookieFrom(response),headers:response.headers};
}
async function callLogo(path,{method="POST",cookie,bytes,mime="image/png"}={}){
 const headers={"Origin":HOST};if(cookie)headers.Cookie=cookie;
 let body;
 if(method==="POST"){body=new FormData();body.set("logo",new Blob([bytes],{type:mime}),"studio-logo.png");}
 const response=await fetch(HOST+path,{method,headers,body,redirect:"manual",cache:"no-store"});
 const buffer=new Uint8Array(await response.arrayBuffer());
 return {status:response.status,buffer,contentType:response.headers.get("content-type")||""};
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
 let studioA,studioB,ownerA,ownerB,instructor;
 try{
  await waitForBoot(server,logs);
  for(const legalPath of ["/legal","/legal/terms","/legal/privacy","/legal/dpa","/legal/cookies","/legal/subprocessors","/legal/security","/legal/cancellation"]){const page=await call(legalPath);assert.equal(page.status,200,legalPath+" must render.");}
  const pilatesLanding=await call("/pilates-studio-software");assert.equal(pilatesLanding.status,200,"Pilates acquisition landing page must render.");assert((pilatesLanding.headers.get("content-type")||"").includes("text/html"));
  const compareLanding=await call("/compare");assert.equal(compareLanding.status,200,"Neutral comparison landing page must render.");assert((compareLanding.headers.get("content-type")||"").includes("text/html"));
  const sitemapPage=await call("/sitemap.xml");assert.equal(sitemapPage.status,200,"Sitemap must render.");
  const startPage=await call("/start?plan=annual");
  assert.equal(startPage.status,200,"Purchase start page must render.");
  assert((startPage.headers.get("content-type")||"").includes("text/html"));
  const bookingPreview=await call("/book/preview");
  assert.equal(bookingPreview.status,200,"Self-service booking preview must render.");
  assert((bookingPreview.headers.get("content-type")||"").includes("text/html"));
  assert.equal((await call("/api/auth/me")).status,401);
  assert.equal((await call("/api/studio/people")).status,401);
  const badOrigin=await call("/api/auth/register",{method:"POST",origin:"https://cross-origin.example",body:{email:"x@example.com"}});
  assert.equal(badOrigin.status,403);
  const unique=randomUUID().replace(/-/g,"");
  const password="Test Password 34! "+unique.slice(0,5);
  async function register(prefix){
   const email=prefix+"-"+unique+"@example.com";
   const res=await call("/api/auth/register",{method:"POST",body:{email,password,studioName:prefix+" Studio",focus:"Pilates",...LEGAL}});
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
   const acceptance=await admin.query("SELECT terms_version,dpa_version,privacy_version,plan,price_cents,ip_hash FROM legal_acceptances WHERE studio_id=$1 AND user_id=$2",[account.data.studio.id,account.data.user.id]);
   assert.equal(acceptance.rowCount,1,"Registration must record legal clickwrap evidence.");assert.equal(acceptance.rows[0].plan,"monthly");assert.equal(acceptance.rows[0].price_cents,3990);assert.equal(acceptance.rows[0].ip_hash.length,64);
   return {email,cookie:login.cookie,studioId:account.data.studio.id,userId:account.data.user.id};
  }
  const a=await register("alpine");const b=await register("bluebird");
  studioA=a.studioId;studioB=b.studioId;ownerA=a.userId;ownerB=b.userId;
  const duplicate=await call("/api/auth/register",{method:"POST",body:{email:a.email,password,studioName:"Duplicate Studio",focus:"Pilates",...LEGAL}});
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

  // Studio-only booking, class-package entitlement, credit ledger and action-center regression.
  const future=(days,hour)=>{
   const d=new Date();d.setUTCDate(d.getUTCDate()+days);d.setUTCHours(hour,0,0,0);return d.toISOString();
  };
  async function createMember(account,name){
   const result=await call("/api/studio/people",{method:"POST",cookie:account.cookie,body:{
    kind:"member",name,email:name.toLowerCase().replaceAll(" ",".")+"-"+unique+"@example.com"
   }});
   assert.equal(result.status,201,JSON.stringify(result.data));return result.data.record.id;
  }
  const config=await call("/api/studio/settings",{cookie:a.cookie});
  assert.equal(config.status,200);assert.equal(config.data.studio.timezone,"UTC");
  assert(["Pilates","Yoga","Barre","Dance","Indoor cycling","Fitness & Gym","Boutique fitness"].includes(config.data.studio.focus));
  const customized=await call("/api/studio/settings",{method:"PATCH",cookie:a.cookie,body:{
   name:"Alpine Studio",focus:"Pilates",timezone:"UTC",accentColor:"#7C3AED",memberTerm:"Clients",classTerm:"Sessions",creditTerm:"Visits",
   weekStarts:"sunday",timeFormat:"12h",defaultView:"members",defaultClassDuration:60,defaultClassCapacity:12,defaultRoom:"Purple Room",
   inactiveDays:7,lowCreditsThreshold:5,renewalWindowDays:30,trialFollowupHours:1,packageReviewHours:1,openSeatsThreshold:1,privacyPolicyUrl:"https://alpine.example/privacy"
  }});
  assert.equal(customized.status,200,JSON.stringify(customized.data));
  assert.equal(customized.data.studio.accentColor,"#7C3AED");assert.equal(customized.data.studio.memberTerm,"Clients");
  assert.equal(customized.data.studio.classTerm,"Sessions");assert.equal(customized.data.studio.creditTerm,"Visits");
  assert.equal(customized.data.studio.defaultClassDuration,60);assert.equal(customized.data.studio.inactiveDays,7);assert.equal(customized.data.studio.privacyPolicyUrl,"https://alpine.example/privacy");
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:a.cookie,body:{accentColor:"purple"}})).status,400);
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:a.cookie,body:{privacyPolicyUrl:"javascript:alert(1)"}})).status,400);
  const legalStatus=await call("/api/legal/status",{cookie:a.cookie});assert.equal(legalStatus.status,200);assert.equal(legalStatus.data.legal.accepted.monthly,true);assert.equal(legalStatus.data.legal.accepted.annual,false);
  const tinyPng=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  const logoUp=await callLogo("/api/studio/logo",{cookie:a.cookie,bytes:tinyPng});assert.equal(logoUp.status,200);
  const logoA=await callLogo("/api/studio/logo",{method:"GET",cookie:a.cookie});assert.equal(logoA.status,200);assert.equal(logoA.contentType,"image/png");
  assert.equal((await callLogo("/api/studio/logo",{method:"GET",cookie:b.cookie})).status,404,"Studio B must not see Studio A logo.");
  const afterBrand=await call("/api/studio/settings",{cookie:a.cookie});assert.equal(afterBrand.data.studio.hasLogo,true);
  assert.equal("public_slug" in config.data.studio,false,"Studio-only settings must not expose public member booking.");
  const csv=[
   "name,email,phone,type,credits,expiry_date,plan,package_status,member_status,lead_stage,notes",
   "Imported Member,imported-"+unique+"@example.com,,member,,,,pending,active,,Existing customer",
   "Imported Lead,imported-lead-"+unique+"@example.com,,lead,,,,,,Trial attended,\"Interested, prefers mornings\""
  ].join("\n");
  const csvPreview=await callRaw("/api/studio/import/csv?mode=preview",{cookie:a.cookie,text:csv,filename:"previous-studio.csv"});
  assert.equal(csvPreview.status,200,JSON.stringify(csvPreview.data));assert.equal(csvPreview.data.summary.ready,2);
  const csvCommit=await callRaw("/api/studio/import/csv?mode=commit",{cookie:a.cookie,text:csv,filename:"previous-studio.csv"});
  assert.equal(csvCommit.status,201,JSON.stringify(csvCommit.data));assert.equal(csvCommit.data.summary.imported,2);
  const csvAgain=await callRaw("/api/studio/import/csv?mode=preview",{cookie:a.cookie,text:csv});
  assert.equal(csvAgain.data.summary.ready,0,"CSV duplicate preview must not silently duplicate contacts.");
  const bAfterImport=await call("/api/studio/people",{cookie:b.cookie});
  assert(!bAfterImport.data.records.some(x=>x.email==="imported-"+unique+"@example.com"),"CSV imports remain tenant-isolated.");
  const onboardingEarly=await call("/api/studio/onboarding",{cookie:a.cookie});
  assert.equal(onboardingEarly.status,200);assert(onboardingEarly.data.steps.find(x=>x.id==="contacts").done);
  assert.equal((await callRaw("/api/studio/import/csv?mode=commit",{cookie:coachLogin.cookie,text:csv})).status,403);
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:b.cookie,body:{name:"Bluebird Studio",focus:"Dance",timezone:"Europe/London"}})).status,200);
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:a.cookie,body:{name:"Alpine Studio",focus:"Pilates",timezone:"Not/A_Zone"}})).status,400);
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:coachLogin.cookie,body:{name:"Forbidden",focus:"Yoga",timezone:"UTC"}})).status,403);

  const detailedMember=await call("/api/studio/people",{method:"POST",cookie:a.cookie,body:{
   kind:"member",name:"Dance Student",email:"dance-student-"+unique+"@example.com",tags:["beginner","evening"],waiverStatus:"pending",
   relatedContactName:"Taylor Parent",relatedContactRole:"Parent",relatedContactEmail:"parent-"+unique+"@example.com",notes:"Term student"
  }});
  assert.equal(detailedMember.status,201,JSON.stringify(detailedMember.data));
  assert.deepEqual(detailedMember.data.record.tags,["beginner","evening"]);assert.equal(detailedMember.data.record.waiver_status,"pending");
  assert.equal(detailedMember.data.record.related_contact_role,"Parent");
  const member1=await createMember(a,"Member One"),member2=await createMember(a,"Member Two"),member3=await createMember(a,"Member Pending");
  assert.equal((await call("/api/studio/members",{cookie:coachLogin.cookie})).status,403);
  const pack=await call("/api/studio/packages",{method:"POST",cookie:a.cookie,body:{name:"5 Class Pack",description:"Internal entitlement template",credits:5,validDays:30}});
  assert.equal(pack.status,201,JSON.stringify(pack.data));const packId=pack.data.package.id;
  assert.equal("price_cents" in pack.data.package,false,"Internal package templates must not expose member payment pricing.");
  const crossConfirm=await call("/api/studio/members/"+member1+"/package",{method:"POST",cookie:b.cookie,body:{packageId:packId}});
  assert.equal(crossConfirm.status,404,JSON.stringify(crossConfirm.data));
  const confirmMember=async id=>{
   const result=await call("/api/studio/members/"+id+"/package",{method:"POST",cookie:a.cookie,body:{packageId:packId}});
   assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.member.package_status,"Confirmed");
  };
  await confirmMember(member1);await confirmMember(member2);
  const spotBooking=await call("/api/studio/bookings",{method:"POST",cookie:a.cookie,body:{sessionId:spotClass.data.class.id,memberId:member1,spotNumber:1}});
  assert.equal(spotBooking.status,201,JSON.stringify(spotBooking.data));assert.equal(spotBooking.data.booking.spot_number,1);
  const occupiedSpot=await call("/api/studio/bookings",{method:"POST",cookie:a.cookie,body:{sessionId:spotClass.data.class.id,memberId:member2,spotNumber:1}});
  assert.equal(occupiedSpot.status,409,"Occupied equipment spot must not be double-booked.");
  const secondSpot=await call("/api/studio/bookings",{method:"POST",cookie:a.cookie,body:{sessionId:spotClass.data.class.id,memberId:member2,spotNumber:2}});
  assert.equal(secondSpot.status,201,JSON.stringify(secondSpot.data));assert.equal(secondSpot.data.booking.spot_number,2);
  const confirmedState=await admin.query("SELECT package_status,credits FROM people WHERE studio_id=$1 AND id=$2",[studioA,member1]);
  assert.equal(confirmedState.rows[0].package_status,"Confirmed","Package confirmation must persist before credit adjustment.");
  assert.equal(confirmedState.rows[0].credits,5,"Package confirmation must persist numeric credits.");
  assert.equal((await call("/api/studio/members/"+member1+"/package",{method:"POST",cookie:a.cookie,body:{packageId:packId}})).status,409);
  const key=randomUUID(),adjustment={delta:2,reason:"Correction after staff review",requestKey:key};
  const adjusted=await call("/api/studio/members/"+member1+"/credits",{method:"POST",cookie:a.cookie,body:adjustment});
  assert.equal(adjusted.status,200,JSON.stringify(adjusted.data));assert.equal(adjusted.data.adjustment.credits,7);
  const repeated=await call("/api/studio/members/"+member1+"/credits",{method:"POST",cookie:a.cookie,body:adjustment});
  assert.equal(repeated.status,200);assert.equal(repeated.data.adjustment.alreadyApplied,true);assert.equal(repeated.data.adjustment.credits,7);
  assert.equal((await call("/api/studio/members/"+member2+"/credits",{method:"POST",cookie:a.cookie,body:adjustment})).status,409);
  assert.equal((await call("/api/studio/members/"+member1+"/credits",{method:"POST",cookie:a.cookie,body:{delta:-20,reason:"Should not overdraw",requestKey:randomUUID()}})).status,409);
  assert.equal((await call("/api/studio/members/"+member1+"/credits",{method:"POST",cookie:coachLogin.cookie,body:{delta:1,reason:"Forbidden instructor update",requestKey:randomUUID()}})).status,403);

  const start=future(3,15),classInput={title:"Reformer Test",instructor:"Coach A",room:"Room A",startsAt:start,durationMinutes:50,capacity:1,spotBookingEnabled:false};
  const createdClass=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:classInput});
  assert.equal(createdClass.status,201,JSON.stringify(createdClass.data));const classId=createdClass.data.class.id;
  const crossClass=await call("/api/studio/classes",{method:"POST",cookie:b.cookie,body:classInput});
  assert.equal(crossClass.status,201,JSON.stringify(crossClass.data));
  const conflict=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:{...classInput,title:"Overlap",room:"Other room",startsAt:new Date(Date.parse(start)+15*60000).toISOString()}});
  assert.equal(conflict.status,409,JSON.stringify(conflict.data));
  assert.equal((await call("/api/studio/classes",{method:"POST",cookie:coachLogin.cookie,body:classInput})).status,403);
  const staffCreated=await call("/api/studio/staff",{method:"POST",cookie:a.cookie,body:{displayName:"Maya Coach",role:"Instructor",availabilityNotes:"Weekday mornings"}});
  assert.equal(staffCreated.status,201,JSON.stringify(staffCreated.data));const staffId=staffCreated.data.staff.id;
  const staffEdited=await call("/api/studio/staff/"+staffId,{method:"PATCH",cookie:a.cookie,body:{role:"Coach",availabilityNotes:"Mon–Thu mornings"}});
  assert.equal(staffEdited.status,200,JSON.stringify(staffEdited.data));assert.equal(staffEdited.data.staff.role,"Coach");
  const staffList=await call("/api/studio/staff",{cookie:a.cookie});assert(staffList.data.staff.some(x=>x.id===staffId&&x.role==="Coach"));
  const spotClass=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:{
   title:"Reformer Spots",instructor:"Maya Coach",staffId,room:"Reformer Room",startsAt:future(5,11),durationMinutes:50,capacity:2,
   classFormat:"semi_private",spotBookingEnabled:true,spotLabel:"Reformer",spotCount:2
  }});
  assert.equal(spotClass.status,201,JSON.stringify(spotClass.data));assert.equal(spotClass.data.class.spot_booking_enabled,true);
  assert.equal(spotClass.data.class.spot_label,"Reformer");assert.equal(spotClass.data.class.class_format,"semi_private");
  const repeatDate=new Date(Date.now()+6*86400000).toISOString().slice(0,10),repeatUntil=new Date(Date.now()+12*86400000).toISOString().slice(0,10),allDays=[0,1,2,3,4,5,6];
  const weekly=await call("/api/studio/classes/series",{method:"POST",cookie:a.cookie,body:{title:"Morning Class",instructor:"Coach Series",room:"Studio S",durationMinutes:50,capacity:6,startDate:repeatDate,endDate:repeatUntil,time:"08:00",weekdays:allDays}});
  assert.equal(weekly.status,201,JSON.stringify(weekly.data));assert.equal(weekly.data.classes.length,7);
  const recurringConflict=await call("/api/studio/classes/series",{method:"POST",cookie:a.cookie,body:{title:"Collision",instructor:"Coach Series",room:"Studio T",durationMinutes:50,capacity:6,startDate:repeatDate,endDate:repeatUntil,time:"08:00",weekdays:allDays}});
  assert.equal(recurringConflict.status,409,JSON.stringify(recurringConflict.data));
  assert.equal((await admin.query("SELECT count(*)::int AS n FROM class_sessions WHERE studio_id=$1 AND title=$2",[studioA,"Collision"])).rows[0].n,0);
  assert.equal((await call("/api/studio/settings",{method:"PATCH",cookie:a.cookie,body:{name:"Alpine Studio",focus:"Pilates",timezone:"Europe/Paris"}})).status,409);
  const aClasses=await call("/api/studio/classes",{cookie:a.cookie});
  assert(aClasses.data.classes.some(c=>c.id===classId)&&!aClasses.data.classes.some(c=>c.id===crossClass.data.class.id));

  const bookMember=async(account,id,sessionId=classId)=>call("/api/studio/bookings",{method:"POST",cookie:account.cookie,body:{sessionId,memberId:id}});
  assert.equal((await bookMember(a,member3)).status,409,"Pending entitlement must not book.");
  const first=await bookMember(a,member1);assert.equal(first.status,201);assert.equal(first.data.booking.status,"booked");
  const second=await bookMember(a,member2);assert.equal(second.status,201);assert.equal(second.data.booking.status,"waitlisted");
  assert.equal((await bookMember(a,member1)).data.booking.alreadyExists,true);
  assert.equal((await call("/api/studio/bookings?sessionId="+classId,{cookie:b.cookie})).data.bookings.length,0);
  const firstBalance=(await call("/api/studio/members",{cookie:a.cookie})).data.members.find(x=>x.id===member1);
  assert.equal(firstBalance.credits,6);
  const cancel=await call("/api/studio/bookings/"+first.data.booking.id,{method:"DELETE",cookie:a.cookie});
  assert.equal(cancel.status,200);assert.equal(cancel.data.booking.promoted.id,second.data.booking.id);
  const afterCancel=await call("/api/studio/members",{cookie:a.cookie});
  assert.equal(afterCancel.data.members.find(x=>x.id===member1).credits,7);
  assert.equal(afterCancel.data.members.find(x=>x.id===member2).credits,4);
  assert.equal((await call("/api/studio/bookings/"+first.data.booking.id,{method:"DELETE",cookie:a.cookie})).data.booking.alreadyCancelled,true);

  const secondClass=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:{...classInput,title:"Concurrent test",room:"Room B",instructor:"Coach B",startsAt:future(4,15)}});
  const race=await Promise.all([bookMember(a,member1,secondClass.data.class.id),bookMember(a,member2,secondClass.data.class.id)]);
  assert.deepEqual(race.map(x=>x.data.booking.status).sort(),["booked","waitlisted"]);
  const beforeCheck=await call("/api/studio/bookings?sessionId="+secondClass.data.class.id,{cookie:a.cookie});
  const checkedBooking=beforeCheck.data.bookings.find(b=>b.status==="booked");
  assert.equal((await call("/api/studio/bookings/"+checkedBooking.id+"/attendance",{method:"POST",cookie:a.cookie})).status,409);
  await admin.query("UPDATE class_sessions SET starts_at=now()-interval '30 minutes' WHERE id=$1 AND studio_id=$2",[secondClass.data.class.id,studioA]);
  assert.equal((await call("/api/studio/bookings/"+checkedBooking.id+"/attendance",{method:"POST",cookie:a.cookie})).status,200);
  assert.equal((await call("/api/studio/bookings/"+checkedBooking.id+"/attendance",{method:"DELETE",cookie:a.cookie,body:{reason:"Incorrect check in"}})).status,200);
  const noShowSet=await call("/api/studio/bookings/"+checkedBooking.id+"/status",{method:"POST",cookie:a.cookie,body:{noShow:true}});
  assert.equal(noShowSet.status,200,JSON.stringify(noShowSet.data));
  const noShowClear=await call("/api/studio/bookings/"+checkedBooking.id+"/status",{method:"POST",cookie:a.cookie,body:{noShow:false,reason:"Member arrived late"}});
  assert.equal(noShowClear.status,200,JSON.stringify(noShowClear.data));

  const thirdClass=await call("/api/studio/classes",{method:"POST",cookie:a.cookie,body:{...classInput,title:"Underfilled",room:"Room C",instructor:"Coach C",startsAt:future(1,12),capacity:5}});
  await admin.query("UPDATE people SET next_contact=current_date-interval '3 days' WHERE id=$1 AND studio_id=$2",[pa.data.record.id,studioA]);
  const trialLead=await call("/api/studio/people",{method:"POST",cookie:a.cookie,body:{kind:"lead",name:"Trial Prospect",email:"trial-"+unique+"@example.com"}});
  await admin.query("UPDATE people SET lead_stage='Trial attended',updated_at=now()-interval '2 days' WHERE studio_id=$1 AND id=$2",[studioA,trialLead.data.record.id]);
  await admin.query("UPDATE people SET joined=current_date-interval '45 days',start_date=current_date-interval '45 days',last_visit=current_date-interval '30 days',expiry_date=current_date+interval '45 days' WHERE studio_id=$1 AND id=$2",[studioA,member1]);
  await admin.query("UPDATE people SET updated_at=now()-interval '2 days' WHERE studio_id=$1 AND id=$2",[studioA,member3]);
  const actionA=await call("/api/studio/action-center",{cookie:a.cookie});
  assert.equal(actionA.status,200,JSON.stringify(actionA.data));
  assert(actionA.data.items.some(x=>x.personId===pa.data.record.id&&x.kind==="lead_followup"));
  assert(actionA.data.items.some(x=>x.personId===trialLead.data.record.id&&x.kind==="trial_no_conversion"));
  assert(actionA.data.items.some(x=>x.personId===member1&&x.kind==="inactive_member"));
  assert(actionA.data.items.some(x=>x.id==="package:"+member3&&x.kind==="package_pending"));
  assert(actionA.data.items.some(x=>x.sessionId===thirdClass.data.class.id&&x.kind==="open_seats"));
  assert(actionA.data.rescue.trials>=1&&actionA.data.rescue.inactive>=1&&actionA.data.rescue.pendingPackages>=1);
  const inactiveSignal=actionA.data.items.find(x=>x.personId===member1&&x.kind==="inactive_member");
  const taskFromToday=await call("/api/studio/action-center/action",{method:"POST",cookie:a.cookie,body:{actionKey:inactiveSignal.id,operation:"create_task"}});
  assert.equal(taskFromToday.status,200);assert.equal(taskFromToday.data.created,true);
  const trialSignal=actionA.data.items.find(x=>x.personId===trialLead.data.record.id&&x.kind==="trial_no_conversion");
  assert.equal((await call("/api/studio/action-center/action",{method:"POST",cookie:a.cookie,body:{actionKey:trialSignal.id,operation:"contacted"}})).status,200);
  const packageSignal=actionA.data.items.find(x=>x.id==="package:"+member3);
  assert.equal((await call("/api/studio/action-center/action",{method:"POST",cookie:a.cookie,body:{actionKey:packageSignal.id,operation:"snooze"}})).status,200);
  assert.equal((await call("/api/studio/action-center/action",{method:"POST",cookie:b.cookie,body:{actionKey:packageSignal.id,operation:"snooze"}})).status,404);
  assert.equal((await call("/api/studio/action-center",{cookie:coachLogin.cookie})).status,403);
  const actionB=await call("/api/studio/action-center",{cookie:b.cookie});
  assert(!actionB.data.items.some(x=>x.personId===pa.data.record.id));

  const insights=await call("/api/studio/insights",{cookie:a.cookie});
  assert.equal(insights.status,200,JSON.stringify(insights.data));assert(Array.isArray(insights.data.topClasses));assert(Array.isArray(insights.data.timeSlots));assert(Array.isArray(insights.data.instructors));
  assert(["occupancy","attendanceRate","noShowRate","trialConversion"].every(k=>k in insights.data.summary));
  const finishSetup=await call("/api/studio/onboarding",{method:"POST",cookie:a.cookie,body:{operation:"complete_setup"}});
  assert.equal(finishSetup.status,200,JSON.stringify(finishSetup.data));assert.equal(finishSetup.data.finished,true);
  const followup={personId:pa.data.record.id,title:"Follow up with lead",dueAt:future(1,10),category:"Call",priority:"High"};
  const task=await call("/api/studio/tasks",{method:"POST",cookie:a.cookie,body:followup});
  assert.equal(task.status,201);assert.equal((await call("/api/studio/tasks",{method:"POST",cookie:a.cookie,body:followup})).status,409);
  assert.equal((await call("/api/studio/tasks",{method:"POST",cookie:b.cookie,body:followup})).status,404);
  const finished=await call("/api/studio/tasks/"+task.data.task.id,{method:"PATCH",cookie:a.cookie,body:{outcome:"Contacted"}});
  assert.equal(finished.status,200);
  console.log("Class-based OS passed: vertical presets, recurring series, waitlist, equipment spots, attendance/no-show, staff, member context, Insights, tenant isolation and onboarding.");

  // Verified, idempotent Paddle sandbox webhooks.
  const secret=process.env.PADDLE_WEBHOOK_SECRET;
  assert(secret,"Paddle webhook test secret must be set on isolated CI.");
  const eventBody={
   event_id:"evt_"+"a".repeat(26),
   event_type:"subscription.created",
   occurred_at:new Date().toISOString(),
   notification_id:"ntf_"+"a".repeat(26),
   data:{
    id:"sub_"+"a".repeat(26),status:"active",customer_id:"ctm_"+"a".repeat(26),
    updated_at:new Date().toISOString(),
    current_billing_period:{starts_at:new Date().toISOString(),ends_at:future(30,12)},
    items:[{price:{id:process.env.PADDLE_MONTHLY_PRICE_ID}}],
    custom_data:{studio_id:studioA,plan:"monthly"}
   }
  };
  async function signedEvent(event,valid=true){
   const body=JSON.stringify(event),ts=Math.floor(Date.now()/1000).toString();
   const signature=createHmac("sha256",valid?secret:"incorrect-secret").update(ts+":"+body).digest("hex");
   const response=await fetch(HOST+"/api/billing/paddle-webhook",{
    method:"POST",headers:{"Content-Type":"application/json","Paddle-Signature":"ts="+ts+";h1="+signature},body
   });
   return {status:response.status,data:await response.json()};
  }
  assert.equal((await signedEvent(eventBody,false)).status,401);
  console.log("HTTP stage: Paddle billing webhook");
  const paid=await signedEvent(eventBody);
  assert.equal(paid.status,200,JSON.stringify(paid.data));
  assert.equal(paid.data.processed,true);
  const duplicateWebhook=await signedEvent(eventBody);
  assert.equal(duplicateWebhook.status,200);
  assert.equal(duplicateWebhook.data.processed,false);

  console.log("HTTP stage: subscription read");
  const subscribed=await call("/api/studio/subscription",{cookie:a.cookie});
  assert.equal(subscribed.status,200);
  assert.equal(subscribed.data.subscription.enabled,true);
  assert.equal(subscribed.data.subscription.plan,"monthly");
  assert.equal(subscribed.data.provider.provider,"paddle");
  const otherSubscription=await call("/api/studio/subscription",{cookie:b.cookie});
  assert.equal(otherSubscription.data.subscription.enabled,false);

  const pastDueEvent=structuredClone(eventBody);
  pastDueEvent.event_id="evt_"+"b".repeat(26);
  pastDueEvent.event_type="subscription.past_due";
  pastDueEvent.occurred_at=new Date(Date.now()+1000).toISOString();
  pastDueEvent.data.status="past_due";
  pastDueEvent.data.updated_at=new Date(Date.now()+1000).toISOString();
  assert.equal((await signedEvent(pastDueEvent)).status,200);
  const inGrace=await call("/api/studio/subscription",{cookie:a.cookie});
  assert.equal(inGrace.data.subscription.enabled,true,"Past-due subscription should receive only the short recovery grace.");
  assert(inGrace.data.subscription.graceEndsAt,"Past-due access must expose a finite grace end.");

  const canceledEvent=structuredClone(eventBody);
  canceledEvent.event_id="evt_"+"c".repeat(26);
  canceledEvent.event_type="subscription.canceled";
  canceledEvent.occurred_at=new Date(Date.now()+2000).toISOString();
  canceledEvent.data.status="canceled";
  canceledEvent.data.updated_at=new Date(Date.now()+2000).toISOString();
  canceledEvent.data.current_billing_period={starts_at:new Date(Date.now()-86400000*31).toISOString(),ends_at:new Date(Date.now()-1000).toISOString()};
  assert.equal((await signedEvent(canceledEvent)).status,200);
  const afterSubscriptionCancel=await call("/api/studio/subscription",{cookie:a.cookie});
  assert.equal(afterSubscriptionCancel.data.subscription.enabled,false,"Canceled subscription after its paid period must not grant normal access.");
  // Owner-only data portability, contact updates and safe soft-archive.
  console.log("HTTP stage: owner export");
  const exported=await call("/api/studio/export",{cookie:a.cookie});
  assert.equal(exported.status,200,JSON.stringify(exported.data));
  assert.equal(exported.data.format,"StudioTasker Studio Export v2");
  assert.equal(exported.data.studio.id,studioA);
  assert(exported.data.people.every(p=>p.id!==pb.data.record.id),"Tenant export must never leak another studio.");
  assert.equal((await call("/api/studio/export",{cookie:coachLogin.cookie})).status,403);
  console.log("HTTP stage: post-billing CRM");
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
  assert.equal((await call("/api/studio/privacy",{cookie:coachLogin.cookie})).status,403);
  const twoDozen=await Promise.all(Array.from({length:24},async()=>{
   const started=performance.now();
   const r=await call("/api/studio/classes",{cookie:a.cookie});
   return {status:r.status,elapsed:performance.now()-started};
  }));
  assert(twoDozen.every(t=>t.status===200),"Concurrent read smoke check failed.");
  const p95=twoDozen.map(t=>t.elapsed).sort((x,y)=>x-y)[Math.floor(twoDozen.length*.95)];
  assert(p95<10000,"CI smoke-test 95th percentile exceeded 10 seconds");
  console.log("Performance smoke: 24 concurrent class reads; p95",Math.round(p95),"ms (CI test only, not capacity SLA)");
  // Logo removal must work while the owner's authenticated studio session is still valid.
  assert.equal((await callLogo("/api/studio/logo",{method:"DELETE",cookie:a.cookie})).status,200);
  const afterLogoDelete=await call("/api/studio/settings",{cookie:a.cookie});
  assert.equal(afterLogoDelete.status,200);assert.equal(afterLogoDelete.data.studio.hasLogo,false);

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
  console.log("HTTP integration passed: auth, tenant isolation, personalization, logo isolation, studio operations and billing.");
 }catch(e){
  throw Error(e.message+"\nServer logs:\n"+logs.join("").slice(-2500));
 }finally{
  if(studioA)await admin.query("DELETE FROM studios WHERE id=$1",[studioA]).catch(()=>{});
  if(studioB)await admin.query("DELETE FROM studios WHERE id=$1",[studioB]).catch(()=>{});
  for(const id of [instructor,ownerA,ownerB])if(id)await admin.query("DELETE FROM app_users WHERE id=$1",[id]).catch(()=>{});
  await admin.end();
  server.kill("SIGTERM");
  await Promise.race([once(server,"close"),new Promise(r=>setTimeout(r,2000))]);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});

assert(fs.readFileSync("db/migrations/016_related_contact.sql","utf8").includes("related_contact_name"),"Class-based studio schema must include optional related contact fields for Dance/family workflows.");
assert(fs.readFileSync("app/api/studio/people/[id]/route.ts","utf8").includes("relatedContactEmail")&&fs.readFileSync("app/api/studio/people/route.ts","utf8").includes("related_contact_role"),"People APIs must expose and validate related contacts.");
