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
