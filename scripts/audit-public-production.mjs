// Read-only checks of PUBLIC StudioTasker production endpoints.
// Never supplies credentials, submits forms, modifies services or follows arbitrary redirects.
const checks = [];
const errors = [];
const origin = "https://www.studiotasker.com";
async function probe(name, url, method="GET") {
  const item={name};
  try {
    const r=await fetch(url,{method,redirect:"manual",signal:AbortSignal.timeout(12000),
      headers:{"user-agent":"StudioTasker-readonly-production-preflight/1.0"}});
    item.status=r.status;
    item.location=r.headers.get("location");
    item.hsts=Boolean(r.headers.get("strict-transport-security"));
    item.csp=Boolean(r.headers.get("content-security-policy"));
    item.nosniff=(r.headers.get("x-content-type-options")||"").toLowerCase()==="nosniff";
    item.cacheControl=r.headers.get("cache-control")||"(absent)";
    item.cspStrict=(r.headers.get("content-security-policy")||"").includes("script-src-attr 'none'");
    if(method==="GET") {
      if(name==="securityTxt"){const text=(await r.text()).slice(0,4000);item.contact=text.includes("Contact:");item.expiry=text.includes("Expires:");}
      else if(name==="robots"){const text=(await r.text()).slice(0,3000);item.sitemap=text.includes("Sitemap:");}
      else await r.body?.cancel();
    }
  }catch(e){item.error=e instanceof Error?e.name+": "+e.message.slice(0,90):"Network error";}
  checks.push(item);return item;
}
const root=await probe("wwwHome",origin+"/");
const apex=await probe("apexRedirect","https://studiotasker.com/","HEAD");
const http=await probe("httpRedirect","http://www.studiotasker.com/","HEAD");
const health=await probe("dbHealth",origin+"/api/health");
const security=await probe("securityTxt",origin+"/.well-known/security.txt");
const robots=await probe("robots",origin+"/robots.txt");
for(const item of checks){const safe={...item};delete safe.cacheControl;console.log(JSON.stringify(safe));if(item.error)errors.push(item.name+": "+item.error);}
function requireCondition(ok,message){if(!ok)errors.push(message);}
requireCondition(root.status===200,"www homepage must return 200");
requireCondition(root.hsts,"www HTTPS must send HSTS");
requireCondition(root.csp,"www HTTPS must send Content-Security-Policy");
requireCondition(root.cspStrict,"www CSP must block inline script attributes");
requireCondition(root.nosniff,"www must advertise X-Content-Type-Options: nosniff");
requireCondition([301,308].includes(apex.status)&&/^https:\/\/www\.studiotasker\.com(?:\/|$)/.test(apex.location||""),"apex canonical redirect must point to www");
requireCondition(apex.hsts,"apex HTTPS redirect must include HSTS");
requireCondition([301,308].includes(http.status)&&/^https:\/\/www\.studiotasker\.com(?:\/|$)/.test(http.location||""),"HTTP must redirect to canonical HTTPS");
requireCondition(health.status===200,"production database health must return 200");
requireCondition(security.status===200&&security.contact&&security.expiry,"security.txt must contain contact and expiry");
requireCondition(robots.status===200&&robots.sitemap,"robots.txt must contain a Sitemap declaration");
console.log("\nPUBLIC CONTABO EDGE AUDIT: "+(errors.length?"FAIL / NEEDS PRODUCTION REVIEW":"PASS"));
for(const e of errors)console.error("BLOCKER: "+e);
console.log("This checks public endpoints only. It does NOT verify VPS process ownership, DB tenant data, actual backups, SMTP, Paddle, or legal approval.");
if(errors.length)process.exitCode=1;
