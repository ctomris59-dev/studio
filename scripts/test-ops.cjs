"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
for(const name of ["studiotasker-mail","studiotasker-cleanup","studiotasker-backup"]){
 const service=fs.readFileSync("deploy/systemd/"+name+".service","utf8");
 const timer=fs.readFileSync("deploy/systemd/"+name+".timer","utf8");
 assert(service.includes("User=studiotasker")&&service.includes("EnvironmentFile="));
 assert(service.includes("NoNewPrivileges=true")&&service.includes("UMask=0077"));
 assert(timer.includes("Persistent=true")&&timer.includes("Unit="+name+".service"));
}
const readme=fs.readFileSync("deploy/systemd/README.md","utf8");
assert(readme.includes("off-site")&&readme.includes("TRUST_PROXY_IP_HEADERS"));
console.log("Systemd mail, cleanup and encrypted-backup job templates passed basic checks.");

assert(fs.readFileSync("Dockerfile","utf8").includes('CMD ["node","node_modules/next/dist/bin/next","start"]'),"Docker must launch Next.js directly as PID 1.");

const lock=JSON.parse(fs.readFileSync("package-lock.json","utf8"));
const manifest=JSON.parse(fs.readFileSync("package.json","utf8"));
assert.equal(manifest.overrides.uuid,"11.1.1","ExcelJS dev UUID must resolve to a reviewed, patched CommonJS release.");
assert.equal(lock.packages["node_modules/uuid"].version,"11.1.1");
const docker=fs.readFileSync("Dockerfile","utf8");
assert(docker.includes("alpine3.24")&&docker.includes("1.3.2-r1"),"Base image and zlib mitigation should not silently regress.");
assert(docker.includes("rm -rf /usr/local/lib/node_modules/npm"),"Production image must not include npm's vulnerable bundled dependencies.");


// TLS scanner exercises the HTTPS apex redirect, not only the canonical www
// response. HSTS on www cannot protect the first apex 308 by itself.
const nginx=fs.readFileSync("ops/nginx/studiotasker-seo.conf.example","utf8");
const apex=nginx.match(/server \{\s*listen 443 ssl http2;\s*server_name studiotasker\.com;([\s\S]*?)\n\}/);
assert(apex,"The HTTPS apex redirect vhost must exist and advertise HTTP/2.");
assert(/add_header Strict-Transport-Security "max-age=31536000" always;/.test(apex[1]),
 "HTTPS apex redirect must include HSTS even on HTTP 308 responses.");
const apexDirectives=apex[1].split("\n").filter(line=>!line.trim().startsWith("#")).join("\n");
assert(!apexDirectives.includes("includeSubDomains")&&!apexDirectives.includes("; preload"),
 "Do not roll out cross-subdomain/preload HSTS without explicit approval.");
assert(/return 308 https:\/\/www\.studiotasker\.com\$request_uri;/.test(apex[1]),
 "Apex must keep the canonical HTTPS 308 redirect.");
const canonical=nginx.match(/server \{\s*listen 443 ssl http2;\s*server_name www\.studiotasker\.com;([\s\S]*?)\n\}/);
assert(canonical&&canonical[1].includes("proxy_pass http://127.0.0.1:3000;"),
 "Canonical TLS vhost must preserve its application proxy.");
assert(!canonical[1].includes("add_header Strict-Transport-Security"),
 "Do not duplicate upstream HSTS from Next.js on canonical www.");
console.log("Nginx example HSTS on apex HTTPS redirect and ALPN configuration guards passed.");


// Security advisories reviewed 2026-10-17: do not force a potentially
// breaking Next 16 migration when 15.5.27 already carries the 15.x fixes.
// CVE-2025-59472 requires PPR/cacheComponents AND NEXT_PRIVATE_MINIMAL_MODE=1.
// CVE-2026-27980 is fixed on 15.x since 15.5.14.
// CVE-2026-94543 is fixed in 15.5.27.
// CVE-2026-94544 affects only Next 16.3.0 through 16.3.7.
const nextVersion=manifest.dependencies.next;
assert.equal(nextVersion,"15.5.27","Change the reviewed Next.js version only as a tested and approved migration.");
assert.equal(lock.packages["node_modules/next"].version,nextVersion,
 "The locked Next.js version must match the reviewed patched package.");
const nextConfig=fs.readFileSync("next.config.mjs","utf8");
assert(!/experimental\\.ppr|\\bppr\\s*:|\\bcacheComponents\\s*:|\\buseCache\\s*:/.test(nextConfig),
 "Do not enable PPR or Cache Components without explicit security assessment.");
for(const file of ["Dockerfile",".github/workflows/build.yml"]){
 const value=fs.readFileSync(file,"utf8");
 assert(!/NEXT_PRIVATE_MINIMAL_MODE\\s*=\\s*1/.test(value),
  "Production build must not activate Next.js minimal mode without review.");
}
assert(docker.includes("3.5.8-r0")&&docker.includes("libcrypto3 libssl3"),
 "Alpine runtime image must reject pre-fix OpenSSL libraries.");
const action=fs.readFileSync(".github/workflows/build.yml","utf8");
assert(action.includes('test "$(apk version -t "$library_version" "3.5.8-r0")" != "<"'),
 "CI must verify the installed OpenSSL libraries against their patched version.");
console.log("Reviewed Next.js advisory exposure and patched Alpine OpenSSL image guards.");
