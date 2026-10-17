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
for(const action of ["doctor","backup-debug","configure","prepare","backup","deploy"])
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
assert(source.includes('BACKUP_ENV_FILE="$file" bash -c'),
 "Backup diagnosis must source the root wrapper's trusted shell env.");
assert(source.includes('BACKUP_ENV_FILE="$envfile" bash -c'),
 "Encrypted-backup authentication must use the exact shell-sourced passphrase.");
assert(!source.includes('node --env-file="$file" - <<'),
 "Shell-format backup variables cannot be parsed reliably as dotenv.");
assert(source.includes('staged_backup(){')&&source.includes('staged_backup\\n local old rollback'),
 "Deployment must use prepared-release encrypted backup, not the old live script.");
assert(source.includes('exec node "$TARGET_DIR/scripts/backup-postgres.cjs"'),
 "Before schema migrations, use vetted prepared-release pg_dump code.");
assert(source.includes('exec node "$TARGET_DIR/scripts/verify-backup.cjs" "$BACKUP_FILE"'),
 "Prepared encrypted backup must be authenticated before deployment.");
assert(source.includes('BACKUP_OUTPUT_DIR" = "$EXPECTED_BACKUP_DIR"'),
 "Prepared backup may only write into the verified backup folder.");
assert(source.includes('systemctl start "$BACKUP_SERVICE"'),
 "The scheduled systemd backup must be tested again after new code starts.");
assert(!source.includes('systemctl start "$BACKUP_SERVICE" || stop "Backup service failed. Nothing was deployed."'),
 "Do not run the unpatched live backup code before deployment.");

assert(!source.includes('else printf \'%s\\n\' "$LIVE/.env.production"'),
 "Must not silently fall back to app env for root-wrapper backups.");

// Execute the EXACT Node pre-deploy gate extracted from the shell script.
const deployBlock=source.match(/deploy\(\)\{[\s\S]*?node --env-file="\$LIVE\/\.env\.production" - <<'NODE'\n([\s\S]*?)\nNODE/);
assert(deployBlock,"Production deployment preflight gate must be present.");
const valid={
 AUTH_ALLOW_REGISTRATION:"false",
 BILLING_ALLOW_LOCAL_TEST:"false",
 BILLING_ALLOW_SANDBOX_TEST:"false",
 PADDLE_ENV:"sandbox",NEXT_PUBLIC_PADDLE_ENV:"sandbox",
 LAUNCH_PADDLE_ACCOUNT_APPROVED:"false",
 MIGRATION_DATABASE_URL:"postgresql://example.invalid/no-connection-is-made"
};
function preflight(overrides={}){
 return spawnSync(process.execPath,["-e",deployBlock[1]],{
  env:{...process.env,...valid,...overrides},
  encoding:"utf8",timeout:5000
 });
}
assert.equal(preflight().status,0,"Sandbox mode must permit code releases during Live approval.");
for(const [label,overrides] of Object.entries({
 "sandbox test events enabled":{BILLING_ALLOW_SANDBOX_TEST:"true"},
 "local test events enabled":{BILLING_ALLOW_LOCAL_TEST:"true"},
 "public registration enabled":{AUTH_ALLOW_REGISTRATION:"true"},
 "client/server mismatch":{NEXT_PUBLIC_PADDLE_ENV:"production"},
 "false Live approval claim":{LAUNCH_PADDLE_ACCOUNT_APPROVED:"true"},
 "unsupported Paddle environment":{PADDLE_ENV:"unknown"},
 "missing migration role":{MIGRATION_DATABASE_URL:""}
})){
 assert.notEqual(preflight(overrides).status,0,label+" must fail closed.");
}
const production={
 PADDLE_ENV:"production",NEXT_PUBLIC_PADDLE_ENV:"production",
 NEXT_PUBLIC_PADDLE_CLIENT_TOKEN:"live_ci_client_123456",
 PADDLE_API_KEY:"CI_FAKE_KEY",
 PADDLE_WEBHOOK_SECRET:"CI_FAKE_SECRET",
 PADDLE_MONTHLY_PRICE_ID:"pri_"+"a".repeat(26),
 PADDLE_ANNUAL_PRICE_ID:"pri_"+"b".repeat(26)
};
assert.equal(preflight(production).status,0,
 "Fully configured Production mode must allow code release with signup OFF.");
assert.notEqual(preflight({...production,NEXT_PUBLIC_PADDLE_CLIENT_TOKEN:"test_ci_wrong"}).status,0,
 "Sandbox token in production must fail closed.");
assert.notEqual(preflight({...production,AUTH_ALLOW_REGISTRATION:"true"}).status,0,
 "Live key presence must never bypass public registration gate.");

console.log("VPS assistant checks passed: Bash syntax, CLI help, sandbox-first and production fail-closed flags, backup and staged release guards.");
