# StudioTasker — All-in-One Studio Management

English-first SaaS prototype for Pilates, yoga, barre and boutique fitness studio operations, including scheduling, member CRM, class bookings and follow-up tasks.

StudioTasker is the public-facing product name. Internal development database credentials, schema identifiers and the existing browser demo localStorage key remain unchanged to preserve compatibility. New Excel v2 exports use the StudioTasker brand, while ReformDesk Excel v1/v2 imports stay supported.

## Live prototype

- Marketing: `/`
- Studio CRM (interactive sample): `/demo`
- Source: `ctomris59-dev/studio`

## Development

Node.js 22 recommended.

```bash
npm install
npm run test:crm
npm run build
npm run dev
```

## Six interactive CRM workflows

1. **Customer records:** sample leads and members, searchable stages, status changes, notes, contact history and downloadable CSVs.
2. **Customer journey:** progress leads from New → Contacted → Trial → Won/Lost; winning converts to a member with sample class credits.
3. **Today's opportunities:** deterministic alerts for delayed lead replies, trial attendees, low credits and lapsed members; create tasks or dismiss them.
4. **Self-serve booking simulation:** Client booking view selects a fake member and supports book / waitlist / cancellation while updating credits.
5. **Follow-up workflow:** create/complete tasks, review email templates and copy a draft or open your mail app *only after explicit demo opt-in*. **No email is automatically sent.**
6. **Studio reports:** lead conversion, occupancy, churn-risk signals and completed tasks calculated from live sample data. No fictitious revenue claims.

### Current data handling

- State is saved to the **current browser's localStorage**, under `reformdesk-crm-v3`. It is not shared across devices or customers.
- All preloaded names/emails are fictional `example.com` data.
- **Not a real hosted CRM database.** No secure member logins, studio accounts, backend persistence, payment collection, email delivery, transactional reservations or privacy controls yet.
- Do **not** enter real customer personal information.
- `db/schema.sql` is a historical proposal; the authoritative new-installation migrations are in `db/migrations/` (not applied to any hosted database).

### Production launch requirements

To move beyond a sample prototype, select and connect a managed Postgres provider and an authentication provider; implement server-side tenant and role enforcement, force Row Level Security (where supported), atomic booking and credit ledger operations, audit logs, backups, deletion/export requests, GDPR lawful basis and consent tracking, verified email sender with unsubscribe support, monitoring, and billing.

**User action needed to provision external services:** Render requires the user to select and explicitly confirm a workspace before a Postgres instance can be created. Deployment secrets also need to be configured in Vercel by an authorized user. Do not embed database credentials in the GitHub repository.

## Pricing and branding

StudioTasker is the product name. The proposed $49/month studio subscription ($468/year if prepaid) remains a **launch pricing hypothesis**, not an active payment offer. Studio class-pack sales are separate from StudioTasker subscriptions. Trial clients and performance metrics in the public demo are fictional; validate willingness to pay before commercial launch.

## Design language

Cobalt `#334BDD`, dark ink `#1B2237`, paper `#F4F0E7`, citrus `#E7F982`, coral `#FF8360`. Display font Barlow Condensed, body Source Sans 3, utility IBM Plex Mono.

## Structured Excel import/export (browser-only)

Open **Settings → Excel import / export**. Three actions are available:

1. **Download template:** formatted `.xlsx` workbook with exact column names and dropdown options.
2. **Export Excel:** download the current demo's leads, members, classes, bookings, follow-up tasks, activity history and dismissed opportunities.
3. **Import Excel:** upload a completed `.xlsx`, inspect counts and any row-specific validation failures, and explicitly confirm replacement of current browser sample data.

Workbook sheets: `Guide`, `Leads`, `Members`, `Classes`, `Bookings`, `FollowUps`, `Activity`, `Dismissed`. Keep the headers intact. Dates must use YYYY-MM-DD and class times HH:MM. `Bookings` references stable IDs in `Members` and `Classes`.

**Safety:** 8 MB file limit, 5,000 data rows per sheet, required columns, stage/date/email checks, duplicate-ID/email checks, capacity/waitlist checks and cross-sheet reference validation. Invalid workbooks are rejected without changing data. Even valid ones require explicit overwrite confirmation. Existing data should be exported first as a backup. Only `.xlsx` is accepted (not `.xls` or `.csv`).

**Demo restriction:** Files are read entirely in the browser; never enter real customer personal data here. No production DB, privacy controls or secured account storage have been implemented.

## Safe credit adjustments and Undo / Redo

Open **Members → Adjust credits** for a member with a class-credit balance. Select **Add** or **Remove**, enter an integer credit amount (1–1,000), record a reason and confirm. The modal previews the new balance. Removing credits requires a second confirmation, and balances can never become negative. Unlimited plans cannot be adjusted with credits.

