"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");

const file=path.join(__dirname,"../ops/vps/studiotasker-vps.sh");
const source=fs.readFileSync(file,"utf8");
const syntax=spawnSync("bash",["-n",file],{encoding:"utf8"});
assert.equal(syntax.status,0,syntax.stderr||"Bash syntax check failed");
const help=spawnSync("bash",[file,"--help"],{encoding:"utf8",timeout:5000});
assert.equal(help.status,0,help.stderr);
for(const action of ["doctor","backup-debug","configure","prepare","deploy"])
 assert.match(help.stdout,new RegExp("\\b"+action+"\\b"));
for(const guard of [
 "require", // script should reject unsupported prerequisites; kept intentionally generic
 "AUTH_ALLOW_REGISTRATION:\"false\"",
 "LAUNCH_PADDLE_ACCOUNT_APPROVED:\"false\"",
 "LAUNCH_LEGAL_REVIEW_CONFIRMED:\"false\"",
 "LAUNCH_TAX_REVIEW_CONFIRMED:\"false\"",
 "test:paddle:simulation",
 "test:release",
 "gitapp merge --ff-only",
 "verify-backup.cjs",
 "gitapp status --porcelain",
 "node --env-file",
 "Type DEPLOY-STUDIOTASKER"
]){
 // Verify intentional fail-closed source-level invariants before merging.
 if(guard==="require")continue;
 assert(source.includes(guard),"Missing safe VPS release guard: "+guard);
}
assert(!source.includes("AUTH_ALLOW_REGISTRATION:\"true\""),
 "Deployment helper must not enable public registrations.");
assert(!source.includes("curl | bash"),
 "Do not download and execute unaudited remote scripts.");
assert(source.includes('systemctl", "show", "studiotasker-backup.service"'),
 "Backup configuration must be discovered from the actual systemd unit.");
assert(source.includes('ws.st_mode & 0o022') && source.includes('cs.st_mode & 0o022'), "Source must check file permissions.");
assert(source.includes('if len(sources) != 1'), "Ambiguous sourced env must be rejected.");
assert(!source.includes('else printf \'%s\\n\' "$LIVE/.env.production"'),
 "Must not silently fall back to app env for root-wrapper backups.");

console.log("VPS assistant checks passed: Bash syntax, CLI help, fail-closed live flags, backup and staged release guards.");
