# Security scanner follow-up – TLS, CSP reporting, logout and public notices

This document records GitHub code changes, **not** live production verification.

## Scanner finding disposition

| Finding | Status | Evidence / limitation |
|---|---|---|
| Valid certificate chain but partial hostname match | **OPEN – certificate/hostname check** | Requires the **exact URL and hostname** scanned, certificate SANs, SNI and redirects. Do not guess that a certificate is correct because its chain is valid. Check both `studiotasker.com` and `www.studiotasker.com` and any Vercel preview or VPS alias separately. |
| HSTS lacks includeSubDomains/preload | **REQUIRES DOMAIN-OWNER APPROVAL** | `next.config.ts` already supports verified opt-ins `HSTS_ALL_SUBDOMAINS_HTTPS_VERIFIED=true` and `HSTS_PRELOAD_APPROVED=true`. Do not enable before checking **all** subdomains, legacy mail hosts and domain control. The `preload` directive is not the same as submitting to the preload list. |
| Public CSP allows unsafe-inline | **PARTIAL – still open for public ISR pages** | Dynamic authenticated workspace has nonced `script-src` without `unsafe-inline`; public ISR routes still allow inline script elements needed by current Next SSR/hydration. `script-src-attr 'none'` does block inline event handlers. Replace public scripts with tested hashes or redesign caching before claiming closure. |
| 27 inline scripts without protection | **SAME PUBLIC CSP ISSUE** | Not 27 independently verified XSS bugs. Classify by scripts emitted by Next.js versus first-party markup; test against the enforced response policy and identify actual untrusted data flow. |
| Clear-Site-Data absent | **CODED** | Successful `POST /api/auth/logout` sets `Clear-Site-Data: "cache", "storage"` after server-side session/device revocation. Session cookies are explicitly expired; omit `"cookies"` to avoid clearing sibling-subdomain accounts. Only supported HTTPS browsers enforce this header. |
| CSP reporting endpoint absent | **CODED, OPERATIONS OPEN** | Enforced CSP includes `report-uri /api/security/csp-report; report-to studio-csp`. A same-origin `Reporting-Endpoints` response header points to `/api/security/csp-report`. Receiver accepts legacy/new formats, caps request size (16KB), logs only low-cardinality directive, and limits per-process logging to 30/minute. Production alerting, retention and reverse-proxy rate limiting still need configuration. |
| Privacy Policy not visible | **CODED** | Homepage footer links directly to `/legal/privacy`, in addition to Legal & Trust. Verify on the scanned URL, not only local build. |
| security.txt missing | **CODED** | `/.well-known/security.txt` has RFC 9116 Contact, Expires, Canonical and Policy. Update **before 9 Oct 2027** and confirm support mailbox actually receives security reports. |
| No WAF signature | **UNVERIFIABLE VIA RESPONSE HEADER** | Invisible WAFs exist; absence of branding is not proof of no WAF. Check hosting/CDN panel, rate-limit logs and challenge rules. |
| Technology fingerprint absent / no forms / no third-party SRI | **INFORMATIONAL** | These findings do not themselves prove insecurity; absence of technology fingerprint is not a defect. |
| Resource hints preload (2) | **INFORMATIONAL** | Related to performance, not the HSTS `preload` directive. |

## Acceptance steps on the exact production hostname

1. Confirm the scanner target URL, `openssl s_client -servername HOST -connect HOST:443` certificate SAN list and successful hostname verification for that host. A valid trust chain **does not** establish a matching SAN.
2. Confirm HTTPS redirect, current deployment commit, site HSTS and CSP response headers, and no live Next development/HMR route.
3. Test authenticated login, then `POST /api/auth/logout`: DB session revoked, host cookies expired, `Clear-Site-Data` emitted, and origin caches/storage cleared in a supported browser. Do not clear all domain cookies.
4. Trigger a harmless CSP report in a staging browser and ensure only directive names reach the logs. Wire log alerts and retention; verify reporting endpoint is protected from excessive anonymous traffic.
5. Check footer privacy link and `/.well-known/security.txt` on both apex and `www`. The response's certificate hostname must match each requested host.
6. Separate **old Vercel preview** scan results from the current VPS site. Update DNS/CDN/WAF only through the authorized hosting panel.

The production deployment was not modified by this PR.