The **Undo / Redo** controls above the dashboard allow reversal of the last 15 changes made in the current browser session, including class-pack corrections, membership/CRM edits, attendance, task updates, bookings, cancellations, demo resets and Excel imports. The action confirmation message also offers **Undo**. A new action clears the redo history. Reloading the browser clears this in-memory Undo / Redo history, although the demo records themselves are still stored in browser localStorage.

This is a **browser-only prototype**: undo rolls back a local data snapshot and its sample activity entries. A real multi-user application must use server-side authorization, idempotent reversing ledger entries, audit logging and transactional booking updates; the demo snapshot mechanism is not a substitute for that production architecture.

## CRM v0.4 — lean forms with advanced options

The four Add forms preserve fast entry and disclose further fields on demand:

- **Leads:** name and email or telephone, source, then optional stage, service interest, contact preference, next-contact date, pack interest and minimal conversation notes. Adds a follow-up task automatically. Consent is opt-in, off by default.
- **Members:** name, email or telephone, class pack and separately tracked manual package-confirmation status. Pending packages start with **zero active credits**; **Confirm pack** manually activates chosen credits, without processing a payment. Optional start/expiry dates, initial credit amount, pause status, brief notes and linked lead. Converting a lead creates a **Pending** member and keeps the source lead ID, notes and activity record; no automatic award.
- **Classes:** instructor, time, date, duration and capacity; optionally room, booking/cancellation deadlines and weekly recurrence with weekdays and an end date. A series produces individual class rows sharing a Series ID, with atomic rejection of coach or room time conflicts. Limit: 180-day window and 100 sessions per batch.
- **Follow-ups:** task category, due date, result on completion; optional priority, time, responsible person, notes and weekly/monthly recurrence. Completion is logged, and repeating tasks create their next occurrence.

**Excel v2** includes all new fields as appended worksheet columns and still accepts correctly formatted v1 exports. Use **Settings → Excel** to download the updated template. Bookings, class credits, leads, member links, tasks and reporting remain cross-referenced.

**Data minimization:** We do not request medical information, date of birth, gender, physical addresses, emergency contacts or payment card data. These are browser-only demo capabilities; there is no real account, payment or email delivery system.

Memberships can be paused and resumed from the Members table, with Undo. Linked lead notes and source interaction history are viewable on the member row. Follow-up outcomes marked Converted create a pending member, while Reschedule creates the next call task.

## Secure backend foundation (new)

The first portable PostgreSQL/authentication increment is documented in [docs/backend-foundation.md](docs/backend-foundation.md). The production backend is still incomplete; do not enable registration or enter real customer data on Vercel.

## Secure Workspace — incremental backend build

The PostgreSQL-backed `/workspace` now includes upcoming classes, class creation, transactional booking/waitlist and cancellation with one-time credit refunds, manual package confirmation, auditable credit adjustments, follow-up tasks and an explainable **Action Center**. This is a separate dev-stage workspace; the public `/demo` is still a browser-local prototype. No paid infrastructure was provisioned and real client PII must not be used.

See [backend foundation](docs/backend-foundation.md) and [competitor features / differentiation hypotheses](docs/product-research.md) for tests, controls and remaining blockers.

## Increment 3 — secure accounts, member booking and future billing

The server-backed `/workspace` now includes opt-in email verification, password reset, one-time member invitations, member-owned booking APIs, studio export, contact archival, manually auditable credit corrections, inactive-by-default subscription gating and signed Lemon Squeezy webhook processing. Message delivery is queued; SMTP requires later configuration. Production billing and public registration are **OFF** until configured and independently verified.

Maintenance tools and their limits: `npm run jobs:mail`, `npm run jobs:renewals`, `npm run backup:create`, `npm run backup:verify -- /path/file.rdbk`, `npm run backup:restore -- /path/file.rdbk`. Encrypted backups must be stored off-server with a separately held secret.

**Not production-ready**: payment provider account, hosted PostgreSQL, verified email delivery, account hardening, true full CRM parity, legally compliant erasure/retention, independent security audit, accessibility field review and actual VPS load testing remain to be completed. No paid services were provisioned.

## Member commerce preview
Studio owners can publish class packs and connect eligible Stripe Express merchant accounts. Members can buy using hosted Stripe Checkout, book classes, see check-ins and renew packages. Only signed, price-matched webhook events activate credits; payment refunds flag memberships and reverse unspent credits. These are secure workspace development features requiring a production database and provider credentials; the public `/experience` is an interactive simulation with no real charges. The proposed StudioTasker SaaS subscription is **$49/month per studio ($468/year)**, separate from studio-set class pack prices. See `docs/member-commerce.md`.
