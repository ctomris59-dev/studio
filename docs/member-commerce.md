# StudioTasker: member commerce and $49 SaaS launch

## Two separate payments

**StudioTasker software:** proposed $49 per month per studio or $468 per year paid upfront (equivalent $39/month). Lemon Squeezy collects the studio software subscription; the server validates the Lemon variant price matches the advertised amount before creating checkout. Tax and currency settings require independent provider verification.

**Member class packs:** the studio defines individual package name, class credits, USD/EUR/GBP/CAD/AUD price, and validity (7–365 days). Members pay the studio using **Stripe Connect Express direct charges** on that studio's verified connected account. StudioTasker never collects card details, and its code does not assess a separate platform processing fee. Stripe's own processing/Connect fees may apply. Stripe Connect is not available in every country and requires merchant verification.

## Product journey and security

1. Staff add a member and send a one-time invitation for secure member login. Member chooses an available class.
2. Studio creates class packs. Member chooses and buys a pack through Stripe-hosted checkout only after the studio has completed Express onboarding.
3. Pending purchase = zero new credits. Stripe connected-account webhooks validate HMAC signature, freshness (five-minute replay window), studio ID, merchant account, immutable purchase ID, session, amount and currency. Verified payment activates credits and queues confirmation email once.
4. Member books a place, spends one class credit, or joins the waitlist subject to capacity/cutoffs; staff check in against an actual booking with a corrective audit trail.
5. Verified renewal adds credits and extends existing expiry from the later of today or previous expiry, with a new immutable receipt record and confirmation notification.
6. Refunds/disputes revoke unspent package credits, pause new bookings, log the incident and queue a review notification. Existing future bookings, partial refunds and complex disputes require a studio operator to reconcile them. A refund is not an automatic chargeback resolution.

The public `/experience` page is **simulation only** and charges no cards. The public CRM demo also uses fictitious data. A live PostgreSQL backend and real provider credentials are required for the secure `/workspace` experience.

## Prerequisites to collect real payments

- Eligible **Stripe Connect** platform account and approved merchant onboarding. Create a **connected-account webhook** at `https://YOUR_DOMAIN/api/payments/stripe-connect-webhook` listening to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`. Use the connected-account endpoint signing secret in `STRIPE_CONNECT_WEBHOOK_SECRET`.
- Set `STRIPE_SECRET_KEY`, `STRIPE_STUDIO_PAYMENTS_ENABLED=true`, and exact HTTPS `PUBLIC_APP_ORIGIN`. Keep `STRIPE_STUDIO_PAYMENTS_TEST_BASE_URL` unset outside isolated localhost CI. Stripe Express requirements, processing fees and platform liability need review in each supported jurisdiction.
- Separately create Lemon Squeezy **USD $49/month** and **$468/year** subscription variants and set `LEMON_*_VARIANT_ID` and `LEMON_WEBHOOK_SECRET`. Actual provider prices/intervals are checked at checkout.
- Supply restricted production `DATABASE_URL`; migrate `db/migrations/007_member_commerce.sql` and `008_payment_notifications.sql`; grant the runtime role access to new tables. `db:setup:local` is only for localhost.
- Configure real SMTP worker scheduling, offsite encrypted backups and a successful restore drill, company policies for GDPR/retention/erasure, Stripe payments security review and appropriate Terms, Privacy and refund/cancellation policies.
- Run `npm run launch:verify`, `npm run test:api`, `npm run test:commerce`, and production build. These checks do not replace real charge/refund/email/backup tests or qualified legal review.
- **Do not enable public registration** until all prerequisites are verified. Backend registration now fails closed if required live service configuration is missing (except explicit localhost integration mode).

## Limits to address later

Real customer journey is an authenticated member portal, not public guest checkout. Members currently require staff invitations. Checkout expiry/cancellation reconciliation needs scheduling. Different package types (unlimited, multi-site, recurring automatically charged class packs) are not covered. Refund reconciliation needs staff review of pre-existing future bookings. Payments are restricted to supported Stripe Connect countries and card processing. Payment provider fees, currency conversion, taxes, billing regulations and accessibility need production acceptance testing.
