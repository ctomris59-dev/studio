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
assert(!apex[1].includes("includeSubDomains")&&!apex[1].includes("; preload"),
 "Do not roll out cross-subdomain/preload HSTS without explicit approval.");
assert(/return 308 https:\/\/www\.studiotasker\.com\$request_uri;/.test(apex[1]),
 "Apex must keep the canonical HTTPS 308 redirect.");
const canonical=nginx.match(/server \{\s*listen 443 ssl http2;\s*server_name www\.studiotasker\.com;([\s\S]*?)\n\}/);
assert(canonical&&canonical[1].includes("proxy_pass http://127.0.0.1:3000;"),
 "Canonical TLS vhost must preserve its application proxy.");
assert(!canonical[1].includes("add_header Strict-Transport-Security"),
 "Do not duplicate upstream HSTS from Next.js on canonical www.");
console.log("Nginx example HSTS on apex HTTPS redirect and ALPN configuration guards passed.");
