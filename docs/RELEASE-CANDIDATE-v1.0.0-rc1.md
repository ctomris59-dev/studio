# StudioTasker v1.0.0-rc1 — release acceptance and rollback plan

**Scope:** GitHub code acceptance only. This document does **not** authorize deployment or enable paid signups.

## Fixed release identity

- Release baseline before acceptance: `33aa15ed71c72fa6714d4d0f83799056466beb1b` (2026-10-21).
- RC source: the final GitHub `main` commit after the acceptance PR is merged; record the full immutable SHA in the handoff.
- `ops/vps/studiotasker-vps.sh prepare` requires an explicit `STUDIOTASKER_RELEASE_SHA` (full 40-character lowercase SHA) matching fetched `origin/main`. A newer or different main commit must **not** silently replace the already approved build. Re-review and re-run CI for any later commit.
- Lock `package-lock.json` and resolve dependencies only with `npm ci`; no dependency upgrades during RC.
- No migrations or changes to live user data are planned by this acceptance work.
- Never assume "green CI" is equivalent to live payment or disaster recovery certification.

## Acceptance gates (must all pass on the **same** commit)

1. Compile Next.js production bundle, TypeScript and ESLint.
2. Complete existing CI suites: RLS and tenant isolation, API, CSV, onboarding, credits, duplicate booking, Paddle parsing/webhooks, mail API compatibility, backup encryption/restore fixture, dependency audit, CSP, accessibility, SEO, maintenance tools, and full runtime image.
3. Exercise real Chromium login page, 320px/390px mobile login checkbox, keyboard tab switching, font loading and visual viewport.
4. Run dedicated browser customer journey on isolated PostgreSQL and Chrome: **registrations closed**, registrations open, **monthly and annual** verification links, login from one-time email link, unpaid access gate, forged webhook rejected, signed subscription creation and duplicate handled, first paid workspace, member + class + internal package, finish onboarding, mobile workspace.
5. Check manager/receptionist/instructor cannot read Paddle provider IDs or owner legal consent.
6. Clean CI database and Chromium profile on completion. Record green GitHub Actions URL; investigate red checks and rerun everything after each code fix.

## Explicitly unverified before Contabo deployment

- Real Paddle **Live** Merchant of Record approval, real transaction, refunds, invoices, declines, renewals and subscription portal.
- SMTP delivery to real Gmail/Outlook addresses (the CI email is only queued).
- Real Turnstile with Cloudflare reverse proxy; IP identification and edge rate limiting.
- Independent restore on a different host **using the actual encrypted offsite production backup**, not just the disposable CI fixture.
- Real VPS restart/PM2 persistence, reverse-proxy + TLS, backups, firewall and disk/memory alarm readiness.
- Human legal, privacy, tax and operator identity review.
- Third-party penetration testing (OWASP ZAP is deferred by owner).

These items are **launch blockers** for fully open paid signups. Keep `AUTH_ALLOW_REGISTRATION=false` and avoid Paddle Live switching until each external approval and verification is evidenced.

## Controlled deployment checklist (only after explicit approval)

1. Pin the intended commit SHA; read deployment and rollback plan. Capture active PM2 app, port, Nginx upstream, runtime Node, current deployment path and critical process users *without printing secrets*.
2. Prove fresh encrypted backup exists both locally and off-site. Perform a separate-machine restore rehearsal. Snapshot or copy the previous release artifact; never delete an unverified working release.
3. In a new isolated immutable release directory owned by the application user, unpack the pinned commit, run `npm ci` from lockfile, run full build, smoke test against an isolated database/loopback binding.
4. Do not copy production env files into GitHub artifacts, CI, QA, chat logs or shared directories. Keep root-owned migration credentials inaccessible to the PM2 runtime.
5. If any migration ever becomes necessary, make it an explicit reviewed step with separate credentials, transactional migration, backup and rollback strategy. **This RC does not require a new migration.**
6. Swap only the intended production app/PM2 release once the candidate is healthy. Preserve existing Nginx, Paddle staging and separate QA services. Check `/api/health`, sign-in, public website, CSP headers, PM2 persistence and live registration staying disabled.
7. Monitor errors, CPU/RAM, mail queue, backup jobs and reverse-proxy status; run smoke tests after restart.

### Rollback

- Stop or switch only the new candidate process and restore the preserved previous release and PM2 command/environment exactly as recorded.
- Confirm public and private routes, local DB connectivity and correct upstream routing.
- Do **not** automatically roll back a migrated database. Any forward schema or writes require a separate data recovery decision.
- Retain candidate logs and incident evidence; no production customer secrets in the report.

## Acceptance decision

CI success means the **software RC is ready to be considered for controlled deployment**, not that customer sales are authorized. Production rollout and commercial signup require a separate human go/no-go decision.
