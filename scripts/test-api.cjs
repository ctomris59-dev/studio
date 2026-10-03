const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const {once}=require("node:events");
const {randomUUID,randomBytes,scryptSync}=require("node:crypto");
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
 let studioA,studioB,ownerA,ownerB,instructor;
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
   assert.equal(res.status,201,JSON.stringify(res.data));
   assert(res.cookie.startsWith("reformdesk_session="));
   assert((res.headers.get("set-cookie")||"").includes("HttpOnly"));
   const account=(await call("/api/auth/me",{cookie:res.cookie}));
   assert.equal(account.status,200);
   assert.equal(account.data.user.email,email);
   assert.equal(account.data.user.role,"owner");
   return {email,cookie:res.cookie,studioId:account.data.studio.id,userId:account.data.user.id};
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
  instructor=(await admin.query("INSERT INTO app_users(email,password_hash) VALUES($1,$2) RETURNING id",[instructorEmail,stored])).rows[0].id;
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
  assert.equal((await call("/api/auth/logout",{method:"POST",cookie:signin.cookie})).status,200);
  assert.equal((await call("/api/auth/me",{cookie:signin.cookie})).status,401,"Revoked session should not work");
  console.log("HTTP integration passed: register/login/logout, CSRF, roles, tenant isolation and cross-tenant forgery protection.");
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
