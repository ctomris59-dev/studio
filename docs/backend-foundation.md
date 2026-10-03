# ReformDesk — Portable Secure Backend: Increment 1

**State:** Work in progress, not a production-ready multi-user CRM. No paid server, external database, billing provider, or domain was created. Existing browser-only `/demo` is unchanged.

## What exists now
- PostgreSQL versioned migrations under `db/migrations`, with tenant columns and composite cross-studio foreign keys.
- Postgres FORCE ROW LEVEL SECURITY on CRM tables. Runtime role is non-superuser, non-owner and cannot bypass RLS.
- First-party scrypt password hashing, randomly generated 256-bit session tokens stored only as SHA-256 hashes, 14-day HttpOnly session cookies, server-side revocation.
- Durable email-based sign-in attempt limiting (5 attempts per 15 minutes), parameterized SQL and verified per-session studio/role checks.
- `/api/auth/register` (explicitly gated), `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
- First protected CRM endpoint `/api/studio/people`: read/create a minimal lead/member for owner, manager or receptionist roles.
- `/workspace` secure development UI, disabled when `DATABASE_URL` absent.
- SQL schema placeholders for subscriptions, webhook idempotency, bookings, credits, activities and follow-ups. Their **transactional server APIs are not built yet**.
- CI with PostgreSQL 16 service, schema migrations, cryptographic tests, independent tenant/RLS tests and live Next.js HTTP authentication/authorization tests.

## Local-only development (no hosting purchase)
1. Install Docker Desktop and Node.js 22.
2. `docker compose up -d`
3. `npm install`
4. Copy `.env.example` to `.env.local` (not tracked).
5. `npm run db:setup:local` (loads **MIGRATION_DATABASE_URL** from shell environment, or load .env.local explicitly with your shell; Node CLI does not automatically read Next.js .env files).
6. `npm run db:migrate`, `npm run test:db`, `npm run test:auth`, `npm run build`
7. Explicitly set `AUTH_ALLOW_REGISTRATION=true` **only on trusted local development**, then `npm run dev` and open `http://localhost:3000/workspace`.

Convenience shell example, from a private local terminal:
```sh
export MIGRATION_DATABASE_URL='postgresql://postgres:local_postgres_only@127.0.0.1:5432/reformdesk'
export DATABASE_URL='postgresql://reformdesk_app:reformdesk_dev_only@127.0.0.1:5432/reformdesk'
export AUTH_ALLOW_REGISTRATION=true
npm run db:setup:local
npm run dev
```
**Do not use these known development credentials outside localhost.**

## Production prerequisites, not yet complete
- Email verification, controlled invitation process, password reset, stronger public sign-in abuse controls, optional MFA and security review.
- Database-role grants and HTTPS/TLS settings audited for the selected host; secrets in a secure deployment secret store.
- Server-side CRUD for all CRM entities, transactional booking+waitlist+credits, double-booking and payment entitlements.
- Tenant-switch flow, role/instructor/member authorization matrix, full audit ledger, RLS policies verified across every endpoint.
- Backups + test restores, GDPR deletion/export, consent proof, emails, migrations/rollback, load tests and monitoring.
- Production billing webhooks with verified signatures, idempotency, retries, cancellation and grace-period policy.
- Genuine browser end-to-end tests and manual accessibility/usability review.

## Hosting portability
`Dockerfile` builds a standard Node 22 Next.js server image; `compose.yaml` runs LOCAL Postgres only. Provision a compatible server later and provide `DATABASE_URL` for runtime and `MIGRATION_DATABASE_URL` only to the separate migration job. Migrations live in GitHub; **actual customer records always reside in PostgreSQL and must be moved by an encrypted database backup/restore**, not a GitHub repository copy. NEVER store DB dumps or secrets in GitHub.

`db/schema.sql` is a historical un-applied proposal; **the versioned migration directory is authoritative** for new installations.

## Increment 2 — transactional bookings and explainable operator actions

The next versioned migration adds booking ledger indexes and idempotency keys. New authenticated, per-studio server endpoints:

