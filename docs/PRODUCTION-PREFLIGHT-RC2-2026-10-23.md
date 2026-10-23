# StudioTasker — RC2 Contabo production preflight (read-only)

Candidate (pinned): `4f1f032653cb50366a2e4fc3a7c7c597ad830e57`. No deploy, DB migration, PM2 restart, or merge to `main` is authorized by this document.

## Already independently verified
- GitHub CI build/regression and Docker runtime on the pinned RC2: successful.
- This audit PR runs a GitHub-hosted, credential-free, **GET/HEAD-only** live-domain probe; review the new workflow's logs.
- The production script `ops/vps/studiotasker-vps.sh doctor` is a read-only source-code option. It has not been executed on the live VPS from this conversation.

## Production checks that require Contabo SSH/panel access
Run only while logged into the **existing authorized VPS**. Do not paste passwords, database URLs, environment files, or raw system logs into ChatGPT.

```bash
# Use the previously reviewed root-only VPS helper only when it is already verified.
bash /root/studiotasker-vps.sh doctor

# Read-only process and operating-system information.
date -u
uptime
df -h / /var/www /var/backups 2>/dev/null || true
free -m
systemctl show studiotasker-backup.service -p ActiveState -p SubState -p Result -p ExecMainStatus --no-pager
systemctl list-timers --all --no-pager | grep -E 'studiotasker|certbot' || true
systemctl is-enabled certbot.timer || true
nginx -t
ss -ltn | grep -E '(:80|:443|:3001|:5432) ' || true
curl --silent --show-error --output /dev/null --write-out 'local health %{http_code}\n' --max-time 10 http://127.0.0.1:3001/api/health
```

Read-only checks must also establish these facts with **redacted evidence**:

| Gate | Required proof | Rule |
| --- | --- | --- |
| Deployed checkout | Actual PM2 `studiotasker` path, immutable git SHA, clean tree | Never assume live `main` matches RC2 |
| Payment / registration flags | `AUTH_ALLOW_REGISTRATION=false`, `BILLING_ALLOW_LOCAL_TEST=false`, `BILLING_ALLOW_SANDBOX_TEST=false` | Until explicit commercial approval |
| PostgreSQL least privilege | Runtime role NOT superuser/BYPASSRLS; forced RLS present on every tenant table | Query with authorized role, return boolean/counts only |
| Migration plan | Migration 025, forward-only; migration dry-run against disposable DB with existing data | Earlier RC1 note "no migrations" is stale |
| Privileged migrator | `/root/studiotasker-db-secrets` owned by root with 0600; admin URL absent from PM2/.env.production | Never paste or export the migration password |
| Production backup | Latest local encrypted backup, completed job, authenticatable, within 48 h | File presence alone is not proof |
| Off-site disaster recovery | Fetch remote encrypted copy and restore into **separate empty database**; verify rows/FKs/RLS | Must not point restore at production |
| SMTP | Authenticated TLS connection AND successful mailbox delivery with real account email | Do not expose email password |
| DNS / Nginx / TLS | Both hosts, redirects, HSTS/CSP, Nginx config, renewals | Public GH edge check covers only the internet-facing part |
| Turnstile + proxy | Site verify and hostname binding, request-IP trust and rate controls | Only when commercial registration is enabled |
| Paddle production | Actual account/site approval, configured monthly/yearly Live IDs and signed live webhook, owner-observed checkout | Sandbox CI cannot prove Live approval |
| Operator/legal/tax | Actual operator/provider details, DPA/privacy and Turkish accounting review | Never set attestation flags based on CI |
| Email/cleanup/backup jobs | Worker/timers installed and recently successful, separate staged/test PM2 apps untouched | Existing services are not proof of scheduled tasks |

## Security discrepancy requiring explicit handling

`scripts/verify-launch.cjs` currently checks `MIGRATION_DATABASE_URL` from the process environment, while the Contabo security runbook explicitly forbids placing this privileged URL in the persistent application or saved PM2 environment. Do **not** weaken this boundary to make the check green. Execute migration verification only in a privileged **short-lived root-owned process** using the dedicated migrator secret, and keep the everyday runtime free of that credential. Commercial registration must remain disabled until a compatible audited launch verification path exists.

## Release decision

All code checks can pass while live production checks remain unverified. **Do not merge or deploy** solely on CI evidence; the real VPS, backup and live Paddle/SMTP controls must be documented independently. Do not change `main` before a human go/no-go.
