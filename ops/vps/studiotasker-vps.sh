#!/usr/bin/env bash
# StudioTasker Contabo VPS assistant. Secrets are entered ONLY on the VPS.
set -Eeuo pipefail
umask 077
LIVE=/var/www/studio
RELEASES=/var/www/studio-releases
OWNER=studiotasker
SERVICE=studiotasker
BACKUP_SERVICE=studiotasker-backup.service
BACKUP_DIR=/var/backups/studiotasker
say(){ printf '\n[StudioTasker] %s\n' "$*"; }
stop(){ printf '\n[STOP] %s\n' "$*" >&2; exit 1; }
app(){ runuser -u "$OWNER" -- "$@"; }
gitapp(){ app git -C "$LIVE" "$@"; }
check(){
 [ "$(id -u)" -eq 0 ] || stop "Run as root. Never send root passwords to ChatGPT."
 [ -d "$LIVE/.git" ] && [ -f "$LIVE/.env.production" ] || stop "Unexpected live directory."
 [ "$(stat -c '%U' "$LIVE")" = "$OWNER" ] || stop "Unexpected live folder owner."
 command -v node >/dev/null && command -v npm >/dev/null && command -v pm2 >/dev/null ||
   stop "Required Node, npm or PM2 is missing."
}
clean(){
 [ -z "$(gitapp status --porcelain)" ] || stop "Live checkout has local changes. Refusing automatic overwrite."
 [ "$(gitapp branch --show-current)" = main ] || stop "Live checkout must be on main."
 gitapp merge-base --is-ancestor HEAD origin/main || stop "Live branch diverges from origin/main."
}
backup_env(){
 local f
 f="$(systemctl show "$BACKUP_SERVICE" -p EnvironmentFiles --value 2>/dev/null | awk '{print $1}')" || true
 if [ -n "$f" ] && [ -f "$f" ]; then printf '%s\n' "$f"
 elif [ -f /etc/studiotasker/studiotasker.env ]; then printf '%s\n' /etc/studiotasker/studiotasker.env
 else printf '%s\n' "$LIVE/.env.production"; fi
}
doctor(){
 check
 say "Read-only deployment inspection"
 gitapp status -sb
 echo "Live commit: $(gitapp rev-parse --short HEAD)"
 echo "Fetched commit: $(gitapp rev-parse --short origin/main)"
 app pm2 show "$SERVICE" | grep -E 'status|exec cwd|script path' || true
 node --env-file="$LIVE/.env.production" - <<'NODE'
for(const k of ["PUBLIC_APP_ORIGIN","PADDLE_ENV","NEXT_PUBLIC_PADDLE_ENV",
 "AUTH_ALLOW_REGISTRATION","BILLING_ENFORCEMENT"])console.log(k+"="+(process.env[k]||"(unset)"));
for(const k of ["PADDLE_API_KEY","NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
 "PADDLE_WEBHOOK_SECRET","MIGRATION_DATABASE_URL"])
 console.log(k+": "+(process.env[k]?"set":"MISSING")+" (redacted)");
NODE
 say "Backup schedule and latest files"
 systemctl is-failed "$BACKUP_SERVICE" || true
 systemctl list-timers --all studiotasker-backup.timer --no-pager || true
 if [ -d "$BACKUP_DIR" ]; then
   find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.rdbk' -printf '%TY-%Tm-%Td %TH:%TM %s bytes %f\n' | sort -r | head -5
 fi
 say "Read-only diagnosis completed; no live changes."
}
backup_debug(){
 check
 local file
 file="$(backup_env)"
 [ -r "$file" ] || stop "Backup configuration not readable."
 say "Reproduce pg_dump error without writing a backup; database remains unchanged."
 node --env-file="$file" - <<'NODE'
const {spawn}=require("node:child_process");
let url;
try{url=new URL(process.env.BACKUP_DATABASE_URL);
 if(!["postgres:","postgresql:"].includes(url.protocol))throw Error();}
catch{console.error("BACKUP_DATABASE_URL missing or invalid.");process.exit(2);}
const env={...process.env,PGHOST:decodeURIComponent(url.hostname),PGPORT:url.port||"5432",
 PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),
 PGDATABASE:decodeURIComponent(url.pathname.slice(1))};
