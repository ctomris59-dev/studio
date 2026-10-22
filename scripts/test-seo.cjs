const assert=require("node:assert/strict");
const fs=require("node:fs");

const read=p=>fs.readFileSync(p,"utf8");
const layout=read("app/layout.tsx");
const globalCSS=read("app/globals.css");
assert(!globalCSS.includes("fonts.googleapis.com")&&!layout.includes("next/font/google")&&layout.includes("@fontsource/barlow-condensed")&&layout.includes("@fontsource/ibm-plex-mono")&&layout.includes("@fontsource/source-sans-3"),"Fonts must be bundled without build-time Google requests.");
const faces=[...layout.matchAll(/import "@fontsource\/[^"]+\.css";/g)].map(x=>x[0]);
assert.equal(faces.length,8,"Do not reintroduce all 18 static font weights into the critical CSS.");
for(const face of [
 "@fontsource/source-sans-3/400.css",
 "@fontsource/source-sans-3/600.css",
 "@fontsource/source-sans-3/700.css",
 "@fontsource/barlow-condensed/400.css",
 "@fontsource/barlow-condensed/700.css",
 "@fontsource/barlow-condensed/800.css",
 "@fontsource/barlow-condensed/600-italic.css",
 "@fontsource/ibm-plex-mono/400.css"
]){
 assert(layout.includes('import "'+face+'";'),"Missing reviewed primary font face: "+face);
}
for(const variable of ["--studio-sans","--studio-heading","--studio-mono"]){
 assert(globalCSS.includes(variable+":"),"Font token not declared: "+variable);
}
assert(layout.includes("new URL(SITE_URL)"),"Canonical metadata must use the same hostname as schema URLs.");
const robots=read("app/robots.ts");
const sitemap=read("app/sitemap.ts");
const next=read("next.config.mjs");
const home=read("app/page.tsx");
const landing=read("app/studio-type-landing.tsx");
const legalLayout=read("app/legal/layout.tsx");
const legalHub=read("app/legal/page.tsx");
const security=read("app/legal/security/page.tsx");
const demoLayout=read("app/app-demo/layout.tsx");
const bookingLayout=read("app/book/preview/layout.tsx");
const checkout=read("app/checkout/page.tsx");
const workspace=read("app/workspace/page.tsx");
const llms=read("app/llms.txt/route.ts");
const notFound=read("app/not-found.tsx");

assert(!layout.includes("alternates:"),"Root layout must not force one canonical URL onto child pages.");
assert(home.includes('alternates:{canonical:"/"}'),"Homepage must self-canonicalize.");

// The consolidated photo-and-product hero is the first section, with one crawlable H1.
const main=home.indexOf('<main id="main-content"');
const hero=home.indexOf('section className="ed-hero ed-hero-consolidated"');
const tour=home.indexOf('section className="ed-product-tour"');
const features=home.indexOf('section className="ed-capabilities"');
const studioTypes=home.indexOf('section className="ed-studio-types"');
const pricing=home.indexOf('section className="ed-pricing ed-pricing-refined"');
assert(main>=0&&main<hero&&hero<tour&&tour<features&&features<studioTypes&&studioTypes<pricing,
 "Consolidated hero, product walkthrough, key features, studio types and pricing must follow the intended discovery journey.");
assert(home.includes('priority fetchPriority="high"'),"Above-the-fold hero image must be loaded at high priority.");
assert(home.includes('src="https://images.pexels.com/photos/2294400/pexels-photo-2294400.jpeg"'),"Keep the existing first-party-approved Pexels photo.");
assert(home.includes('<h1 id="main-heading">Less admin.<br/><em>More movement.</em></h1>'),"Primary value proposition must be a crawlable H1.");
assert.equal((home.match(/<h1\b/g)||[]).length,1,"Homepage must define exactly one H1.");
assert(!home.includes("ed-impact-band"),"Two consecutive hero sections unnecessarily delay product discovery.");
assert(home.includes('href="/start?plan=monthly"')&&home.includes('href="/start?plan=annual"'),"Both billing choices must be accessible from pricing.");
assert(home.includes("$39.90")&&home.includes("$33.90")&&home.includes("$406.80"),"Pricing details must remain explicit.");
assert(next.includes('hostname:"images.pexels.com"')&&next.includes('pathname:"/photos/2294400/pexels-photo-2294400.jpeg"'),"Restrict image optimization to the approved photograph path.");

assert(["OAI-SearchBot","ChatGPT-User","GPTBot","PerplexityBot","Google-Extended"].every(x=>robots.includes('userAgent:"'+x+'"')),"Search/AI crawler policy must be explicit.");
assert(!robots.includes("/_next"),"Rendering assets must remain crawlable.");
assert(robots.includes('disallow:["/api/"]'),"API endpoints should not consume crawler traffic.");
for(const p of ["/app-demo","/workspace","/checkout","/book/preview","/legal/terms","/legal/privacy","/legal/dpa","/legal/cookies","/legal/subprocessors","/legal/cancellation","/legal/turkiye-privacy"]){
 assert(!sitemap.includes('"'+p+'"'),"Noindex/technical route must stay out of sitemap: "+p);
}
for(const p of ["/about","/pilates-studio-software","/yoga-studio-software","/barre-studio-software","/dance-studio-software","/indoor-cycling-software","/fitness-gym-software","/boutique-fitness-software","/compare","/start","/contact","/legal","/legal/security"]){
 assert(sitemap.includes('"'+p+'"'),"Canonical public route missing from sitemap: "+p);
}
assert(next.includes('permanent:true')&&next.includes('value:"studiotasker.com"')&&next.includes("https://www.studiotasker.com/:path*"),"Canonical hostname must permanently redirect to www.");
assert(next.includes('{source:"/demo",destination:"/app-demo",permanent:true}')&&next.includes('{source:"/today",destination:"/app-demo?tour=1",permanent:true}'),"Legacy marketing routes must use permanent redirects.");
assert(next.includes('X-Robots-Tag')&&next.includes("noindex, nofollow, noarchive"),"Technical routes need HTTP-level noindex protection.");
assert(demoLayout.includes("index:false")&&bookingLayout.includes("index:false")&&checkout.includes("index:false")&&workspace.includes("index:false"),"Private/demo/checkout routes must be noindex in raw HTML metadata.");
assert(legalLayout.includes("index:false")&&legalHub.includes("index:true")&&security.includes("index:true"),"Legal detail documents must be noindex while trust hub/security remain indexable.");
assert(!home.startsWith('"use client"')&&!landing.startsWith('"use client"'),"Critical acquisition content must be server-rendered in initial HTML.");
assert(home.includes("<JsonLd")&&landing.includes("<JsonLd")&&landing.includes("breadcrumbJsonLd"),"Structured data must be server-rendered.");
assert(read("lib/seo.ts").includes('"@type":"Organization"')&&read("lib/seo.ts").includes('"@type":"Service"')&&!read("lib/seo.ts").includes('"@type":"AggregateRating"'),"Entity schema must identify the organization/service without invented reviews.");
assert(landing.includes("studioTypeLinks.filter")&&home.includes("/yoga-studio-software"),"Vertical pages must have crawlable internal links and must be discoverable from home.");
assert(llms.includes("# StudioTasker")&&llms.includes("sitemap.xml"),"AI-readable product summary must expose canonical facts and discovery URLs.");
assert(notFound.includes("404 / PAGE NOT FOUND"),"Unknown URLs must have a dedicated real 404 experience.");
assert(home.includes('href="/about"'),"About/entity page must be linked from the public site.");

const verticals=[
 ["app/pilates-studio-software/page.tsx","/pilates-studio-software"],
 ["app/yoga-studio-software/page.tsx","/yoga-studio-software"],
 ["app/barre-studio-software/page.tsx","/barre-studio-software"],
 ["app/dance-studio-software/page.tsx","/dance-studio-software"],
 ["app/indoor-cycling-software/page.tsx","/indoor-cycling-software"],
 ["app/fitness-gym-software/page.tsx","/fitness-gym-software"],
 ["app/boutique-fitness-software/page.tsx","/boutique-fitness-software"]
];
for(const [file,path] of verticals){
 const c=read(file);
 assert(c.includes('alternates:{canonical:"'+path+'"}'),"Vertical must self-canonicalize: "+path);
 assert(c.includes('path:"'+path+'"'),"Vertical breadcrumb URL must match canonical: "+path);
}
console.log("SEO static regression checks passed: crawl, canonical, indexability, redirects, SSR, structured data and internal links.");
