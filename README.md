# StudioTasker — Studio Operations Software

StudioTasker is an English-first B2B SaaS for independent Pilates, yoga, barre, dance and boutique fitness studios.

The product is intentionally **studio-centered**. It helps studio owners and staff manage members, class schedules, bookings, attendance, class-package entitlements, follow-ups and daily operational priorities, while keeping bookings inside the private studio workspace for members.

## Product boundary

StudioTasker **does**:
- maintain lead/member CRM records;
- track classes, capacity, attendance and studio-managed bookings;
- manage bookings and waitlists from the private studio staff workspace;
- define internal class-package templates (credits + validity);
- let staff confirm package entitlements and make audited credit corrections;
- surface StudioTasker Today / follow-up opportunity signals such as trial follow-up, low credits, expiry, inactivity, package-status review and open seats;
- provide CSV migration, JSON export, tasks and operational insights;
- bill the **studio** for the StudioTasker software subscription.

StudioTasker **does not**:
- provide member logins or a member portal;
- operate a public booking marketplace or process member commerce;
- process, store or verify member card payments;
- collect money on behalf of studios;
- send automatic marketing or transactional messages to studio members;
- handle refunds, chargebacks or merchant settlement.

How a studio collects money from its own members stays entirely outside StudioTasker. Package status inside StudioTasker means **studio-confirmed entitlement**, not verified payment.

## Product routes and demos

- Marketing website: `/`
- Owner-only app login sandbox: `/app-demo`
- StudioTasker Today interactive preview: `/today`
- Self-service booking experience: `/book/preview` (fictional browser-only preview; no payment).
- Legacy `/demo` URL redirects to the canonical owner app sandbox at `/app-demo`.
- PostgreSQL workspace: `/workspace` (disabled when the secure backend is not configured)

Owner demo credentials:
- Email: `owner@demo.studiotasker.com`
- Password: `StudioTaskerDemo!`

The app demo is fictional and browser-only. Do not enter real personal information.

## StudioTasker pricing

- **$39.90/month per studio**
- **$406.80/year** ($33.90/month equivalent; about 15% lower than paying monthly for twelve months)

This fee is for StudioTasker software. It has no relationship to what the studio charges its members.

## Core differentiation

### StudioTasker Today
A deterministic, explainable daily operating view that tells the studio what deserves attention and why.

Current signal families:
- trial attended but not converted;
- renewal / low-credit opportunity;
- inactive member;
- package status pending review;
- underfilled upcoming class;
- overdue lead or follow-up task.

One-click actions can record contact, create a task or snooze a signal. No member message is sent automatically.

### Follow-up opportunities
StudioTasker surfaces operational follow-up situations such as trials, low credits, inactivity, package review and open class capacity. These are staff-review signals, not guaranteed financial outcomes.

## Self-service studio onboarding

The secure workspace targets five setup steps:
1. Studio profile and timezone.
2. Import contacts by CSV or add them manually.
3. Create the first class.
4. Define an internal class-package template.
5. Finish setup and use StudioTasker Today.

CSV import always previews before commit. Imported credits are migration entitlements, never reconstructed payment transactions.

## Technical foundation

- Next.js / TypeScript
- PostgreSQL 16
- forced PostgreSQL Row Level Security for tenant data
- first-party session authentication with hashed server-side tokens
- owner / manager / receptionist / instructor staff roles
- transactional bookings, waitlist promotion and credit ledger
- versioned SQL migrations
- encrypted PostgreSQL backup/verify/restore scripts
- CI covering auth, tenant isolation, production studio/CRM workflows, CSV validation, timezones, UI guards, build and live HTTP integration

The database migration directory is authoritative for new installations. Historical compatibility identifiers such as the internal database/localStorage names may still use the earlier ReformDesk wording and should only be renamed through a deliberate migration.

## StudioTasker subscription billing

StudioTasker uses **Paddle as authorised reseller and Merchant of Record** for StudioTasker's own B2B SaaS subscription only. The configured Paddle prices must be exactly $39.90/month and $406.80/year; the server verifies catalog price, currency and billing interval before creating a checkout transaction. The browser never chooses the tenant or Paddle price ID. Signed Paddle webhooks activate, update or cancel access, and Paddle Customer Portal handles billing management.

This is separate from studio-member commerce, which is outside the product.

## ESLint and third-party security review

ESLint was bootstrapped with the requested official `npm init @eslint/config@latest`
in GitHub Actions, then adapted to ESLint 9 and Next.js 15 without the
incompatible legacy `@rushstack/eslint-patch` loader.

- `npm ci` installs the pinned, reproducible development toolchain.
- `npm run lint` is the enforced CI lint baseline for the JSON-LD serializer
  integration and its security regression tests.
- `npm run lint:all` scans the rest of the application; new or legacy
  findings are reviewed and fixed separately rather than silently ignored.
- `npm run test:jsonld` checks that untrusted strings cannot break out of an
  inert JSON-LD script while preserving valid structured data.
- `npm run test:security:source` fails on any newly introduced raw HTML
  injection sink not individually reviewed.

The one intentionally retained `dangerouslySetInnerHTML` usage is documented
in `docs/SHARP-LIBVIPS-LICENSE-REVIEW.md`. Sharp/libvips LGPL notices in a
cross-platform npm lockfile **do not** require publication of all proprietary
StudioTasker source; before distributing a container or binaries, review the
specific LGPL-covered artifacts and obligations for that distribution.

## Production launch blockers

Do not enable public studio registration or production personal data until the selected production environment has:
- private PostgreSQL and restricted runtime credentials;
- HTTPS domain;
- verified studio-account email sender;
- StudioTasker subscription billing configuration;
- encrypted off-server backups and a successful restore drill;
- GDPR/privacy/retention/erasure documentation, individual-operator legal identity, Paddle live account/domain approval and confirmed Turkish legal/tax treatment of Paddle payouts;
- monitoring and incident-response procedures;
- manual mobile/accessibility testing;
- security review and pilot-studio usability testing.

See `docs/launch-readiness.md` and `docs/backend-foundation.md`.


## Legal and GDPR layer

Public legal routes:
- `/legal/terms` — SaaS Terms of Service
- `/legal/privacy` — Privacy Policy
- `/legal/dpa` — Data Processing Agreement and international-transfer/SCC workflow
- `/legal/cookies` — Cookie Policy
- `/legal/subprocessors` — production subprocessor disclosure
- `/legal/security` — technical and organisational measures
- `/legal/cancellation` — cancellation/refund rules

StudioTasker currently supports an **independent individual operator** model; the application does not require a company name, company number, MERSIS number or VAT registration field. Paid registration is fail-closed until the individual operator’s legal name/address/contact, governing-law/jurisdiction, hosting region/provider, email provider and `LEGAL_AUDIT_HASH_KEY` are configured. The selected production architecture is intended for an EU-hosted server; configure the exact provider/country when the purchased EU server becomes the production host. Registration and plan-specific checkout store versioned legal clickwrap evidence in `legal_acceptances`; raw IP addresses are not stored there, only HMAC evidence.
