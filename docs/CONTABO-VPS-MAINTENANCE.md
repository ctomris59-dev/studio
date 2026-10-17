# StudioTasker: Contabo VPS maintenance assistant

This file describes the **existing** Contabo installation, not a generic one-click deployment. It deliberately refuses unsafe actions rather than trying to repair permissions or guess credentials.

## Installed environment (verify before execution)

- Root can SSH to the VPS, but the application processes run as Linux user `studiotasker`.
- Running production service: PM2 `studiotasker`, working directory `/var/www/studio`, HTTP at 127.0.0.1:3001.
- Other PM2 applications `studiotasker-test` and `studiotasker-paddle-stage` must **never** be restarted by this helper.
- The live checkout was on commit `ed1d32d` on October 17, 2026, while `origin/main` had already advanced hundreds of commits.
- Root systemd unit `studiotasker-backup.service` runs `/usr/local/sbin/studiotasker-backup.sh` (a 9-line root wrapper), which loads the actual backup credentials from its own sourced file before calling `npm`. The backup was failing `pg_dump`, and the original 400-byte log truncation hid the PostgreSQL cause. Resolve both before deployment.
- Latest encrypted `.rdbk` seen was dated October 11; **presence is not evidence of recoverability**.
- Paddle Production website/account approval was `In Review`; keep registration closed.

## Fetch the reviewed script without replacing the live code

Start an SSH session as root, then run:

```sh
runuser -u studiotasker -- git -C /var/www/studio fetch origin main &&
runuser -u studiotasker -- git -C /var/www/studio show origin/main:ops/vps/studiotasker-vps.sh > /root/studiotasker-vps.sh &&
chmod 700 /root/studiotasker-vps.sh &&
bash /root/studiotasker-vps.sh doctor
```

The script is checked out of the verified Git history into a root-only file before execution; don't run an unaudited `curl | bash` command. Review its contents if needed using `less /root/studiotasker-vps.sh`.

## Commands from the same script

```sh
bash /root/studiotasker-vps.sh doctor
bash /root/studiotasker-vps.sh backup-debug
bash /root/studiotasker-vps.sh configure
bash /root/studiotasker-vps.sh prepare
bash /root/studiotasker-vps.sh deploy
```

**doctor** reads git/PM2, backup schedule, selected non-secret env flags; it never edits data. **backup-debug** locates the root-owned `ExecStart` shell wrapper from systemd, scans it (without executing it) to find the single root-owned environment file it sources, and runs `pg_dump` with output discarded using that file's backup connection URL. It shows the beginning of the PostgreSQL error instead of the original lossy tail. Unsupported source expressions or insecure permissions cause it to stop, never guess/fall back to `.env.production`. It may read the entire database, so run it once during a quiet period and never post credentials or unredacted connection URLs. The file must contain ordinary `KEY=value` or `export KEY=value` entries; do not use shell command substitution in secret values.

**configure** is OPTIONAL until Paddle approves the merchant account. First deploy application fixes with the current `PADDLE_ENV=sandbox` + `NEXT_PUBLIC_PADDLE_ENV=sandbox`, `AUTH_ALLOW_REGISTRATION=false`, `BILLING_ALLOW_LOCAL_TEST=false` and `BILLING_ALLOW_SANDBOX_TEST=false`. Do not enter Paddle Live credentials just to upgrade site code. After approval, **configure** requires the Paddle LIVE API key, LIVE client token, and *LIVE webhook destination secret* through hidden prompts on the SSH terminal. Create the Live webhook in the Paddle Live panel first:

`https://www.studiotasker.com/api/billing/paddle-webhook`

Subscribe to: `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.trialing`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.canceled`. These are the event types parsed in `lib/server/billing.ts`.

The tool atomically updates `/var/www/studio/.env.production` preserving ownership and restrictive permissions, and stores a root-readable backup of the old env. It uses LIVE price IDs for `$39.90/month` and `$406.80/year`. **configure** keeps `AUTH_ALLOW_REGISTRATION=false` and all Paddle/legal/tax approval flags false. Do not mark the account approved until it actually is.

**prepare** fetches GitHub, requires a clean, non-divergent live `main`, archives the selected commit into `/var/www/studio-releases`, copies the current env there, installs dependencies and runs Paddle regression, release-gate regression and Next.js build. It does not change live code, database, or any PM2 service. Run **prepare again after configure** because the client-side Paddle token is embedded at build time.

**deploy** is intentionally guarded. It requires: clean checkout, verified staged build matching current env and git commit, Paddle client/server environment agreement (either Sandbox while approval is pending, or fully configured Production), signup and local/Sandbox test events disabled, migration URL, healthy and freshly executed encrypted backup service, authenticated latest backup, and a typed confirmation. It then applies forward-only migrations, stops only the live PM2 app, fast-forwards the live code and switches tested build artifacts, restarts the app and verifies `/api/health`. On failure, it attempts code/process rollback; **it cannot roll back database migrations**. Keep a verified, independently recoverable offsite backup and rehearse a disposable restore before processing real customer data.

If any precondition is missing, it stops. Do **not** disable checks or substitute the older October 11 backups for a new verified backup.

## Release sequencing: code first, Paddle later

1. While Paddle is **In Review**, keep the current Sandbox server/client flags and **do not** enable local/Sandbox test events or registration on the public website. Run `doctor`, repair the backup as diagnosed, run `prepare`, and only after verifying independent recoverability run `deploy`. This ships security/code changes without accepting payments.
2. After Paddle approval, create the live webhook destination and enter Live keys with `configure`, run `prepare` **again** so Next.js embeds the correct client token, verify the live webhook and checkout under controlled conditions, and only later pass all launch gates.

## Paddle go-live remains a separate approval gate

The tool never enables public registration and never sets a review confirmation to `true`. After Paddle approves the live account/domain, complete legal/tax review, SMTP verification, trusted-proxy/Turnstile checks, database role and migration checks, offsite encrypted backups and tested restoration. Run `npm run launch:verify` in the production checkout before enabling paid registration. Production receipt/payout reconciliation and a live checkout still need actual evidence; a successful Sandbox simulation cannot substitute for them.

## Troubleshooting

- `backup-debug` cannot discover the sourced file: inspect the local root wrapper and update the resolver to match its actual syntax. Never execute a wrapper merely to extract credentials.\n- `backup-debug` returns a PostgreSQL error: repair the exact reported cause. For RLS-protected tables, ensure your dedicated backup role can dump all tenant data *without* giving ordinary runtime credentials BYPASSRLS or superuser rights. Do not weaken tenant policies to make backups pass.
- `doctor` reports a dirty checkout: inspect and preserve edits; do not auto-reset.
- `prepare` fails: live site stays up.
- `deploy` stops on backup: no migration, Git update, or PM2 restart has occurred.
- `deploy` stops after migrations: migration changes are forward-only and require a database recovery plan. Consult logs before retrying.
