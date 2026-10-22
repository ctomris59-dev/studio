const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
module.exports=async function({evalJs,waitText,api,cookie,memberId,packageId,studioId,admin,peer}){
 const panel='section[aria-label="Staff operations"]';
 const click=async text=>evalJs(`(()=>{const b=Array.from(document.querySelectorAll(${JSON.stringify(panel+' button')})).find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('Button unavailable: '+${JSON.stringify(text)});b.click();return true})()`);
 const tab=async name=>{await evalJs(`Array.from(document.querySelectorAll('nav[aria-label="Studio workspace"] button')).find(x=>x.textContent.trim()===${JSON.stringify(name)}).click();true`);await waitText(panel,'For your studio team');};
 const field=async(label,value)=>evalJs(`(()=>{const l=Array.from(document.querySelectorAll(${JSON.stringify(panel+' label')})).find(x=>x.firstChild?.textContent.trim()===${JSON.stringify(label)});const e=l?.querySelector('input,select,textarea');if(!e)throw Error('Missing '+${JSON.stringify(label)});const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
 const open=async title=>evalJs(`(()=>{const s=Array.from(document.querySelectorAll(${JSON.stringify(panel+' summary')})).find(x=>x.textContent===${JSON.stringify(title)});if(!s)throw Error('Missing detail');s.parentElement.open=true;return true})()`);
 const saved=()=>waitText(panel+' [role="status"]','Saved.');
 await tab('Settings');await open('Waitlist policy');await field('Staff hold duration (minutes)','10');await click('Save waitlist policy');await saved();
 assert.equal((await api('/api/studio/operations',{cookie})).data.policy.offerMinutes,10);
 await open('Studio waiver document versions');await field('Document title','Browser waiver');await field('Version','1');await field('Document text','Externally signed studio waiver for browser regression.');await click('Save document version');await saved();
 let data=(await api('/api/studio/operations',{cookie})).data;assert.equal(data.documents[0].title,'Browser waiver');const doc=data.documents[0].id;
 const confirm=await api('/api/studio/members/'+memberId+'/package',{method:'POST',cookie,body:{packageId}});assert.equal(confirm.status,200);
 await tab('Members');await waitText(panel,'Acceptance Member');await field('Member',memberId);await open('Record signed waiver');await waitText(panel,'Browser waiver');await field('Document version',doc);await field('Acceptance date',new Date().toISOString().slice(0,10));await field('Signed document reference','Browser archive 12');
 await evalJs(`Array.from(document.querySelectorAll(${JSON.stringify(panel+' input[type=checkbox]')})).find(x=>x.closest('label').textContent.includes('verified acceptance')).click();true`);await click('Record acceptance');await saved();
 data=(await api('/api/studio/operations?memberId='+memberId,{cookie})).data;assert.equal(data.waiverRecords.length,1);
 await open('Renew package with credit carryover');await field('New package',packageId);await field('Maximum credits to carry','2');await evalJs(`Array.from(document.querySelectorAll(${JSON.stringify(panel+' input[type=checkbox]')})).find(x=>x.closest('label').textContent.includes('reviewed this renewal')).click();true`);await click('Renew package');await saved();
 data=(await api('/api/studio/operations?memberId='+memberId,{cookie})).data;assert.equal(data.member.credits,7);
 const series=randomUUID(),start=new Date(Date.now()+5*86400000);start.setUTCHours(10,0,0,0);
 const ids=[];for(let n=0;n<3;n++){const r=await admin.query(`INSERT INTO class_sessions(studio_id,title,instructor,room,starts_at,duration_minutes,capacity,series_id,spot_booking_enabled) VALUES($1,$2,$2,$2,$3,50,2,$4,false) RETURNING id`,[studioId,'Browser operations '+n,new Date(start.getTime()+n*7*86400000),series]);ids.push(r.rows[0].id)}
 await tab('Classes');await waitText(panel,'Browser operations 0');await field('Member',memberId);await field('Source / recurring class',ids[0]);await open('Recurring member reservations');await field('Through date',new Date(start.getTime()+8*86400000).toISOString().slice(0,10));await click('Create recurring reservations');await saved();
 data=(await api('/api/studio/operations?memberId='+memberId,{cookie})).data;assert.equal(data.attempts.length,2);assert(data.attempts.every(x=>x.outcome==='booked'));
 const booked=(await api('/api/studio/bookings?sessionId='+ids[0],{cookie})).data.bookings[0];
 await open('Move a reservation');await field('Reservation',booked.id);await field('Destination class',ids[2]);await click('Move reservation');await saved();assert.equal((await api('/api/studio/bookings?sessionId='+ids[2],{cookie})).data.bookings[0].id,booked.id);
 await open('Bulk schedule changes');await evalJs(`Array.from(document.querySelectorAll(${JSON.stringify(panel+' input[type=checkbox]')})).find(x=>x.closest('label').textContent.includes('Browser operations 2')).click();true`);await field('Change','room');await field('New room','Browser updated room');
 // CDP accepts the native confirmation dialog only after observing it in this test flow.
 await peer.send('Page.enable');
 const submission=click('Apply to 1 classes');
 await new Promise(r=>setTimeout(r,300));await peer.send('Page.handleJavaScriptDialog',{accept:true});await submission;await saved();
 assert.equal((await admin.query('SELECT room FROM class_sessions WHERE id=$1',[ids[2]])).rows[0].room,'Browser updated room');
 await peer.send('Emulation.setDeviceMetricsOverride',{width:390,height:830,deviceScaleFactor:1,mobile:true});
 assert.equal(await evalJs('document.documentElement.scrollWidth>innerWidth+4'),false,'Staff operations mobile overflow');await peer.send('Emulation.clearDeviceMetricsOverride');
 console.log('STAFF_BROWSER_PASSED: policy, waiver version/record, renewal preview, recurring booking, atomic move, bulk room edit, mobile layout.');
};
