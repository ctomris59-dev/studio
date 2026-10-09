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
 const home=await get("/");
 assert.equal(home.status,200);
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