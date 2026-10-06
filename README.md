# StudioTasker — Studio Operations Software

StudioTasker is an English-first B2B SaaS for independent Pilates, yoga, barre, dance and boutique fitness studios.

The product is intentionally **studio-centered**. It helps studio owners and staff manage members, class schedules, bookings, attendance, class-package entitlements, follow-ups and daily operational priorities, while offering a lightweight studio-branded self-service booking link for members.

## Product boundary

StudioTasker **does**:
- maintain lead/member CRM records;
- track classes, capacity, attendance and studio-managed bookings;
- provide a lightweight studio-branded self-service booking link that uses confirmed class credits without taking payment;
- define internal class-package templates (credits + validity);
- let staff confirm package entitlements and make audited credit corrections;
- surface StudioTasker Today / Revenue Rescue signals such as trial follow-up, low credits, expiry, inactivity, package-status review and open seats;
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
- **$418.80/year** ($34.90/month equivalent when prepaid annually)

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

### Revenue Rescue
Revenue Rescue is an operational opportunity layer, not a financial claim. It highlights studio follow-up situations that may affect retention or utilization without claiming that StudioTasker “recovered” money.

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
- CI covering auth, tenant isolation, CRM workflows, CSV/Excel validation, timezones, UI guards, build and live HTTP integration

The database migration directory is authoritative for new installations. Historical compatibility identifiers such as the internal database/localStorage names may still use the earlier ReformDesk wording and should only be renamed through a deliberate migration.

## StudioTasker subscription billing

The code contains a Lemon Squeezy integration for **StudioTasker's own B2B SaaS subscription only**. The provider variants must be $39.90/month and $418.80/year, and the backend rejects mismatched configured prices.

This is separate from studio-member commerce, which is outside the product.

## Production launch blockers

Do not enable public studio registration or production personal data until the selected production environment has:
- private PostgreSQL and restricted runtime credentials;
- HTTPS domain;
- verified studio-account email sender;
- StudioTasker subscription billing configuration;
- encrypted off-server backups and a successful restore drill;
- GDPR/privacy/retention/erasure documentation and individual-operator legal identity;
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
