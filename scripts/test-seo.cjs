const assert=require("node:assert/strict");
const fs=require("node:fs");

const read=p=>fs.readFileSync(p,"utf8");
const layout=read("app/layout.tsx");
const robots=read("app/robots.ts");
const sitemap=read("app/sitemap.ts");
const next=read("next.config.ts");
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
assert(robots.includes('userAgent:"OAI-SearchBot"')&&robots.includes('userAgent:"PerplexityBot"')&&robots.includes('userAgent:"Google-Extended"'),"Search/AI crawler policy must be explicit.");
assert(!robots.includes("/_next"),"Rendering assets must remain crawlable.");
assert(robots.includes('disallow:["/api/"]'),"API endpoints should not consume crawler traffic.");
for(const p of ["/app-demo","/workspace","/checkout","/book/preview","/legal/terms","/legal/privacy","/legal/dpa","/legal/cookies","/legal/subprocessors","/legal/cancellation","/legal/turkiye-privacy"]){
 assert(!sitemap.includes('"'+p+'"'),"Noindex/technical route must stay out of sitemap: "+p);
}
for(const p of ["/pilates-studio-software","/yoga-studio-software","/barre-studio-software","/dance-studio-software","/indoor-cycling-software","/fitness-gym-software","/boutique-fitness-software","/compare","/start","/contact","/legal","/legal/security"]){
 assert(sitemap.includes('"'+p+'"'),"Canonical public route missing from sitemap: "+p);
}
assert(next.includes('permanent:true')&&next.includes('value:"studiotasker.com"')&&next.includes("https://www.studiotasker.com/:path*"),"Canonical hostname must permanently redirect to www.");
assert(next.includes('{source:"/demo",destination:"/app-demo",permanent:true}')&&next.includes('{source:"/today",destination:"/app-demo?tour=1",permanent:true}'),"Legacy marketing routes must use permanent redirects.");
assert(next.includes('X-Robots-Tag')&&next.includes("noindex, nofollow, noarchive"),"Technical routes need HTTP-level noindex protection.");
assert(demoLayout.includes("index:false")&&bookingLayout.includes("index:false")&&checkout.includes("index:false")&&workspace.includes("index:false"),"Private/demo/checkout routes must be noindex in raw HTML metadata.");
assert(legalLayout.includes("index:false")&&legalHub.includes("index:true")&&security.includes("index:true"),"Legal detail documents must be noindex while trust hub/security remain indexable.");
assert(!home.startsWith('"use client"')&&!landing.startsWith('"use client"'),"Critical acquisition content must be server-rendered in initial HTML.");
assert(home.includes("<JsonLd")&&landing.includes("<JsonLd")&&landing.includes("breadcrumbJsonLd"),"Structured data must be server-rendered.");
assert(landing.includes("studioTypeLinks.filter")&&home.includes("/yoga-studio-software"),"Vertical pages must have crawlable internal links and must be discoverable from home.");
assert(llms.includes("# StudioTasker")&&llms.includes("sitemap.xml"),"AI-readable product summary must expose canonical facts and discovery URLs.");
assert(notFound.includes("404 / PAGE NOT FOUND"),"Unknown URLs must have a dedicated real 404 experience.");

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
