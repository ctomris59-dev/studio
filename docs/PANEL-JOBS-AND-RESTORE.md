# Panel scheduled jobs and isolated restore – deployment checklist

This document is a **configuration guide, not proof that jobs exist on the live server**.
The repository does not have access to your hosting panel, cron configuration, live
Paddle/SMTP secrets, or off-site backup storage. A technician with authorized panel
access must perform and record these checks.

## In the hosting panel

Create non-overlapping scheduled jobs in the application or designated worker
container, with a persistent volume for encrypted backups and a separate private
rclone config mount. Do not put credentials in GitHub, Docker build arguments,
or command-line URLs.

| Job | Suggested schedule | Command from `/app` | Required secrets |
|---|---|---|---|
| Account e-mail worker | Every 5 minutes | `npm run jobs:mail` | `DATABASE_URL` and SMTP credentials |
| Expired-link and trusted-device cleanup | Daily | `npm run jobs:cleanup` | `MAINTENANCE_DATABASE_URL` |
| Encrypted database snapshot | Daily at a quiet hour | `npm run backup:create` | `BACKUP_DATABASE_URL`, `BACKUP_PASSPHRASE`, `BACKUP_OUTPUT_DIR` |
| Off-site copy after backup succeeds | After successful snapshot | `npm run backup:offsite` | `BACKUP_OUTPUT_DIR`, `RCLONE_CONFIG`, `RCLONE_REMOTE_DIR` |

Configure the panel to **record execution outcomes and notify the operator on any
failure**. Make sure jobs do not start concurrently or use auto-deleting ephemeral
containers as their only backup storage. Off-site backups require a different
storage failure domain and a documented retention/pruning policy, respecting legal
holds. The existing off-site script validates the new remote object's size; that
check is **not** a full restore test.

The runtime container contains `pg_dump` and `rclone`. Before writing an archive,
the backup worker verifies that the installed `pg_dump` major is at least as new
as the PostgreSQL server major. If versions are incompatible, upgrade the image
and re-test. The healthcheck uses `/` for process liveness; keep `/api/health`
as a separate database-readiness monitor.

## Mandatory isolated restore drill

1. Record which encrypted snapshot was backed up and copied off site, including
   time, object name, size and checksum. Download the copy from the **remote**
   provider, not from the original local directory.
2. Provision a brand-new **empty**, non-production PostgreSQL database and
   dedicated administrative restore credential. Never use the live database URL.
3. Run `BACKUP_PASSPHRASE=... npm run backup:verify -- /path/to/file.rdbk` with
   secrets supplied securely by the panel.
4. Set `RESTORE_DATABASE_URL` to the disposable empty database and
   `ALLOW_EMPTY_DATABASE_RESTORE=YES_I_CONFIRMED`. Execute
   `npm run backup:restore -- /path/to/file.rdbk`.
5. Check that restored table counts, foreign keys, schemas, class bookings,
   account memberships and tenant isolation match an approved checklist.
   Record the drill's result and delete the isolated restored personal data.
6. Save timestamped evidence outside the production service and schedule
   recurring restore drills. Only mark backup recovery **VERIFIED** after a
   successful end-to-end drill.

The job definitions, off-site credentials, storage, actual restore outcomes,
SMTP and Paddle validation cannot be established by a GitHub commit.
