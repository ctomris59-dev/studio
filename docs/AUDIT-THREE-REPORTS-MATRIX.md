# StudioTasker: combined audit closure register

**Scope:** Three independent audit reports, combined with code inspections and checks through October 2026. The status refers to the GitHub review branch PR #17 and original merged audit fixes. It is **not** proof of live VPS or third-party payment/email readiness.

Status legend: **CODE** = implemented and tested in repository, **PARTIAL** = code exists but important work remains, **EXTERNAL** = a real credential, service or human verification is required, **OPEN** = not implemented.

## Payment, account and legal

| Finding | Status | Evidence / remaining work |
|---|---|---|
| Annual legal price constraint 41880 vs 40680 | CODE | Migration 017 and DB/HTTP annual acceptance coverage |
| Duplicate lead-to-member unique identifiers | CODE | In-place conversion and unique index repair |
| Annual signup not exercised in CI | CODE | Annual legal acceptance DB regression |
| Legal operator data prerendered at build | CODE | Dynamic home/legal rendering |
| Docker Paddle browser env embedded incorrectly | CODE | Public build ARG/ENV and environment mismatch guard |
| Paid enforcement defaults to disabled | CODE | Production workspace billing fails closed unless explicit local integration mode |
| Subscription churn prevents re-purchase | CODE | Billing panel displays reactivation checkout options |
| Checkout success shows stale inactive status | PARTIAL | Bounded polling implemented; verify asynchronous real Paddle webhook states |
| Checkout tax visibility | CODE | Pricing explains final taxes/total shown by Paddle before payment |
| Paddle live prices, sandbox and MoR accounting | EXTERNAL | Verify live account, prices, tax, cancellations, refunds, webhooks, invoice rendering and actual checkout |
| Operator identity, Terms/DPA/Privacy deletion claims | PARTIAL | Legal pages use runtime operator details; legal review and final retention language still required |
| Studio account termination/deletion lifecycle | OPEN | Need verified paid subscription termination, retained accounting evidence, tenant deletion, orphan account cleanup and retention workflow |
| Anonymize archived person | PARTIAL | Owner-confirmed irreversible anonymization preserves ledger, strips many identifiers; verify all side tables, backups and retention requirements |
| Legal clickwrap IP spoofing | CODE | x-real-ip accepted only with independently verified proxy flags, HMAC hashing |
| Real GDPR / Turkish KVKK adequacy | EXTERNAL | Requires human legal review of true operating entity and processor/subprocessor agreements |

## Security and operational correctness

| Finding | Status | Evidence / remaining work |
|---|---|---|
| Postgres privileged runtime role can bypass RLS | CODE | Runtime refuses superuser/BYPASSRLS/table ownership/missing FORCE RLS |
| Restricted production role and GRANTs undocumented | CODE | Explicit production role setup script and runbook; application in live DB still EXTERNAL |
| PostgreSQL pool idle errors crash process | CODE | Pool idle error listener |
| Authentication user discovery via missing scrypt work | CODE | Dummy v2 scrypt for unknown users |
| Weak scrypt N=16384 | CODE | New N=131072 v2, successful-login legacy rehash |
| Email-only lockout can block real user | CODE | Genuine password can sign in despite email failure throttle; HTTP regression |
| Missing per-IP auth limit | PARTIAL | Shared HMAC-hashed IP limiter; must verify real Nginx header overwrite and enable on VPS |
| Contact SMTP flood | PARTIAL | Distributed global and verified-IP limits; consider provider-specific quotas and production alerts |
| JSON / CSV / logo / Paddle unbounded request body | CODE | Streaming size caps with logo authentication before multipart parsing |
| CSP/HSTS/X-Frame coverage | PARTIAL | Global baseline CSP/HSTS; strict nonce policy and browser compatibility/security audit still needed |
| Nodemailer vulnerability | CODE | Pinned Nodemailer 10.0.13 in lock with sendMail smoke test; monitor for further advisories |
| Mail worker absent | PARTIAL | Worker and supervised systemd timer templates exist; real activation/delivery EXTERNAL |
| Email verification rescue | CODE | Generic rate-limited resend endpoint and sign-in interface |
| Staff login invitation missing | CODE | Owner-only token-based 48-hour invitation and dedicated staff acceptance; intentionally no multi-studio existing-email support |
| Session and login-attempt cleanup absent | CODE | Cleanup script handles expired sessions, hashed counters and old mail |
| Cleanup job needs DB superuser | PARTIAL | Separate least-privilege maintenance-role creation; install/verify in live DB |
| Encrypted backup command leaks URL | CODE | libpq environment variables, no password in argv |
| Offsite encrypted backups | PARTIAL | rclone transfer + remote size verification + timer templates; credentials, offsite retention and actual successful restore EXTERNAL |
| Tested backup restoration and monitoring | EXTERNAL | Must restore from offsite file into disposable DB, inspect rows, alert on failure |
| Docker health check absent | CODE | HEALTHCHECK in image |
| Security logging / alerts | PARTIAL | Technical logs and immutable ledgers exist; production monitoring, auth failure alerts and retention policy needed |

