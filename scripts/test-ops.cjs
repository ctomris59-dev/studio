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
