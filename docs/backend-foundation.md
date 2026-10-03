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
- CI with PostgreSQL 16 service, schema migrations, cryptographic tests and independent tenant/RLS tests.

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
