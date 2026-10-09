# StudioTasker: studio closure and deletion runbook

**Scope:** application code and tested operator procedure. This is **not** evidence that production billing, backups, off-site retention, restore drills or legal holds have been independently verified.

## Customer-facing request

1. Studio owner downloads the complete studio JSON export from Workspace → Settings.
2. Owner checks the export acknowledgement, enters `CLOSE MY STUDIO` and submits.
3. `POST /api/studio/privacy/closure` records a tenant-scoped, idempotent request in `activity_log`; it does **not** cancel billing or delete data.
4. Owner independently cancels subscription via Paddle's customer portal. Subscription status, effective period end, refunds and invoice retention must be checked in Paddle.

## Controlled operator finalization

The application has **no automatic destructive delete**. An operator verifies ownership and the export, checks whether the account belongs to another studio, ensures Paddle is cancelled with the paid period ended, documents applicable accounting/legal holds, and proves that encrypted backups and expiration/rotation are configured as actually implemented. Do not run on a live system until those checks pass.

Run `npm run closure:finalize` **only** in an isolated, verified administrative session, with:

- `MIGRATION_DATABASE_URL`: privileged migration DB credential; never the web runtime DB URL
- `STUDIO_ID` and exactly matching `CONFIRM_STUDIO_ID`
- `CONFIRM_STUDIO_ERASURE=ERASE_AFTER_REVIEW`
- `VERIFIED_BILLING_TERMINATED=YES`
- `LEGAL_RETENTION_REVIEWED=YES`
- `BACKUP_RETENTION_REVIEWED=YES`
- `STUDIO_CLOSURE_AUDIT_KEY`: a 32+ character, securely held key for a pseudonymous audit fingerprint

The script refuses to purge without an owner-initiated request at least **seven days** old or while an identified Paddle subscription still has an active/unexpired period. It runs inside a single database transaction and deletes only the selected tenant's studio-owned rows via referential cascades. Orphaned login identities are disabled and anonymized. A minimal HMAC fingerprint, request timestamp and legal-acceptance count remain in `completed_studio_closures` without raw tenant ID or buyer email.

A PostgreSQL commit does **not** remove backups, third-party processor records, e-mails, already-exported files, logs or invoices. Backup expiry and third-party records need separate documented handling in accordance with applicable law. Physical deletion cannot be represented as instantaneous universal erasure.

## Verification

Run `npm run test:closure` against the isolated PostgreSQL CI database. It checks the refusal gate and scoped deletion, verifies orphan-account anonymization, and ensures that a minimal closure audit remains.

Run all PostgreSQL, HTTP, real-Chromium and SEO tests before deployment. Confirm the final migration is applied and the operator's audit secret and retention controls have been established; this GitHub commit alone changes **no production server state**.
