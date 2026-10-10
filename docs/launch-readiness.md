# StudioTasker launch-readiness checklist

Updated 2026-10-06. This is a technical development snapshot, not a production security certification.

| Workstream | Implemented / CI-covered | Remaining before customers |
| --- | --- | --- |
| Studio staff identity | Email verification, password reset, owner/manager/receptionist/instructor role checks, server sessions | Production SMTP, stronger abuse controls, MFA decision, security review |
| Tenant database | PostgreSQL tenant IDs, forced RLS, cross-tenant tests for CRM/package/import records | Production DB hardening, monitoring, migration/rollback runbook |
| Studio operations | Members/leads, classes, studio-managed bookings, waitlist, attendance, internal packages, credit ledger, tasks | Pilot usability, edge-case policy decisions, production acceptance tests |
| StudioTasker Today | Explainable trial/renewal/inactive/package-review/open-seat/overdue signals; task/contact/snooze actions | Validate thresholds with real studio owners |
| Studio onboarding | Five-step owner setup and CSV preview/import | Real onboarding timing study, help copy, production import acceptance tests |
| SaaS billing | Paddle server-bound transactions, signed/idempotent webhook processing, 72-hour past-due recovery grace, Customer Portal and entitlement gate | Paddle live account/domain approval, exact $39.90/$406.80 live prices, real sandbox/live acceptance and payout reconciliation |
| Privacy/backups | Terms, Privacy, DPA, Refund, Cookies, Security, processors/controller disclosure, owner export, encrypted backup/verify/restore utilities | Production provider details, irreversible erasure policy, off-site schedule/restore drill and appropriate legal/privacy review |
| QA | Auth/RLS/CRM/CSV/booking/timezone/UI/build/HTTP CI | Cross-device testing, WCAG review, VPS load test, independent security review |

## Explicit product boundary

Member payments and member accounts are **not part of StudioTasker**.

There is no member portal, member self-registration, public member booking page or StudioTasker-mediated member checkout. A studio handles its own member payments independently. Internal package status is studio-confirmed entitlement only.

## Release gates

- `/app-demo`, `/today` and `/demo` contain fictional sample data only.
- `/workspace` remains disabled when the secure PostgreSQL backend is absent.
- Owner registration defaults off and must remain off until production infrastructure is verified.
- `BILLING_ENFORCEMENT=required` is for the **StudioTasker SaaS subscription**, not studio-member money.
- Public paid registration remains fail-closed until Paddle live approval plus explicit legal/tax review attestations are configured.
- Paddle is Merchant of Record for the buyer transaction; this does not by itself remove the operator's own Turkish income, bookkeeping or other local tax obligations.
- Data export is not a substitute for encrypted off-site backup.
- Archive is not permanent erasure.
- Run `npm run launch:verify`, the complete CI pipeline and a real backup restore before launch.

## Account email

Outbound email support is limited to StudioTasker account operations such as owner/staff email verification and password reset. Member-facing marketing/booking/payment email is intentionally outside the product.

## Paddle accounting control

Before live sales, review and follow `docs/paddle-accounting-runbook.md`. The tax-review launch flag must only be enabled after the actual Turkish operator/payout bookkeeping treatment has been confirmed.