## Core studio operations

| Finding | Status | Evidence / remaining work |
|---|---|---|
| Class edit, substitute change, cancellation missing | CODE | PATCH/DELETE class endpoints, primary/substitute UI, transactional refunds |
| Canceling whole class double-refunds | CODE | Idempotent cancellation and unique ledger checks in HTTP integration |
| Member waiver required but ignored | CODE | Booking and waitlist promotion eligibility check signed waiver |
| Late-booking deadlock due to locking order | CODE | Standard cancel path locks class before booking |
| Staff instructor unauthorized Promise.all | CODE | Role-gated requests, staff-accessible class view |
| CRM/booking list 100–120 item ceiling | CODE | Search and incremental pagination for staff class/member and owner CRM |
| CSV delimiter only comma | CODE | Semicolon and tab plus UTF-8/Windows-1252 fallback |
| CSV preview does not detect archived contacts | CODE | Duplicate lookup includes archived records |
| CSV static 2026 expiry | CODE | Next-year dynamic example on template export |
| Waitlist promotion silent | CODE | Follow-up notification task created for staff; no automatic outbound member email |
| Weekly class series past first occurrence fails | CODE | Skip elapsed occurrences |
| Insights 90-day actual vs 30-day label | CODE | 30-day SQL and response aligned; pipeline metrics explicitly estimated |
| Late cancels count waitlist and waitlisted lifetime | CODE | Excludes waitlisted debits, shows count of currently waitlisted |
| Duplicate booking errors unhelpful | PARTIAL | Booking eligibility/response checks improved; verify exact remaining error-order edge cases |
| Member self-registration/public booking link | OPEN | Deliberately not advertised or sold as an available product feature |
| Full course/term enrollment model | OPEN | Dance marketing now says recurring lessons/labels only |
| Unused/test-only demo business logic | PARTIAL | Legacy CSS and old schema retired; duplicate booking/workflow implementations and fixture-only test packages remain |
| Real server behavior under concurrency | PARTIAL | DB and HTTP integration tests; no production load/stress test |

## Pages, accessibility and developer experience

| Finding | Status | Evidence / remaining work |
|---|---|---|
| Mobile marketing menu and sign-in hidden | CODE | Responsive details menu with visible customer sign-in |
| Sticky top navigation | CODE | Sticky marketing header while scrolling |
| Duplicate hero slogan/alignment issues | CODE | New centered main hero and previous layout changes |
| Tiny public editorial labels, contrast | PARTIAL | 12px targeted public labels and footer contrast; needs full WCAG audit on all screens |
| Google Fonts exposes visitor IP | CODE | next/font/google self-hosts font assets at build; original CSS import removed |
| External hotlinked hero image | CODE | Repo-owned AVIF through next/image |
| Product tour tabs keyboard accessibility | CODE | Arrow/Home/End keys, aria-controls, tabpanel labels |
| Demo tour declared modal without modal behavior | CODE | Nonmodal region semantics, close focus, Escape dismissal |
| Class booking preview selected state | CODE | aria-pressed, current relative sample dates |
| Loading delay flashes empty lists | CODE | Distinct loading statuses for class, booking and roster lists |
| Two overlapping CSS design systems | PARTIAL | Dead CSS files removed and typography tokens shared; full CSS consolidation remains |
| Large one-line workspace client/dead code | OPEN | Requires staged refactor plus browser QA to avoid regression |
| Native confirm dialogs/legacy keyboard conventions | OPEN | Replace with accessible dialogs after critical operations are stable |
| Live responsive/browser/device QA | EXTERNAL | Preview protected by Vercel authentication, GitHub tests are build and HTTP rather than full real browser test |
| Source-copy lint fails deployments | CODE | Copy lint moved into CI separate from build |
| Old UI tests refer to removed homepage copy | CODE | Updated regression assertions |
| Canonical base URL scattered | CODE | Root metadata and structured data use SITE_URL from one config |
| Stale/cruel 404 message | CODE | Customer-friendly copy |
| SEO crawl/render/index controls | PARTIAL | Server-rendered content, robots/canonical/structured data/HTTP tests and runbook; Search Console/logs need real crawl observation |

## Exit criteria

1. Latest PR CI is green on the exact head commit (isolated Postgres, APIs, TypeScript, build, SEO, and regression tests).
2. Staging VPS has migrations 017–021, new runtime role, maintenance role and proxy verification.
3. Real SMTP verify/resend/invite/reset flows work and deliver; record delivery and retry alert.
4. Real sandbox + live Paddle lifecycle tests, legally reviewed operator and taxes.
5. Offsite encrypted backup restore drill and alerting verified independently.
6. Deletion/retention and unsupported-product decisions signed off.
7. Device/browser accessibility and operational concurrency/load tests.
8. Only then enable live paying signups and consider complete audit closure.

**Outstanding external and product scope findings intentionally remain OPEN/PARTIAL/EXTERNAL, not falsely marked fixed.**
