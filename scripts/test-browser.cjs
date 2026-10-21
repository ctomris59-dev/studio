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
     const annual=document.querySelector(".ed-annual-compact");
     const annualText=annual?.querySelector("span");
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
      monthlyPlan:solidContrast(".editorial .ed-impact-price-monthly"),
      yearlyPlan:solidContrast(".editorial .ed-impact-price-annual"),
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
      forgot.click();
      await new Promise(resolve=>setTimeout(resolve,300));
      const trust=document.querySelector('.rd-trust-device input[type="checkbox"]');
      const trustText=document.querySelector('.rd-trust-device > span');
      const c=trust?.getBoundingClientRect(),t=trustText?.getBoundingClientRect();
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
    if(route==="/"&&width===1280){
     for(const [label,ratio] of Object.entries(result.firstScreenContrast||{})){
      assert(ratio!==null&&ratio>=4.5,
       "Homepage solid-color text fails WCAG AA contrast: "+label+" ratio="+ratio);
     }
     const photo=await peer.send("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:`(async()=>{
      const img=document.querySelector(".ed-impact-card > img");
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
    if(route==="/"){
     assert(result.heroTop!==null&&result.heroTop<1000,"Primary H1 must appear before pricing.");
     assert(result.annualContrast!==null&&result.annualContrast>=4.5,"Annual CTA text must meet WCAG AA contrast, got "+result.annualContrast);
     if(width<=1200){assert(result.menuVisible&&result.menuLinks>=7,"Tablet/mobile nav missing at "+width+"px");assert(result.closesOnEscape,"Escape must close the main navigation");}
    }
    // Sub-page typography may intentionally use a system font for controls,
    // but the content should not silently fall back across the whole page.
    assert(result.unknown<result.total,route+" has no text using registered font families");
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
