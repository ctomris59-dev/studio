# StudioTasker: Vibe Scan browser-security review (9 October 2026)

This document records code evidence and the limits of an unauthenticated
surface scanner. Review the exact URL and production deployment digest before
equating a Vercel scan with the self-hosted StudioTasker server.

## High – inline scripts: partial, risk-reducing remediation

- **Confirmed**: `next.config.ts` has `script-src 'unsafe-inline'` on
  cacheable marketing/preview routes. This is a CSP policy weakness even if the
  scanner cannot demonstrate an injection source.
- **Remediated for /workspace**: `middleware.ts` creates a fresh request
  nonce for this **force-dynamic** authenticated route and emits a script CSP
  without `unsafe-inline`. Next.js receives the nonce on its request header;
  CI requires separate nonces across requests and checks rendered nonce HTML.
- **Remediated across public routes**: `script-src-attr 'none'` forbids
  inline event attributes such as `onerror=`, independently of allowing
  Next's inline hydration elements.
- **OPEN**: cached public ISR pages cannot safely reuse a per-request nonce;
  removing `unsafe-inline` there requires verified per-build script hashes
  across every prerendered route, and a browser test of all hydration and
  checkout flows. Do not disable ISR or break pages solely to improve an
  automated score.

## High – HMR / development mode

- Current Docker container command runs `node node_modules/next/dist/bin/next
  start` after a production `next build`, rather than `next dev`.
- Production HTTP regression checks reject development/HMR indicators and
  hot reload event streams in the HTML response.
- **Deployment check remains open**: Vercel headers observed in the scan are
  not evidence that the VPS/current custom-domain deployment used this commit.
  Verify the **exact scanned URL**, commit SHA and deployment environment, and
  remove old public dev servers/preview URLs if they are no longer needed.

## Medium – HSTS includeSubDomains; Low – preload

- Default remains `max-age=31536000` for the host.
- After confirming that **every** subdomain, including old, internal, SMTP,
  verification, and temporary hosts, supports HTTPS, a deployment may set
  `HSTS_ALL_SUBDOMAINS_HTTPS_VERIFIED=true` at build time.
- Only after explicit domain-owner review and preload eligibility may the
  deployment additionally set `HSTS_PRELOAD_APPROVED=true`.
  Submission to a preload list is a separate irreversible decision; merely
  emitting the directive is not equivalent to registration.
- Do **not** turn these switches on speculatively to improve a scanner grade.

## Low – innerHTML / dangerouslySetInnerHTML

- The inspected first-party app/source uses safe normal React rendering.
  Added `test:security:source` to inspect first-party `app`, `components`,
  and `lib` for DOM HTML insertion sinks at CI time.
- A scanner that sees compiled Next/React runtime code cannot establish that
  the HTML assignments are written by StudioTasker or that untrusted data flows
  into them. Request exact file/function/stack and a payload before declaring
  any of the 4/15 sink findings exploitable.
- Dynamic user text must continue to use escaped React text nodes. Rich HTML
  must be sanitized and individually reviewed before adding it.

## Informational: COOP, COEP, CORP and Server

- COEP is not needed for the current app; enabling it blindly can block Paddle
  checkout assets or other third-party resources.
- COOP should be tested with Paddle popup/checkout before enabling isolation.
- CORP can prevent authorized embeds; a general site-wide value is not a
  substitute for a specific private-resource policy.
- A `Server: Vercel` header identifies an upstream hosting product and is not
  by itself a software vulnerability. The runtime already disables Next's
  `X-Powered-By` banner. The CDN/reverse proxy controls its own header.

## Recommended deployment acceptance

1. Run GitHub CI including the HMR/header regressions, real Chromium, and
   first-party DOM sink scan.
2. In the real deployment, use `next build`/`next start` and ensure no
   public `/_next/webpack-hmr` endpoint is available.
3. Use browser devtools to verify *no enforced script-CSP violations* in
   owner signup/login, workspace, checkout, demo and Paddle.
4. Re-scan the precise current production HTTPS URL; compare with a Vercel
   preview domain separately.
5. Keep the public marketing route CSP finding OPEN until hash-based CSP has
   passed a complete navigation/hydration suite. Do not claim full XSS
   protection from headers alone.
