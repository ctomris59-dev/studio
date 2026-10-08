# Three-report audit remediation

This work is prepared on a review branch, not an authorization to enable public registration.

## Safety and deployment
- Apply migration 017 to a staging PostgreSQL DB before production. Confirm $406.80 annual legal acceptances work.
- Runtime DATABASE_URL must use a non-superuser, NO BYPASSRLS, non-owner role. Migration credentials must be separate. The app checks runtime role on first transaction.
- Set TRUST_PROXY_IP_HEADERS=true only if the reverse proxy overwrites X-Real-IP with the trusted $remote_addr. Never trust forwarded-for client input.
- Pass NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENV and NEXT_PUBLIC_SITE_URL as Docker build args. Never pass private billing or database credentials to the image build.
- On a single VPS, localhost PostgreSQL may be used without network TLS; remote DB transport must be encrypted and validated.
- Schedule supervised mail delivery, retention cleanup and encrypted offsite backup. Verify recovery by restoring to an isolated database.
- Keep registration disabled until verified production role, Paddle sandbox, SMTP delivery, backup restore, legal data and customer workflows pass.
