# StudioTasker VPS recurring jobs (installation template)

These are **templates only**. They have not been installed or enabled on a user's VPS.

## Prerequisites
- Confirm the actual checkout path, `npm` path and systemd service account; templates assume `/srv/studiotasker`, `/usr/bin/npm` and `studiotasker`.
- Apply migrations, configure a restricted runtime `DATABASE_URL`, and set `MAINTENANCE_DATABASE_URL` using a dedicated low-privilege maintenance role. Do not put migration/admin secrets in scheduled services.
- Store secrets in `/etc/studiotasker/studiotasker.env` owned by root with mode 0600, not in GitHub.
- Create `/var/backups/studiotasker` owned by the `studiotasker` service user (mode 0700). Ensure `BACKUP_OUTPUT_DIR` points there and a strong separate `BACKUP_PASSPHRASE` is available.

## Installation after staging tests
Copy the six unit files into `/etc/systemd/system/` with sudo, adapt paths and user, then:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now studiotasker-mail.timer studiotasker-cleanup.timer studiotasker-backup.timer
sudo systemctl list-timers --all 'studiotasker-*'
sudo systemctl start studiotasker-mail.service
sudo journalctl -u studiotasker-mail.service -n 30 --no-pager
```

Check that verification emails and staff invitations are dispatched by `jobs:mail`. Inspect `mail_outbox` for repeated failures and set up monitoring for `attempts >= 5`.

## Backups are NOT complete until off-site copied and restored
The scheduled `backup:create` produces an encrypted local artifact. Configure a separately authenticated off-site destination, verify retention and alerting, and perform a disposable-database restore rehearsal. Do not put restore secrets in command-line arguments. Do not turn on live sales until this succeeds.

## Reverse proxy
Only trust the client's IP when Nginx overwrites the header:
```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
```
After verifying the actual proxy configuration, set `TRUST_PROXY_IP_HEADERS=true`, `LAUNCH_TRUSTED_PROXY_VERIFIED=true`, and a 32+ character `LOGIN_RATE_HMAC_KEY`. Never copy incoming client-controlled X-Forwarded-For into legal or throttling evidence.

The backup, email and cleanup timers are independent of Vercel; merely merging the units into GitHub does not schedule or activate them.

## Off-site encrypted backup upload
The backup service now runs `backup:offsite` after a successful `backup:create`. Install and configure `rclone` on the VPS, with `RCLONE_CONFIG` pointing to a service-account-readable 0600 configuration file and `RCLONE_REMOTE_DIR=remote:path`. The command uses `rclone copyto --immutable` to avoid overwriting prior archives, then verifies remote object length. A cloud-side retention policy and periodic isolated restore from the off-site archive are still required. Never commit remote tokens/keys or the backup passphrase.
