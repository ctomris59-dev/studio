# StudioTasker launch-readiness checklist
Updated 2026-10-03. This is a technical development snapshot, NOT a production security certification.

| Workstream | Implemented and CI-covered | Remaining before customers |
| --- | --- | --- |
| 1. Identity | Unverified signup requires one-time email proof; password reset invalidates sessions; single-use member invite; staff roles | SMTP sender and deliverability, per-IP abuse controls, MFA decision, existing-account invites, security review |
| 2. Database CRM | Tenant-isolated people, classes, bookings, credits, tasks and deterministic action signals; editing, archival and owner export | Full CRM parity with browser demo, recurring schedule CRUD, edit history, profile ownership and full data migration |
| 3. Member portal | Member-specific profile, class listing, book/waitlist/cancel; server resolves member identity | Member-facing onboarding pilot, attendance workflows, booking confirmation policies and notification delivery |
| 4. SaaS billing | Hosted checkout integration gated by secrets; raw HMAC verification, idempotent event handling and opt-in paid entitlement | Merchant verification, provider test transactions end-to-end, subscription reconciliation, tax/invoices, grace-policy decision |
| 5. Notifications, privacy, backups | SMTP-ready outbox, renewal scheduler, soft archive, export audit, authenticated AES-256-GCM backup/verify/restore | Actual SMTP, secure offsite storage, retention policy, scheduled restore drill, compliant erasure workflow, incident response |
| 6. QA | Auth/CRM/Excel/Postgres RLS, concurrent booking, webhook and password tests, 24-request CI performance smoke and static a11y checks | Cross-device browser testing, formal WCAG review, load test on target VPS, real pilot-studio usability, independent pen test |

## Release gates
- **Current public /demo** is a localStorage sample. **Do not import real personal data.**
- **/workspace** is intentionally disabled on Vercel until secure PostgreSQL is configured. Nothing was provisioned or purchased.
- **Owner registration** defaults off and requires SMTP before any internet-facing launch.
- **BILLING_ENFORCEMENT** defaults off to permit local integration testing; before commercial launch set to `required`, configure and verify provider webhooks, and test activation plus cancellation/expiration.
- Data export JSON is not an encrypted cloud backup; keep exported files private.
- **Archive is not deletion**; legal retention and irreversible erasure are not yet complete.
- The project is NOT ready to accept paying customers or production personal data until all release gates have been satisfied.

## Privacy-conscious token transport
One-time email links use `/workspace#verify=...`, `#reset=...`, or `#invite=...`. The fragment is read and removed in-browser; it is not sent in the HTTP path or referrer. SMTP dispatch clears payloads after delivery, and a cleanup job removes expired link payloads.

## Commercial registration safety gate (2026-10-03)
Public registration now fails closed unless a real PostgreSQL database, SMTP sending account, commercial Lemon Squeezy billing/webhook settings, backup configuration and HTTPS origin are present with `BILLING_ENFORCEMENT=required`. Local HTTP loopback integration tests have an explicit local-only exemption. Run `npm run launch:verify` before a launch; it checks environment presence, not service connectivity or legal compliance. This does **not** constitute production approval. Do not enable public registration until the pending third-party security review, GDPR documentation, retention/erasure workflow, email deliverability and real restore drill have been completed.
