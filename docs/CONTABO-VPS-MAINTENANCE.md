# StudioTasker: Contabo VPS maintenance assistant

This file describes the **existing** Contabo installation, not a generic one-click deployment. It deliberately refuses unsafe actions rather than trying to repair permissions or guess credentials.

## Installed environment (verify before execution)

- Root can SSH to the VPS, but the application processes run as Linux user `studiotasker`.
- Running production service: PM2 `studiotasker`, working directory `/var/www/studio`, HTTP at 127.0.0.1:3001.
- Other PM2 applications `studiotasker-test` and `studiotasker-paddle-stage` must **never** be restarted by this helper.
- The live checkout was on commit `ed1d32d` on October 17, 2026, while `origin/main` had already advanced hundreds of commits.
- Root systemd unit `studiotasker-backup.service` was failing `pg_dump`. The real PostgreSQL error was truncated from its logs; this must be repaired before application deploy.
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

**doctor** reads git/PM2, backup schedule, selected non-secret env flags; it never edits data. **backup-debug** invokes `pg_dump` against the backup configuration with output discarded, showing the beginning of the PostgreSQL error instead of the original lossy tail. It may read the entire database, so run it once during a quiet period and never post credentials or unredacted connection URLs.

**configure** requires the Paddle LIVE API key, LIVE client token, and *LIVE webhook destination secret* through hidden prompts on the SSH terminal. Create the Live webhook in the Paddle Live panel first:

`https://www.studiotasker.com/api/billing/paddle-webhook`

Subscribe to: `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.trialing`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.canceled`. These are the event types parsed in `lib/server/billing.ts`.

The tool atomically updates `/var/www/studio/.env.production` preserving ownership and restrictive permissions, and stores a root-readable backup of the old env. It uses LIVE price IDs for `$39.90/month` and `$406.80/year`. **configure** keeps `AUTH_ALLOW_REGISTRATION=false` and all Paddle/legal/tax approval flags false. Do not mark the account approved until it actually is.

**prepare** fetches GitHub, requires a clean, non-divergent live `main`, archives the selected commit into `/var/www/studio-releases`, copies the current env there, installs dependencies and runs Paddle regression, release-gate regression and Next.js build. It does not change live code, database, or any PM2 service. Run **prepare again after configure** because the client-side Paddle token is embedded at build time.

**deploy** is intentionally guarded. It requires: clean checkout, verified staged build matching current env and git commit, Live flags with signup disabled, migration URL, healthy and freshly executed encrypted backup service, authenticated latest backup, and a typed confirmation. It then applies forward-only migrations, stops only the live PM2 app, fast-forwards the live code and switches tested build artifacts, restarts the app and verifies `/api/health`. On failure, it attempts code/process rollback; **it cannot roll back database migrations**. Keep a verified, independently recoverable offsite backup and rehearse a disposable restore before processing real customer data.

If any precondition is missing, it stops. Do **not** disable checks or substitute the older October 11 backups for a new verified backup.

## Paddle go-live remains a separate approval gate

The tool never enables public registration and never sets a review confirmation to `true`. After Paddle approves the live account/domain, complete legal/tax review, SMTP verification, trusted-proxy/Turnstile checks, database role and migration checks, offsite encrypted backups and tested restoration. Run `npm run launch:verify` in the production checkout before enabling paid registration. Production receipt/payout reconciliation and a live checkout still need actual evidence; a successful Sandbox simulation cannot substitute for them.

## Troubleshooting

- `backup-debug` returns a PostgreSQL error: repair the exact reported cause. For RLS-protected tables, ensure your dedicated backup role can dump all tenant data *without* giving ordinary runtime credentials BYPASSRLS or superuser rights. Do not weaken tenant policies to make backups pass.
- `doctor` reports a dirty checkout: inspect and preserve edits; do not auto-reset.
- `prepare` fails: live site stays up.
- `deploy` stops on backup: no migration, Git update, or PM2 restart has occurred.
- `deploy` stops after migrations: migration changes are forward-only and require a database recovery plan. Consult logs before retrying.
