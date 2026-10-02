# ReformDesk — Studio CRM & Growth demo

English-first SaaS prototype for boutique Pilates, yoga and fitness studios.

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
- `db/schema.sql` is a proposed PostgreSQL migration **not applied** to any database.

### Production launch requirements

To move beyond a sample prototype, select and connect a managed Postgres provider and an authentication provider; implement server-side tenant and role enforcement, force Row Level Security (where supported), atomic booking and credit ledger operations, audit logs, backups, deletion/export requests, GDPR lawful basis and consent tracking, verified email sender with unsubscribe support, monitoring, and billing.

**User action needed to provision external services:** Render requires the user to select and explicitly confirm a workspace before a Postgres instance can be created. Deployment secrets also need to be configured in Vercel by an authorized user. Do not embed database credentials in the GitHub repository.

## Pricing and branding

Brand name and `$129` pricing on the landing page are exploratory, **not** a payment offer. Trial clients and performance metrics are simulated. Prioritize customer interviews before enabling paid plans.

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
