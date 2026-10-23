"use strict";
// Real Chromium smoke checks. Requires Chrome installed on the CI runner.
const {spawn}=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const assert=require("node:assert/strict");
const HOST="http://127.0.0.1:3190";
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function cdp(wsUrl){
 return new Promise((resolve,reject)=>{
  const socket=new WebSocket(wsUrl),pending=new Map();let nextId=1;
  socket.addEventListener("open",()=>{
   resolve({send:(method,params={})=>new Promise((ok,fail)=>{
    const id=nextId++;pending.set(id,{ok,fail});
    socket.send(JSON.stringify({id,method,params}));
   }),close:()=>socket.close()});
  });
  socket.addEventListener("error",reject);
  socket.addEventListener("message",event=>{
   const msg=JSON.parse(String(event.data));const p=pending.get(msg.id);
   if(p){pending.delete(msg.id);msg.error?p.fail(Error(msg.error.message)):p.ok(msg.result);}
  });
 });
}
async function waitFor(url,check){
 for(let tries=0;tries<75;tries++){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(800)});if(response.ok){
   const value=await response.json().catch(()=>null);if(check(value))return value;
  }}catch{}
  await delay(250);
 }
 throw Error("Browser/server was not ready: "+url);
}
async function main(){
 const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"]
  .find(file=>fs.existsSync(file))||process.env.CHROME_BIN;
 if(!chrome)throw Error("Real-browser CI requires Chrome; never silently skip this gate.");
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),"studiotasker-chrome-"));
 const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p","3190"],{
  env:{...process.env,NODE_ENV:"production"},stdio:"ignore"
 });
 const browser=spawn(chrome,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
  "--remote-debugging-port=9237","--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
 let peer;
 try{
  for(let i=0;i<75;i++){
   try{const r=await fetch(HOST+"/");if(r.ok)break;}catch{}
   await delay(300);
  }
  const targets=await waitFor("http://127.0.0.1:9237/json/list",v=>Array.isArray(v)&&v.some(x=>x.type==="page"));
  peer=await cdp(targets.find(x=>x.type==="page").webSocketDebuggerUrl);
  await peer.send("Page.enable");
  await peer.send("Runtime.enable");
  const paths=["/","/start","/contact","/app-demo","/yoga-studio-software","/legal/security","/workspace"];
  for(const width of [1280,1200,1024,820,761,760,390,320]){
   await peer.send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<500});
   for(const route of (width===1280||width===390?paths:width===320?["/","/workspace","/pilates-studio-software"]:["/"])){
    const url=HOST+route;
    const res=await fetch(url);assert.equal(res.status,200,route+" server render failed");
    await peer.send("Page.navigate",{url});
    await delay(1050);
    const evaluation=await peer.send("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:`(async()=>{
     await document.fonts.ready;
     const fonts=["Source Sans 3","Barlow Condensed","IBM Plex Mono"];
     const loaded=await Promise.all(fonts.map(name=>document.fonts.load('400 16px "'+name+'"')));
     const weighted=await Promise.all([
      '700 16px "IBM Plex Mono"',
      'italic 600 16px "Barlow Condensed"',
      '900 16px "Source Sans 3"'
     ].map(face=>document.fonts.load(face)));
     const nodes=Array.from(document.querySelectorAll("h1,h2,h3,p,a,button,label,input")).filter(x=>x.getBoundingClientRect().width>0);
     const unknown=nodes.filter(x=>!fonts.some(name=>getComputedStyle(x).fontFamily.includes(name))).length;
     const annual=document.querySelector(".ed-plan-card-featured > a");
     const annualText=annual;
     const rgb=value=>(value.match(/[0-9.]+/g)||[]).slice(0,3).map(Number);
     const lum=color=>{
      const n=rgb(color).map(x=>{const v=x/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
      return n.length===3?.2126*n[0]+.7152*n[1]+.0722*n[2]:0;
     };
     // Lighthouse contrast guard for solid-color first-screen marketing controls.
     // These can be measured directly without guessing a photo/gradient background.
     const solidContrast=selector=>{
      const node=document.querySelector(selector);
      if(!node||getComputedStyle(node).display==="none")return null;
      const style=getComputedStyle(node);
      if(style.backgroundColor==="rgba(0, 0, 0, 0)")return null;
      const fg=lum(style.color),bg=lum(style.backgroundColor);
      return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
     };
     const firstScreenContrast={
      topBar:solidContrast(".ed-topline"),
      heroDemo:solidContrast(".ed-hero-demo"),
      annualPlan:solidContrast(".ed-plan-card-featured > a"),
      demoLink:solidContrast(".ed-nav-demo")
     };
     let annualContrast=null;
     if(annual&&annualText){
      const foreground=lum(getComputedStyle(annualText).color);
      const background=lum(getComputedStyle(annual).backgroundColor);
      annualContrast=(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
     }
     const menu=document.querySelector(".ed-mobile-menu");
     const menuVisible=Boolean(menu&&getComputedStyle(menu).display!=="none"&&menu.getBoundingClientRect().height>0);
     const menuLinks=menu?.querySelectorAll("nav a").length||0;
     let closesOnEscape=false;
     if(menuVisible&&menu){
      menu.open=true;
      menu.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
      closesOnEscape=!menu.open;
     }
     const h1=document.querySelector("main h1");
     const mainCount=document.querySelectorAll("main").length;
     const skip=document.querySelector(".studio-skip-link");
     const hasSkip=Boolean(skip&&skip.getAttribute("href")==="#main-content"&&document.getElementById("main-content"));
     const h1Count=document.querySelectorAll("main h1").length;
     return {title:document.title,unknown,total:nodes.length,loaded:loaded.map(x=>x.length),
      weightedFaces:weighted.map(x=>x.length),
      remoteFonts:performance.getEntriesByType("resource").filter(x=>/fonts\\.(googleapis|gstatic)\\.com/.test(x.name)).length,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+4,
      heroTop:h1?h1.getBoundingClientRect().top:null,annualContrast,firstScreenContrast,menuVisible,menuLinks,closesOnEscape,mainCount,hasSkip,h1Count};
    })()`});
    const result=evaluation.result?.value;
    assert(result,route+" browser evaluate failed: "+JSON.stringify(evaluation));
    assert(result.loaded.every(n=>n>0),route+" missing locally served font family");
    assert(result.weightedFaces.every(n=>n>0),route+" missing bold or italic local font face");
    assert.equal(result.remoteFonts,0,route+" requested fonts from Google");
    // A strict CSP is only useful if Next's nonced hydration still works.
    // Exercise an actual React onClick handler on the login view in Chromium.
    if(route==="/workspace"&&width===1280){
     const ui=await peer.send("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:`(async()=>{
      const forgot=document.querySelector('#auth-tab-forgot');
      if(!forgot)return {exists:false};
      const trust=document.querySelector('.rd-trust-device input[type="checkbox"]');
      const trustText=document.querySelector('.rd-trust-device > span');
      const c=trust?.getBoundingClientRect(),t=trustText?.getBoundingClientRect();
      forgot.click();
      await new Promise(resolve=>setTimeout(resolve,300));
      return {exists:true,selected:forgot.getAttribute('aria-selected'),text:document.querySelector('#main-content h1')?.textContent,
       checkboxWidth:c?.width,checkboxHeight:c?.height,trustAligned:!!c&&!!t&&Math.abs(c.top-t.top)<10};
     })()`});
     const interaction=ui.result?.value;
     assert(interaction?.exists&&interaction.selected==="true"&&/reset your password/i.test(interaction.text||""),
      "Workspace React tab did not hydrate under strict nonce CSP: "+JSON.stringify(interaction));
     assert(interaction.checkboxWidth>=16&&interaction.checkboxWidth<=22&&interaction.checkboxHeight>=16&&interaction.checkboxHeight<=22&&interaction.trustAligned,
      "Workspace trusted-device checkbox must be compact and aligned: "+JSON.stringify(interaction));
    }
    assert(result.total>=1,route+" did not render text");
    if(route!=="/legal/security"){
     assert.equal(result.mainCount,1,route+" should contain exactly one main landmark");
     assert(result.hasSkip,route+" should have functional skip to main content");
     assert.equal(result.h1Count,1,route+" should contain one main page heading");
    }
    assert.equal(result.horizontalOverflow,false,route+" must not overflow the viewport after font-size changes.");
    if(route==="/workspace"&&(width===390||width===320)){
     const compact=await peer.send("Runtime.evaluate",{returnByValue:true,expression:`(()=>{
      const root=document.querySelector(".rd-auth-shell");
      const trust=document.querySelector(".rd-trust-device input[type=checkbox]");
      return {found:!!root,columns:root?getComputedStyle(root).gridTemplateColumns:"",
       size:trust?{width:trust.getBoundingClientRect().width,height:trust.getBoundingClientRect().height}:null};
     })()`});
     const c=compact.result?.value;
     assert(c?.found&&c.columns.split(" ").length===1, "Mobile workspace must stack the auth layout: "+JSON.stringify(c));
     assert(c?.size?.width>=16&&c.size.width<=22&&c.size.height>=16&&c.size.height<=22,
      "Mobile trusted-device checkbox must remain compact: "+JSON.stringify(c));
    }

    // Owner-facing first-screen acceptance: keep BOTH hero panels and the
    // preview's last CTA visible before scrolling, including 768px laptops.
    if(route==="/"&&width===1280){
      for(const [viewportWidth,viewportHeight] of [[1728,847],[1440,768],[1280,900]]){
        await peer.send("Emulation.setDeviceMetricsOverride",{width:viewportWidth,height:viewportHeight,deviceScaleFactor:1,mobile:false});
        await peer.send("Page.navigate",{url:HOST+"/"});
        await delay(800);
        const tested=await peer.send("Runtime.evaluate",{returnByValue:true,expression:`(()=>{
          const hero=document.querySelector(".ed-hero-consolidated");
          const canvas=document.querySelector(".ed-hero-consolidated .ed-hero-canvas");
          const last=document.querySelector(".ed-hero-consolidated .ed-preview-demo-link");
          const lead=document.querySelector(".ed-hero-consolidated .ed-hero-photo");
          const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}};
          return {viewport:innerHeight,hero:box(hero),canvas:box(canvas),last:box(last),lead:box(lead),rows:document.querySelectorAll(".ed-hero-consolidated .ed-preview-class-row").length};
        })()`});
        const dims=tested.result?.value;
        assert(dims,"First-fold hero geometry missing");
        console.log("FIRST FOLD "+viewportWidth+"x"+viewportHeight+": "+JSON.stringify(dims));
        assert(dims.hero.top>=0&&dims.hero.bottom<=dims.viewport-4,
          "Both hero panels must fit before scroll: "+JSON.stringify(dims));
        assert(dims.last.bottom<=dims.hero.bottom-4&&dims.canvas.bottom<=dims.hero.bottom+2,
          "Preview CTA must be visible inside first fold: "+JSON.stringify(dims));
        assert(dims.rows===3,"Do not hide studio preview class rows for desktop first fold");
      }
      await peer.send("Emulation.setDeviceMetricsOverride",{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      await peer.send("Page.navigate",{url:HOST+"/"});
      await delay(600);
    }
    if(route==="/"&&width===1280){
     for(const [label,ratio] of Object.entries(result.firstScreenContrast||{})){
      assert(ratio!==null&&ratio>=4.5,
       "Homepage solid-color text fails WCAG AA contrast: "+label+" ratio="+ratio);
     }
     const photo=await peer.send("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:`(async()=>{
      const img=document.querySelector(".ed-hero-photo > img");
      if(!img)return {found:false};
      try{
       await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error("Image load timed out")),12000))]);
       return {found:true,loaded:img.naturalWidth>0,width:img.naturalWidth,src:img.currentSrc};
      }catch(error){
       return {found:true,loaded:false,error:String(error),src:img.currentSrc};
      }
     })()`});
     const status=photo.result?.value;
     assert(status?.found&&status.loaded,"Top homepage photograph must load through Next image optimization: "+JSON.stringify(status));
    }
    if(route==="/"&&(width===1280||width===390)){
     const visual=await peer.send("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:`(async()=>{
      const cards=[...document.querySelectorAll('.ed-studio-type-grid article')];
      const rowTops=[...new Set(cards.map(c=>Math.round(c.getBoundingClientRect().top)))];
      const cardRows=rowTops.map(top=>cards.filter(c=>Math.abs(c.getBoundingClientRect().top-top)<3).length);
      const hint=document.querySelector('.ed-tour-discovery');
      const next=hint?.querySelector('button[aria-label="Next product area"]');
      const visible=!!hint&&getComputedStyle(hint).display!=='none';
      const controlWidth=next?.getBoundingClientRect().width||0;
      if(${width}===390&&next){next.click();await new Promise(r=>setTimeout(r,400));}
      return {scrollHeight:document.documentElement.scrollHeight,cardRows,visible,controlWidth,
        selected:document.querySelector('.ed-tour-tablist [aria-selected="true"]')?.textContent?.trim()};
     })()`});
     const m=visual.result?.value;
     assert(m,"Homepage design geometry missing");
     console.log("DESIGN ACCEPTANCE "+width+"px:",JSON.stringify(m));
     if(width===1280)assert.deepEqual(m.cardRows,[4,3],"Studio types must be 4+3 on desktop");
     if(width===390){
      assert(m.visible&&m.controlWidth>=44,"Mobile tour controls must be visible and tappable");
      assert.equal(m.selected,"Members","Mobile tour Next button must select Members");
      assert(m.scrollHeight<9403,"Mobile page must be shorter than the prior 9403px design");
     }
    }
    if(route==="/"){
     assert(result.heroTop!==null&&result.heroTop<1000,"Primary H1 must appear before pricing.");
     assert(result.annualContrast!==null&&result.annualContrast>=4.5,"Annual CTA text must meet WCAG AA contrast, got "+result.annualContrast);
     if(width<=1200){assert(result.menuVisible&&result.menuLinks>=7,"Tablet/mobile nav missing at "+width+"px");assert(result.closesOnEscape,"Escape must close the main navigation");}
    }

    if(route==="/contact"&&(width===1280||width===390)){
      const checked=await peer.send("Runtime.evaluate",{returnByValue:true,expression:`(()=>{
       const form=document.querySelector('.ct-form-card form');
       const fields=[...form?.querySelectorAll('input[name],select[name],textarea[name]')||[]].map(x=>x.getAttribute('name'));
       const mode=document.querySelector('.ct-delivery-mode');
       const main=form?.querySelector('button[type="submit"]');
       const copy=form?.querySelector('button.ct-copy-message');
       return {form:!!form,fields,mode:!!mode,button:main?.textContent?.trim(),disabled:main?.disabled,
        copy:!!copy,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
      })()`});
      const c=checked.result?.value;
      assert(c?.form&&c.fields.includes("name")&&c.fields.includes("email")&&c.fields.includes("message")&&!c.horizontalOverflow,
       "Contact must show full form without overflow: "+JSON.stringify(c));
      assert(c.mode&&c.copy&&c.button.includes("OPEN EMAIL APP")&&!c.disabled,
       "Preview without SMTP must offer email-app fallback instead of hiding form: "+JSON.stringify(c));
      console.log("CONTACT FALLBACK "+width+"px:",JSON.stringify(c));
    }
    if(route==="/start"&&(width===390||width===320||width===1280)){
     const viewportChecks=width===1280?[[1280,900],[1440,768],[1756,880]]:[[width,844]];
     for(const [vw,vh] of viewportChecks){
      await peer.send("Emulation.setDeviceMetricsOverride",{width:vw,height:vh,deviceScaleFactor:1,mobile:vw<500});
      await peer.send("Page.navigate",{url:HOST+"/start"});
      await delay(550);
      const measured=await peer.send("Runtime.evaluate",{returnByValue:true,expression:`(()=>{
       const glance=document.querySelector('.st-start-price-glance');
       const links=[...glance.querySelectorAll('a')];
       const cards=[...document.querySelectorAll('.st-start-plans article')];
       const banner=document.querySelector('.st-start-availability');
       const box=el=>el.getBoundingClientRect();
       return {vh:innerHeight,glanceBottom:box(glance).bottom,prices:links.map(x=>x.textContent.trim()),
        chargeBottom:cards.map(x=>box(x.querySelector('.st-plan-price')).bottom),
        cardTop:cards.map(x=>box(x).top),hasBanner:!!banner,
        bannerTop:banner?box(banner).top:null,links:links.map(x=>x.getAttribute('href')),
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
      })()`});
      const v=measured.result?.value;
      console.log("PRICING FIRST FOLD "+vw+"x"+vh+": "+JSON.stringify(v));
      assert(v?.prices.length===2&&v.prices[0].includes("$39.90")&&v.prices[1].includes("$406.80"),"Both actual subscription prices must appear immediately: "+JSON.stringify(v));
      assert(v.glanceBottom<vh-12&&!v.horizontalOverflow,"First-screen prices must fit without overflow: "+JSON.stringify(v));
      assert(v.links[0]==="#monthly-plan"&&v.links[1]==="#annual-plan","Quick pricing links must target real cards");
      assert(v.hasBanner&&v.bannerTop<v.cardTop[0],"Closed registration notice must remain before cards");
      if(vw>=1024)assert(v.chargeBottom.every(y=>y<vh-10),"Both full desktop prices must fit in first screen: "+JSON.stringify(v));
     }
     await peer.send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<500});
     await peer.send("Page.navigate",{url:HOST+"/start"});
     await delay(600);
    }
    if(route==="/start"&&(width===390||width===320||width===1280)){
      const pricing=await peer.send("Runtime.evaluate",{returnByValue:true,expression:`(()=>{
       const priceCards=[...document.querySelectorAll('.st-start-plans article')];
       const prices=[...document.querySelectorAll('.st-plan-charge')];
       const trust=[...document.querySelectorAll('.st-start-trust a')];
       const annual=priceCards[1]?.querySelector('.st-plan-price small');
       const last=document.querySelector('.st-start-plans .annual .st-plan-buy');
       const box=el=>el?.getBoundingClientRect();
       return {cards:priceCards.length,charge:prices.map(el=>el.textContent.trim()),trust:trust.length,
        smallBelowPrice:!!annual&&box(annual).top>box(priceCards[1].querySelector('.st-plan-price em')).top,
        linksBigEnough:trust.every(x=>box(x).height>=44),
        annualLinkHeight:box(last)?.height||0,selectedAnnual:document.querySelectorAll(".st-start-plans article.selected").length};
      })()`});
      const p=pricing.result?.value;
      assert(p?.cards===2&&p.charge.includes("BILLED YEARLY · $406.80 TOTAL")&&p.charge.includes("BILLED MONTHLY · $39.90 TOTAL"),"Both plans must show real charge totals: "+JSON.stringify(p));
      assert(p.trust===4&&p.linksBigEnough&&p.annualLinkHeight>=44,"Pricing trust actions need readable 44px+ targets: "+JSON.stringify(p));
      if(width===390||width===320)assert(p.smallBelowPrice,"Mobile billing period must appear on its own line: "+JSON.stringify(p));
    }
    if(route==="/start"&&width===1280){
      const check=await peer.send("Runtime.evaluate",{returnByValue:true,expression:`(()=>{
        const note=document.querySelector(".st-start-availability");
        const links=[...document.querySelectorAll(".st-plan-buy")];
        return {closed:!!note,visible:note?getComputedStyle(note).display!=="none":false,
         labels:links.map(x=>x.textContent.trim()),urls:links.map(x=>x.getAttribute('href'))};
      })()`});
      const v=check.result?.value;
      assert(v?.closed&&v.visible&&v.urls.length===2&&v.urls.every(u=>u==="/app-demo?tour=1"),"No false purchase entry while studio registration is closed: "+JSON.stringify(v));
    }
    if(route==="/"&&(width===390||width===320)){
      const cols=await peer.send("Runtime.evaluate",{returnByValue:true,expression:'getComputedStyle(document.querySelector(".ed-capability-grid")).gridTemplateColumns.split(" ").filter(Boolean).length'});
      const count=cols.result?.value;
      assert.equal(count,width===390?2:1,"Mobile feature overview must use 2 columns at 390px and 1 at 320px");
    }
    if(route==="/app-demo"&&width===1280){
      await peer.send("Page.navigate",{url:HOST+"/app-demo?tour=1"});
      await delay(1500);
      const result=await peer.send("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:`(async()=>{
       const card=document.querySelector('.sad-tour-card');
       const next=card?.querySelector('.sad-tour-actions button:last-child');
       if(!card||!next)return {card:!!card,next:!!next};
       next.click();
       await new Promise(r=>setTimeout(r,250));
       const tryBtn=document.querySelector('.sad-tour-try');
       tryBtn?.click();
       await new Promise(r=>setTimeout(r,350));
       return {card:!!card,next:!!next,tryButton:!!tryBtn,
        leadForm:!!document.querySelector('.sad-quick-form'),
        status:document.querySelector('.sad-app-message')?.textContent||''};
      })()`});
      const v=result.result?.value;
      assert(v?.card&&v?.next&&v?.tryButton&&v?.leadForm&&v.status.includes("Hands-on demo"),"Tour must lead from narration to actual fictional lead creation: "+JSON.stringify(v));
    }
    // Sub-page typography may intentionally use a system font for controls,
    // but the content should not silently fall back across the whole page.
    assert(result.unknown<result.total,route+" has no text using registered font families");
    if(route==="/"&&(width===1280||width===390)){
      const shot=await peer.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:true,fromSurface:true});
      const dir=path.join(process.cwd(),"artifacts","homepage");
      fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,"homepage-"+width+".png"),Buffer.from(shot.data,"base64"));
    }
    console.log("Browser",width,route,"elements",result.total,"unregistered",result.unknown);
   }
  }
  console.log("Real Chrome checks passed on desktop and mobile for seven routes.");
 }finally{
  if(peer)peer.close();
  browser.kill("SIGTERM");server.kill("SIGTERM");
  await delay(400);
  fs.rmSync(profile,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
