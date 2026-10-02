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
