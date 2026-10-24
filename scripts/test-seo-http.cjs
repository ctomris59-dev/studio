const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const port=3192;
const base="http://127.0.0.1:"+port;
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p",String(port)],{env:{...process.env,PORT:String(port)},stdio:["ignore","pipe","pipe"]});
let logs=""; child.stdout.on("data",d=>logs+=d); child.stderr.on("data",d=>logs+=d);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(){for(let i=0;i<50;i++){try{const r=await fetch(base+"/",{redirect:"manual"});if(r.status===200)return}catch{} await sleep(300)} throw new Error("SEO HTTP test server did not start.\n"+logs)}
async function get(path){const r=await fetch(base+path,{redirect:"manual"});return {status:r.status,headers:r.headers,text:await r.text()}}
function canonical(html,url){const tags=html.match(/<link\b[^>]*>/gi)||[];return tags.some(tag=>/\brel="canonical"/i.test(tag)&&tag.includes('href="'+url+'"'))}
(async()=>{try{
 await wait();
 const start=await get("/start");
 const annualStart=await get("/start?plan=annual");
 assert.equal(start.status,200);
 assert.equal(annualStart.status,200);
 assert(start.text.includes("$406.80")&&annualStart.text.includes("$406.80"),
  "Pricing cards must remain pre-rendered and indexable.");
 assert((start.headers.get("cache-control")||"").includes("no-store"),
  "/start must never cache HTML containing one-time CSP nonces.");
 const home=await get("/");
 assert.equal(home.status,200);
 const hero=home.text.indexOf('ed-hero-consolidated');
 const tour=home.text.indexOf('id="product-tour"');
 assert(hero>=0&&tour>hero,"The combined photo/product hero must precede the walkthrough.");
 assert(home.text.includes('pexels-photo-2294400.jpeg'),"Hero photograph must appear in initial HTML.");
 const heroImage=(home.text.match(/<img\b[^>]*>/gi)||[]).find(tag=>tag.includes("pexels-photo-2294400.jpeg"))||"";
 assert(heroImage,"LCP hero photo must be visible in server HTML.");
 assert(/fetchpriority="high"/i.test(heroImage),"LCP image must be high priority.");
 assert(!/loading="lazy"/i.test(heroImage),"LCP image must not be lazy-loaded.");
 const homeH1s=home.text.match(/<h1\b/g)||[];
 assert.equal(homeH1s.length,1,"Homepage must have one H1.");
 assert(home.text.includes('id="main-heading"')&&home.text.includes("Less admin."),"Hero benefit headline must be crawlable.");
 assert(home.text.includes('$39.90')&&home.text.includes('$406.80'),"Both plan prices must be crawlable.");
 assert(home.text.includes('id="features"')&&home.text.includes('Bookings &amp; waitlists'),"Key owner features must be crawlable.");

 // Production Next.js must not expose HMR/dev-overlay endpoints or runtimes.
 for(const signature of ["/_next/webpack-hmr","__nextjs_original-stack-frame","react-refresh","webpackHotUpdate"]){
  assert(!home.text.includes(signature),"Production HTML contains development/HMR indicator: "+signature);
 }
 const hmr=await get("/_next/webpack-hmr");
 assert.notEqual(hmr.status,101,"Production must not expose a WebSocket hot-reload endpoint.");
 assert(!/text\/event-stream/i.test(hmr.headers.get("content-type")||""),"HMR event stream exposed in production.");
 assert((home.headers.get("content-security-policy")||"").includes("script-src-attr 'none'"),"Production must block inline handler attributes.");

 assert(canonical(home.text,"https://www.studiotasker.com/")||canonical(home.text,"https://www.studiotasker.com"),"Home raw HTML must contain self-canonical.");
 assert(home.text.includes('"Organization"')&&home.text.includes('"Service"')&&home.text.includes("application/ld+json"),"Home entity JSON-LD missing.");
 assert(home.text.includes('href="/yoga-studio-software"'),"Server HTML vertical links missing.");
 assert(home.text.includes('href="/legal/privacy"'),"Home footer must expose a directly discoverable Privacy Policy.");
 const legalHub=await get("/legal");
 assert.equal(legalHub.status,200,"Legal index must remain available.");
 assert(legalHub.text.includes("Privacy Policy")&&!legalHub.text.includes("KVKK Privacy Notice"),"Global legal index must not prominently display a country-specific privacy card.");
 const privacy=await get("/legal/privacy");
 assert.equal(privacy.status,200,"Global Privacy Policy must remain public.");
 assert(privacy.text.includes("Regional privacy information")&&privacy.text.includes('href="/legal/turkiye-privacy"'),"The global policy must link directly to applicable regional notices.");
 const regional=await get("/legal/turkiye-privacy");
 assert.equal(regional.status,200,"Existing regional notice must remain available to people who need it.");
 assert(regional.text.includes("KVKK Article 11 rights"),"Regional notice must retain its statutory rights information.");
 assert(home.text.includes('href="/legal/security"'),"Home footer must expose the security notice.");
 const securityTxt=await get("/.well-known/security.txt");
 assert.equal(securityTxt.status,200,"RFC 9116 security.txt missing");
 assert(securityTxt.text.includes("Contact: mailto:support@studiotasker.com")&&securityTxt.text.includes("Expires: 2027-10-09T00:00:00Z"),"Security contact/expiry invalid.");
 assert((home.headers.get("reporting-endpoints")||"").includes("studio-csp="),"Marketing CSP report endpoint header missing.");
 // A public page must receive its own CSP nonce and matching SSR script
 // attributes on every request. This prevents reusing a cached nonce.
 const again=await get("/");
 const scriptDirective=policy=>policy.split(";").map(s=>s.trim()).find(s=>s.startsWith("script-src "))||"";
 const publicCsp=home.headers.get("content-security-policy")||"";
 const publicCsp2=again.headers.get("content-security-policy")||"";
 const nonce=/'nonce-([^']+)'/.exec(scriptDirective(publicCsp))?.[1];
 const nonce2=/'nonce-([^']+)'/.exec(scriptDirective(publicCsp2))?.[1];
 assert(nonce&&nonce2&&nonce!==nonce2,"Public HTML must receive distinct unpredictable script nonces.");
 assert(home.text.includes('nonce="'+nonce+'"')&&again.text.includes('nonce="'+nonce2+'"'),
  "Server-side Next scripts must carry the actual response CSP nonce.");
 assert(!scriptDirective(publicCsp).includes("'unsafe-inline'")&&
  !scriptDirective(publicCsp).includes("data:")&&
  !/\\bhttps:\\s*(?:;|$)/.test(scriptDirective(publicCsp))&&
  !scriptDirective(publicCsp).includes("https://*.paddle.com"),
  "script-src must not include inline, data, wildcard scheme or broad script hosts.");
 assert(publicCsp.includes("object-src 'none'"),"Public CSP must deny embedded objects.");
 assert((home.headers.get("cache-control")||"").includes("no-store"),
  "HTML with per-request nonces must never be cached.");
 for(const route of ["/start","/about","/legal/privacy","/app-demo","/checkout"]){
  const response=await get(route);
  const directive=scriptDirective(response.headers.get("content-security-policy")||"");
  assert(/'nonce-[^']+'/.test(directive),"Missing script nonce on "+route);
  assert(!directive.includes("'unsafe-inline'")&&!directive.includes("data:"),"Unsafe script policy on "+route);
  assert((response.headers.get("cache-control")||"").includes("no-store"),
   "Nonce page must not be cached: "+route);
 }


 const about=await get("/about"); assert.equal(about.status,200); assert(canonical(about.text,"https://www.studiotasker.com/about"),"About canonical missing.");
 const yoga=await get("/yoga-studio-software");
 assert.equal(yoga.status,200);
 assert(canonical(yoga.text,"https://www.studiotasker.com/yoga-studio-software"),"Yoga canonical missing.");
 assert(yoga.text.includes("BreadcrumbList")&&yoga.text.includes("FAQPage"),"Vertical JSON-LD missing.");
 for(const path of ["/app-demo","/checkout","/book/preview","/workspace","/legal/terms"]){const r=await get(path);assert(r.text.toLowerCase().includes("noindex"),"noindex missing: "+path)}
 const security=await get("/legal/security");
 assert.equal(security.status,200);
 assert(!security.text.toLowerCase().includes('content="noindex'),"Security page unexpectedly noindex.");
 const today=await get("/today"); assert.equal(today.status,308); assert((today.headers.get("location")||"").includes("/app-demo?tour=1"));
 const demo=await get("/demo"); assert.equal(demo.status,308); assert((demo.headers.get("location")||"").includes("/app-demo"));
 const missing=await get("/this-url-does-not-exist-seo-test"); assert.equal(missing.status,404);
 const sitemap=await get("/sitemap.xml"); assert.equal(sitemap.status,200); assert(sitemap.text.includes("/yoga-studio-software")); assert(!sitemap.text.includes("/app-demo")&&!sitemap.text.includes("/workspace")&&!sitemap.text.includes("/checkout"));
 const robots=await get("/robots.txt"); assert.equal(robots.status,200); assert(["OAI-SearchBot","ChatGPT-User","GPTBot","PerplexityBot"].every(x=>robots.text.includes(x))); assert(!robots.text.includes("Disallow: /_next"));
 const llms=await get("/llms.txt"); assert.equal(llms.status,200); assert(llms.text.includes("# StudioTasker")&&llms.text.includes("USD 39.90/month"));
 console.log("SEO HTTP regression checks passed.");
}finally{child.kill("SIGTERM")}})().catch(err=>{console.error(err);child.kill("SIGTERM");process.exit(1)});