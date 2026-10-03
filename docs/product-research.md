# StudioTasker: competitive product research and differentiation hypotheses
Research checked: 2026-10-03. This is feature evidence, not proof of willingness to pay.

## Competing feature sets (public provider descriptions)
- [Momence](https://www.momence.com/features/): class and appointment scheduling, waitlist promotion, retention/marketing automations, Spotfiller for underfilled classes, staff roles and notifications.
- [ABC Glofox](https://www.glofox.com/features/): memberships, bookings, waitlists, automated reminders, AI-related retention reports and multi-location operations.
- [bsport](https://intercom.help/bsport-helpcenter/en/articles/16096632-waitlist-management): different waitlist allocation models (first in line, first to respond), automatic promotions and adjustable response windows.

Therefore **"has waitlists"**, **"automated follow-ups"**, **"AI retention"** are NOT credible unique selling points. A more realistic hypothesis for independent studios is an affordable, immediately understandable and self-service workflow: *actionable, explainable next steps without mandatory messaging integrations.*

## Increment 2: implemented in PostgreSQL-backed workspace
- Transaction-locked bookings prevent overbooking despite concurrent requests.
- Validated pass, expiration and status rules; waitlist entries consume no credits until promoted.
- Cancelled bookings create at most one credit refund ledger entry and automatically promote the earliest eligible waitlisted member.
- Manager-only manual package activation, with explicit warning that no money changes hands.
- Manager-only credits corrections require a reason and UUID idempotency key; unlike browser-only Undo, this is auditable server-side.
- Explainable Action Center returns bounded, deterministic signals: late lead contacts, upcoming expiry, low credits, underfilled near-term classes, overdue tasks. No AI usage or automatic marketing sending.
- Staff can create and resolve follow-up tasks with an explicit recorded outcome.

## Hypotheses to validate before calling them differentiation
1. Time-to-first-use: can a nontechnical owner reach the first class booking without training?
2. Prioritization: does a reason + action button save measurable admin time compared with a spreadsheet?
3. Price sensitivity: would a studio pay for a focused set of scheduling and renewal tasks rather than broad gym management?
4. Support burden: how often does a first-time owner need help setting up the studio?
5. Trust: do clients want automatic waitlist promotion with immediate notification, or an optional confirm-first policy?

The public /demo is still browser-only; /workspace works with a separately configured PostgreSQL backend and requires staff authentication. No external marketing provider or recurring paid API has been introduced.

## Remaining production blockers
- Invitation-only email verification and secure password reset, stronger rate limiting per IP/device, optional MFA and session/device management.
- Subscription payment provider, verified webhook handling, renewal and cancellation entitlements, explicit grace periods and secure trial policy.
- Transactional recurrence and coach schedule management; member self-service identity-linked bookings; safe waitlist notification/confirmation policies.
- All CRM editing and lead/member lifecycle moved to tenant-isolated server APIs (currently partial).
- Disaster recovery: encrypted off-site backups, restore drills, retention/deletion workflows, privacy processing and consent proof.
- Billing/dunning emails and transactional notifications with delivery monitoring, opt-outs where appropriate.
- Permissions for instructors vs owners vs receptionists, security audit, penetration tests, rate/load tests and accessibility review.
- A production onboarding flow and a verified commercial model with pilot studios.

No real customer data should enter the public demo or locally operated development workspace until these blockers are addressed.