- `GET/POST /api/studio/classes` — list and create; instructor/room conflicts serialized under a studio-specific transaction advisory lock.
- `GET/POST /api/studio/bookings` — list and reserve; a locked class session serializes capacity decisions; waitlisted members are not charged.
- `DELETE /api/studio/bookings/[id]` — cancellation and one-time refund with the first eligible waitlist member automatically promoted.
- `GET /api/studio/members`, `POST /api/studio/members/[id]/package`, `POST /api/studio/members/[id]/credits` — confirmed packages and idempotent, reasoned ledger corrections. Payment is NEVER verified or collected.
- `GET /api/studio/action-center` — deterministic evidence-based suggestions with no paid APIs or auto-sent messages.
- `GET/POST /api/studio/tasks`, `PATCH /api/studio/tasks/[id]` — manual follow-ups and outcome history.

The operational interface is in `/workspace`, not `/demo`; it is disabled on Vercel without a configured database. Existing authentication/role checks and FORCE RLS apply to every endpoint. The CI HTTP test exercises multiple studios, simultaneous booking requests and independent credit/booking audit records.

**These APIs and sample workflows are not a completed commercial system.** They lack verified payment, member self-service, email verification/invitations, actual outbound notifications, full backups/restore and an audited production security posture.

## Increment 3 — identity, billing, members and operations
- Registration is opt-in and creates an **unverified** account; a 24-hour email challenge must be consumed before login. Production SMTP is not configured and registration stays disabled by default.
- `/api/auth/verify`, `/api/auth/password/forgot`, `/api/auth/password/reset`: hashed single-use links; resetting a password revokes previous sessions.
- `/api/studio/invitations` queues a time-limited member invitation; `/api/auth/invite/accept` creates a verified member user and links them to exactly one studio member. Existing-account cross-studio joining is **not implemented**.
- `/api/member/me`, `/api/member/classes`, `/api/member/bookings`: self-service is protected by server-verified user/member identity, never a member ID supplied by the browser.
- `/api/studio/people/[id]` supports authorized contact edits and controlled archival; archive is **not permanent erasure**.
- `/api/studio/export` creates owner-only JSON export with an audit record; `/api/studio/privacy` shows archived contacts and export activity.
- `/api/billing/lemon-webhook` uses timing-safe HMAC-SHA256 signature comparison, known store/variant checks, per-studio scoping, event deduplication and monotonic provider timestamps.
- `/api/studio/subscription` can create hosted Lemon Squeezy monthly/yearly checkouts only with explicit secrets. Browser return pages never activate a license; only verified webhooks can update it. `BILLING_ENFORCEMENT=required` enforces an active, valid entitlement for studio operations. OFF by default until billing has been audited and configured.
- `scripts/process-mail.cjs` dispatches an SMTP outbox (requires explicit secure SMTP configuration), `scripts/queue-renewal-emails.cjs` generates deduplicated renewal notices. No messages sent without SMTP and a scheduled worker.
- `scripts/backup-postgres.cjs`, `scripts/verify-backup.cjs`, `scripts/restore-backup.cjs` provide authenticated AES-256-GCM encrypted custom-format PostgreSQL archives. Restore refuses a nonempty target and requires an explicit opt-in; encryption key must be backed up separately. Backups still need automated scheduling, **external off-site storage**, restore drills and retention policies.
- `/workspace` exposes a staff operational CRM and a separate restricted member portal; public `/demo` remains browser-local and separate.

### Commercial launch still BLOCKED
1. Real mail sender/domain with verified sending, deliverability and anti-abuse/captcha safeguards.
2. Actual provider account, signed test-mode event verification, checkout + cancellation + renewal reconciliation in a sandbox, billing failure policy and production entitlement tests.
3. Third-party security review, session/cookie hardening, account enumeration and abuse analysis, member identity access reviews, per-tenant rate limits.
4. Complete CRM parity: recurring classes, full history editing, attendance, safe member linking to existing accounts and real trial journeys.
5. Independent GDPR/privacy legal review, irreversible deletion/anonymization with retention exceptions, consent and retention policies.
6. Backup automation to independent storage, tested fresh-db restores, monitoring, operations guide and incident response.
7. Manual multi-device browser accessibility testing, performance testing on the chosen VPS and pilot feedback from real studio owners.

No local test credentials, temporary SMTP tokens, PII or customer card data belong in the GitHub repository.
