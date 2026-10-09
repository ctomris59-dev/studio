# StudioTasker architecture and change boundaries

## Request layers

1. **Next.js route** (`app/api/**/route.ts`): request method, origin, body type and limit, unauthenticated abuse budget.
2. **Authentication** (`lib/server/auth.ts`): validate the session, studio membership, role and billing entitlement.
3. **PostgreSQL transaction** (`lib/server/database.ts`): set `app.studio_id` and `app.user_id` using `SET LOCAL`.
4. **Domain logic** (`lib/server/*`): classes, credits, waitlist, people, subscription, payment and privacy workflows.
5. **SQL constraints and forced RLS** (`db/migrations`): tenant isolation, uniqueness and cross-request invariants.

Never move expensive password derivation or outbound mail delivery inside database transactions.
All non-trivial modifications must preserve `test:api`, `test:db`, `test:restore:e2e` and the real Chromium smoke test.

## Public endpoint controls

`lib/server/public-abuse.ts` provides in-process burst admission and shared database
budgets for registration, password reset, verification resend and contact. An IP
counter is reliable only when a verified proxy supplies a validated client IP,
and `LOGIN_RATE_HMAC_KEY` is set to an unpredictable secret of at least 32 characters.

Production also needs perimeter request limiting and CAPTCHA/Turnstile validation;
Node-local admission cannot enforce a global limit across multiple server replicas.
Do not claim that enabling application counters alone guarantees protection from
distributed bot traffic.

## Client and schema boundaries

The owner workspace is currently concentrated in `app/workspace/workspace-client.tsx`;
classes are implemented by class modules in `lib/server`. New code should
progressively extract independent UI components/hooks and centralize typed
request/response handling, rather than performing a high-risk all-at-once rewrite.
Static marketing content should remain prerendered, while authenticated
`/workspace` remains dynamic for nonce-based CSP.

## Quality controls

ESLint 9 flat config and TypeScript build are authoritative. Prettier and
EditorConfig are in place for new/modified code; run `npm run format` only in a
dedicated formatting-only branch, because bulk reformatting obscures behavior
reviews. `format:check:all` is available as a migration diagnostic and is
**not yet** an enforced all-file gate until legacy files have been formatted.
The current ESLint complexity and accessibility checks initially warn on legacy
code. New modules should meet the stricter thresholds.

## Deployment and security boundaries

The Docker runtime excludes npm, launches Node directly and includes required
backup tools. VPS/panel setup, TLS, HSTS, reverse proxy identity, secret values,
Turnstile, scheduled jobs, SMTP, Paddle and offsite restore drills must be
verified in the real deployment. GitHub CI does not prove these are working
on the user's VPS.
