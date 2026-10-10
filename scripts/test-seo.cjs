const assert=require("node:assert/strict");
const fs=require("node:fs");

const read=p=>fs.readFileSync(p,"utf8");
const layout=read("app/layout.tsx");
const globalCSS=read("app/globals.css");
assert(!globalCSS.includes("fonts.googleapis.com")&&!layout.includes("next/font/google")&&layout.includes("@fontsource/barlow-condensed")&&layout.includes("@fontsource/ibm-plex-mono")&&layout.includes("@fontsource/source-sans-3"),"Fonts must be bundled without build-time Google requests.");
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

// The current photograph-led acquisition banner, not the secondary product
// preview, must be the first <main> section and only top-level heading.
const banner=home.indexOf('section className="ed-impact-band ed-impact-band-first"');
const preview=home.indexOf('section className="ed-hero"');
const studioTypes=home.indexOf('section className="ed-studio-types"');
const main=home.indexOf('<main id="main-content"');
assert(main>=0&&main<banner&&banner<preview&&preview<studioTypes,
 "The photo/pricing banner must appear first, before the secondary product preview and studio types.");
assert(home.includes('src="https://images.pexels.com/photos/2294400/pexels-photo-2294400.jpeg"'),
 "The new user-selected Pexels photograph must be the banner image.");
assert(home.includes('<h1 id="impact-band-title">')&&home.includes('<h2 id="main-heading">'),
 "Use a single first-screen H1 while keeping the former product hero as a secondary H2.");
assert.equal((home.match(/<h1\\b/g)||[]).length,1,"Homepage should define exactly one H1.");
assert(home.includes('href="/start?plan=monthly" className="ed-impact-price-option')&&
 home.includes('href="/start?plan=annual" className="ed-impact-price-option'),
 "Both pricing links must remain on the top banner.");
assert(next.includes('hostname:"images.pexels.com"')&&
 next.includes('pathname:"/photos/2294400/pexels-photo-2294400.jpeg"'),
 "Next image optimizer must allow only the exact new image path.");

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
