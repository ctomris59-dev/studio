# Audit follow-up: Security, staff access, and operational hardening

## Scope
The three independent audit reports remain the reference. This follow-up is **not a production launch approval**. Work is isolated on PR #17 pending CI and review.

## Implemented in GitHub
- Site-wide CSP, HSTS, referrer and anti-frame security headers. This is a compatibility baseline, not a nonce-based strict CSP.
- New scrypt v2 hashes, verification of historical v1 hashes, transparent hash upgrades on successful sign-in, and dummy password verification for unknown accounts.
- Optional hashed, distributed per-IP login throttling based on a verified reverse-proxy-supplied X-Real-IP. The old per-email limit remains.
- Trusted contact form SMTP throttling: per IP with a global fallback, using the same distributed hashed counter table.
- Owner-only invitations for **new staff accounts** with expiring single-use links, a scoped studio role, secure password creation and outbox delivery.
- Nodemailer 10.0.13 with matching package lock and a no-network sendMail test.
- PostgreSQL runtime refuses privileged roles, ownership of protected tenant tables or missing/disabled FORCE RLS.
- Dynamic example class dates in the customer booking preview; remote Pexels homepage image replaced with a repo-owned AVIF via Next Image.
- Class editing can retain/change primary and substitute instructors rather than silently clearing staff metadata.
- Contact form links to Privacy Policy.
- Mail, retention and encrypted-backup systemd units and timers, **as configuration templates only**.

## Deployment gates and limitations
- Migration 020 creates `login_ip_attempts`; migration 021 creates `staff_invitations` and extends mail template checks. Staging migration and cross-tenant tests must complete before production migration.
- VPS Nginx must overwrite both X-Real-IP and X-Forwarded-For with the actual immediate remote address, and proxy trust must be independently verified before setting `TRUST_PROXY_IP_HEADERS` and `LAUNCH_TRUSTED_PROXY_VERIFIED` to true. Generate a secret 32+ character `LOGIN_RATE_HMAC_KEY`.
- Staff invites deliberately reject email addresses that already belong to an account. Multi-studio accounts need a separately designed account-switching system.
- The staff roster (teaching schedule records) is separate from workspace login permissions.
- Mail worker templates are not a substitute for a running service. Measure real deliverability, lost mail retries, and outbox alerting.
- Backups remain local until off-site copy and an isolated restore rehearsal are implemented.
- CSP still uses unsafe-inline for Next.js hydration; nonce-based CSP is future work.
- UI typography/contrast audit, local font hosting and retired design system cleanup are not complete.
- True public member self-booking and broader data retention/deletion policy are not implemented.
- Production credentials, tax/legal/operator data, Paddle live billing, SMTP and migrations must be verified in the destination environment.

## Regression gate
Check the latest PR GitHub Actions **Build and CRM regression** workflow. It runs migrations against isolated PostgreSQL, tenant isolation, role tests, API flows, UI contracts, package smoke tests, backup tests, type checking, the production build and SEO HTTP checks. Do not merge while a run is red or pending.
