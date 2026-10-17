# StudioTasker: Vibe Scan browser-security review (9 October 2026)

This document records code evidence and the limits of an unauthenticated
surface scanner. Review the exact URL and production deployment digest before
equating a Vercel scan with the self-hosted StudioTasker server.

## High – script CSP: updated source, deployment verification pending

- **Current source**: `next.config.mjs` fallback headers explicitly use
  `script-src 'self' https://cdn.paddle.com https://challenges.cloudflare.com`,
  without `'unsafe-inline'`, `data:` or scheme-wide `https:`. They include
  `object-src 'none'` and `script-src-attr 'none'`.
- **All HTML documents**: `middleware.ts` generates unpredictable request
  nonces with `script-src 'self' 'nonce-…' 'strict-dynamic'…`, and the root
  layout uses `force-dynamic` so Next.js adds those nonces to its hydration scripts.
  Public and workspace routes use `Cache-Control: private, no-store`.
- **Trade-off**: marketing ISR and 300-second HTML caching have been removed
  deliberately. This increases server render work, and needs throughput/
  performance testing on the self-hosted Contabo VPS. Static JS/CSS/image
  assets remain cacheable. Do not add ISR without switching to verified
  hash-based CSP that covers the exact rendered inline scripts.
- **Acceptance**: CI verifies nonces, CSP directives, no-store and public HTML
  hydration script attributes. An actual VPS deployment and full Chromium
  check (marketing, demo, checkout and authenticated workspace) are still
  required before marking the live finding closed. A reverse proxy must not
  overwrite or duplicate CSP response headers.

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

- First-party source includes **one** reviewed use of
  `dangerouslySetInnerHTML`: `components/json-ld.tsx` serializes
  structured SEO metadata into a non-executable `application/ld+json`
  script. The serializer escapes every `<` as `\\u003c`, including
  adversarial `</script>` input. The source test explicitly checks this
  conversion and fails on any additional raw HTML sink.
- `test:security:source` searches `app`, `components`, and `lib` for
  other DOM HTML insertion code.
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