if(url.searchParams.get("sslmode"))env.PGSSLMODE=url.searchParams.get("sslmode");
const p=spawn("pg_dump",["--format=custom","--no-owner","--no-privileges","--file=/dev/null"],
 {env,stdio:["ignore","ignore","pipe"]});
let err="";
p.stderr.on("data",b=>{err+=String(b).slice(0,12000-err.length)});
p.on("error",e=>{console.error("pg_dump failed to start:",e.message);process.exitCode=1});
p.on("close",code=>{
 const safe=err.replace(/postgres(?:ql)?:\/\/[^\s]+/gi,"[DATABASE_URL_REDACTED]")
  .replace(/(?:password|PGPASSWORD)=\S+/gi,"[PASSWORD_REDACTED]");
 console.log("pg_dump exit code:",code);
 console.log(safe.slice(0,4500)||"(no error details)");
 if(code!==0)process.exitCode=1;
});
NODE
}
prepare(){
 check; clean
 say "Fetching changes as $OWNER, without changing the running checkout"
 gitapp fetch origin main
 clean
 local revision short dest
 revision="$(gitapp rev-parse origin/main)"
 short="$(gitapp rev-parse --short origin/main)"
 install -d -m 700 -o "$OWNER" -g "$OWNER" "$RELEASES"
 dest="$RELEASES/prepared-$short-$(date -u +%Y%m%dT%H%M%S)-$$"
 install -d -m 700 -o "$OWNER" -g "$OWNER" "$dest"
 gitapp archive "$revision" | app tar -xf - -C "$dest"
 install -o "$OWNER" -g "$OWNER" -m 600 "$LIVE/.env.production" "$dest/.env.production"
 printf '%s\n' "$revision" > "$dest/.revision"
 sha256sum "$LIVE/.env.production" | cut -d' ' -f1 > "$dest/.env-digest"
 say "Running pinned installation, tests and Next.js build ONLY in $dest"
 app bash -c 'cd "$1" && npm ci --no-audit && npm run test:paddle:simulation && npm run test:release && npm run build' _ "$dest"
 [ -f "$dest/.next/BUILD_ID" ] || stop "Build output missing."
 printf '%s\n' "$dest" > "$RELEASES/ready"
 say "Prepared $short. Live application and database were not changed."
}
configure(){
 check
 [ -t 0 ] || stop "An interactive SSH terminal is required for entering Live secrets."
 say "First create a LIVE webhook destination for https://www.studiotasker.com/api/billing/paddle-webhook"
 say "Enter secrets on the VPS. They will NOT be printed or sent to this chat."
 local key token secret
 read -r -s -p 'Paddle LIVE API key: ' key </dev/tty; printf '\n'
 read -r -s -p 'Paddle LIVE client token: ' token </dev/tty; printf '\n'
 read -r -s -p 'Paddle LIVE webhook secret: ' secret </dev/tty; printf '\n'
 export ST_KEY="$key" ST_TOKEN="$token" ST_SECRET="$secret"
 unset key token secret
 node - "$LIVE/.env.production" <<'NODE'
const fs=require("node:fs"),path=require("node:path");
const file=process.argv[2],st=fs.lstatSync(file);
if(!st.isFile()||st.isSymbolicLink())throw Error("Refusing unsafe env file");
const key=process.env.ST_KEY||"",token=process.env.ST_TOKEN||"",secret=process.env.ST_SECRET||"";
if(!/^pdl_live_apikey_[A-Za-z0-9_-]{8,}$/.test(key))throw Error("Not a Paddle LIVE API key");
if(!/^live_[A-Za-z0-9_-]{8,}$/.test(token))throw Error("Not a Paddle LIVE client token");
if(secret.length<12||/[\r\n]/.test(secret))throw Error("Invalid webhook secret");
const changes={
 PADDLE_ENV:"production",NEXT_PUBLIC_PADDLE_ENV:"production",
 PUBLIC_APP_ORIGIN:"https://www.studiotasker.com",PADDLE_API_KEY:key,
 NEXT_PUBLIC_PADDLE_CLIENT_TOKEN:token,PADDLE_WEBHOOK_SECRET:secret,
 PADDLE_MONTHLY_PRICE_ID:"pri_01m54wbt936zv5sagz4drkka22",
 PADDLE_ANNUAL_PRICE_ID:"pri_01m54wcrjxf15hdh9eq4jnqmap",
 BILLING_ENFORCEMENT:"required",BILLING_ALLOW_LOCAL_TEST:"false",
 BILLING_ALLOW_SANDBOX_TEST:"false",AUTH_ALLOW_REGISTRATION:"false",
 LAUNCH_PADDLE_ACCOUNT_APPROVED:"false",
 LAUNCH_LEGAL_REVIEW_CONFIRMED:"false",LAUNCH_TAX_REVIEW_CONFIRMED:"false"
};
const lines=fs.readFileSync(file,"utf8").split(/\r?\n/),found=new Set();
const edited=lines.map(line=>{
 const m=/^([A-Z][A-Z0-9_]*)=/.exec(line);
 if(!m||!(m[1] in changes))return line;
 if(found.has(m[1]))return "";
 found.add(m[1]);return m[1]+"="+JSON.stringify(changes[m[1]]);
});
for(const [k,v] of Object.entries(changes))if(!found.has(k))edited.push(k+"="+JSON.stringify(v));
const stamp=new Date().toISOString().replace(/[:.]/g,"-"),saved=file+".before-live-"+stamp;
fs.copyFileSync(file,saved,fs.constants.COPYFILE_EXCL);
fs.chownSync(saved,st.uid,st.gid);fs.chmodSync(saved,0o600);
const tmp=path.join(path.dirname(file),".paddle-live-"+process.pid);
try{
 fs.writeFileSync(tmp,edited.join("\n"),{flag:"wx",mode:0o600});
 fs.chownSync(tmp,st.uid,st.gid);fs.renameSync(tmp,file);
 console.log("Live settings saved locally (0600). Signup and approval flags remain disabled.");
 console.log("Prepare/build again before restarting: Next.js embeds public Paddle token during build.");
}catch(e){try{fs.unlinkSync(tmp)}catch{}throw e}
NODE
 unset ST_KEY ST_TOKEN ST_SECRET
}
ready_release(){
 [ -f "$RELEASES/ready" ] || stop "No verified build; run prepare."
 TARGET="$(cat "$RELEASES/ready")"
 case "$TARGET" in "$RELEASES"/prepared-*) ;; *) stop "Invalid prepared release path.";; esac
 [ -d "$TARGET" ] && [ ! -L "$TARGET" ] && [ -f "$TARGET/.next/BUILD_ID" ] ||
   stop "Prepared release invalid."
 [ -d "$TARGET/node_modules" ] || stop "Prepared release dependencies missing."
 [ "$(cat "$TARGET/.revision")" = "$(gitapp rev-parse origin/main)" ] ||
   stop "Repository revision changed. Prepare again."
 [ "$(cat "$TARGET/.env-digest")" = "$(sha256sum "$LIVE/.env.production" | cut -d' ' -f1)" ] ||
   stop "Live env changed since build. Prepare again."
}
deploy(){
 check; clean; ready_release
 [ "$(gitapp rev-parse HEAD)" != "$(cat "$TARGET/.revision")" ] || stop "Already on the target revision."
 app pm2 show "$SERVICE" | grep -Fq "exec cwd" || stop "PM2 service not found."
 app pm2 show "$SERVICE" | grep -Fq "$LIVE" || stop "PM2 cwd differs from expected live directory."
 node --env-file="$LIVE/.env.production" - <<'NODE'
const e=process.env;
if(e.AUTH_ALLOW_REGISTRATION!=="false")throw Error("Public registration must remain disabled");
if(e.PADDLE_ENV!=="production"||e.NEXT_PUBLIC_PADDLE_ENV!=="production"||
 !/^live_/.test(e.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN||"")||!e.PADDLE_WEBHOOK_SECRET)
 throw Error("Paddle LIVE integration not fully configured");
if(!e.MIGRATION_DATABASE_URL)throw Error("MIGRATION_DATABASE_URL missing");
NODE
 say "Creating FRESH backup. Stop immediately if service fails."
 systemctl start "$BACKUP_SERVICE" || stop "Backup service failed. Nothing was deployed."
 local fresh envfile old rollback confirm failed=0
 fresh="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'studiotasker-*.rdbk' -mmin -30 -printf '%T@ %p\n' |
   sort -nr | head -1 | cut -d' ' -f2-)"
 [ -n "$fresh" ] && [ -f "$fresh" ] || stop "Fresh encrypted backup not found."
 envfile="$(backup_env)"
 node --env-file="$envfile" "$TARGET/scripts/verify-backup.cjs" "$fresh" ||
   stop "Backup authentication failed. Deploy refused."
 say "Database migrations are FORWARD-ONLY. Code rollback will not reverse schema changes."
 printf 'Type DEPLOY-STUDIOTASKER to approve migration and brief restart: '
 read -r confirm </dev/tty
 [ "$confirm" = DEPLOY-STUDIOTASKER ] || stop "Cancelled, no migrations or service modifications."
 app bash -c 'cd "$1" && node --env-file=.env.production db/migrate.cjs' _ "$TARGET"
 old="$(gitapp rev-parse HEAD)"
 rollback="$RELEASES/rollback-$(date -u +%Y%m%dT%H%M%S)-$$"
 install -d -m 700 -o "$OWNER" -g "$OWNER" "$rollback"
 printf '%s\n' "$old" > "$rollback/old-commit"
 say "Switching only PM2 application $SERVICE"
 app pm2 stop "$SERVICE"
 gitapp merge --ff-only origin/main || failed=1
 if [ "$failed" -eq 0 ]; then
   mv "$LIVE/.next" "$rollback/.next" || failed=1
   mv "$LIVE/node_modules" "$rollback/node_modules" || failed=1
   mv "$TARGET/.next" "$LIVE/.next" || failed=1
   mv "$TARGET/node_modules" "$LIVE/node_modules" || failed=1
 fi
 if [ "$failed" -eq 0 ]; then
   app pm2 restart "$SERVICE" --update-env || failed=1
   if [ "$failed" -eq 0 ]; then
     local i
     for i in $(seq 1 20); do
       if curl -fsS --max-time 3 http://127.0.0.1:3001/api/health >/dev/null 2>&1; then break; fi
       sleep 2
     done
     curl -fsS --max-time 5 http://127.0.0.1:3001/api/health >/dev/null || failed=1
   fi
 fi
 if [ "$failed" -ne 0 ]; then
   say "Deployment error. Attempting automatic APPLICATION rollback."
   app pm2 stop "$SERVICE" || true
   if [ -d "$rollback/.next" ]; then rm -rf "$LIVE/.next"; mv "$rollback/.next" "$LIVE/.next"; fi
   if [ -d "$rollback/node_modules" ]; then rm -rf "$LIVE/node_modules"; mv "$rollback/node_modules" "$LIVE/node_modules"; fi
   gitapp reset --hard "$old" || true
   app pm2 restart "$SERVICE" --update-env || true
   stop "Previous app files restored where possible. Database migrations remain applied."
 fi
 say "Deployment complete and production /api/health returned HTTP 200."
 say "Real payment signup is STILL disabled pending Paddle approval and release verification."
}
help(){
 cat <<'EOF'
StudioTasker Contabo VPS assistant (run as root):
  doctor       Read-only status, no changes
  backup-debug Read-only pg_dump error with fuller diagnostic
  configure    Prompt privately for LIVE Paddle keys and webhook secret
  prepare      Fetch, test, build new version in an ISOLATED folder
  deploy       Fresh backup + migration + app upgrade + health + rollback on failure
No command opens registration, claims Paddle approval or deletes databases.
EOF
}
case "$#" in 0) help; exit 0;; esac
case "$1" in
 doctor) doctor;; backup-debug) backup_debug;; configure) configure;;
 prepare) prepare;; deploy) deploy;; --help|-h|help) help;;
 *) help; exit 2;;
esac
