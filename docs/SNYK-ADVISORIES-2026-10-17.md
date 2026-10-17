# StudioTasker Snyk advisory triage — 17 October 2026

Scope: GitHub's current `main` uses pinned `next@15.5.27`, an Ubuntu 24.04 production VPS running Next.js/PM2, and a **separate** optional Alpine 3.24 Docker build. A scanner's package attribution is not proof that the actual Contabo VPS runs that Docker image or the commit in this repository.

## Next.js alerts

| Advisory | Upstream affected range / prerequisites | StudioTasker disposition |
| --- | --- | --- |
| CVE-2025-59472 | Denial of service in Partial Pre-Rendering resume requests. Requires `experimental.ppr: true` or `cacheComponents: true`, **and** `NEXT_PRIVATE_MINIMAL_MODE=1`. | The Next 15 config does not enable PPR or Cache Components; these are now CI guarded. Confirm the real server environment before treating this as proven absent in production. A major migration solely for this alert is not necessary for the reviewed source. |
| CVE-2026-27980 | Unbounded `/_next/image` cache. Upstream GitHub advisory lists affected Next 15 builds **before 15.5.14**; fixed in 15.5.14 and 16.1.7. | `next@15.5.27` is on the patched 15.x branch. Current remotePatterns already restricts remote image optimization to the exact approved Pexels image. |
| CVE-2026-94543 | Cache poisoning for SSG/ISR Pages Router. Affected Next 15 versions **before 15.5.27** and Next 16 versions before 16.3.8. | Version 15.5.27 is itself the upstream 15.x fixed release. The app uses App Router, and marketing HTML nonce CSP currently forces dynamic rendering. |
| CVE-2026-94544 | Cross-request `use cache` and Draft Mode confusion. Affected Next **16.3.0–16.3.7**, fixed 16.3.8; needs Cache Components / experimental.useCache with draft-dependent cached functions. | `next@15.5.27` is **outside** the affected version range and does not enable that caching mode. |

**Evidence / official advisories**
- [Next.js PPR denial of service (CVE-2025-59472)](https://github.com/vercel/next.js/security/advisories/GHSA-5f7q-jpqc-wp7h)
- [Next/image disk cache growth (CVE-2026-27980)](https://github.com/vercel/next.js/security/advisories/GHSA-3x4c-7xq6-9pq8)
- [Next cache poisoning (CVE-2026-94543)](https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676)
- [Next 16 Draft Mode use-cache bug (CVE-2026-94544)](https://github.com/vercel/next.js/security/advisories/GHSA-3w37-wq28-93x7)

### Recommendation

Do **not** blindly upgrade the existing production platform from Next 15.5.27 to 16.3.8 to make a generic package scanner score greener. A major version migration can change middleware/proxy behavior, caching, CSP nonces, image optimizations and React hydration. Pursue it later in an isolated branch with the **same full HTTP, database, browser, Docker and Paddle regressions**, and a verified fresh production backup before deploying.

The source test now verifies the exact patched `next@15.5.27` version matches `package-lock.json` and rejects accidental PPR or minimal mode opt-ins. `npm audit --omit=dev --audit-level=high` remains required in GitHub CI. If Snyk still reports 15.5.27 as vulnerable to an already patched advisory, rescan the latest commit and attach the upstream affected-version evidence to a narrow, expiring false-positive exception; do not globally suppress Next alerts.

## Alpine container package alerts

| Alert | Required fixed version | Protection in repository |
| --- | --- | --- |
| CVE-2026-85091, `zlib` | `1.3.2-r1` | Already verified by Dockerfile and CI with `apk version -t`. |
| CVE-2026-14456 / CVE-2026-14457, `libcrypto3` and `libssl3` | `3.5.8-r0` | Docker runtime runs `apk upgrade --no-cache` and now **fails the build** unless *both* installed packages are at least 3.5.8-r0. GitHub CI separately checks the built runtime-tools image. |

These Alpine packages are **not** necessarily installed on the Ubuntu Contabo VPS. This update protects newly built Docker images only. It does not patch a previously published image, a server image that is not deployed, or the Ubuntu host. Do not claim the production VPS is updated until its running packages and deployed image/code are independently verified.

## Acceptance

1. GitHub CI: dependency audit, pinned Next lock consistency, no unsafe experimental build modes, refreshed Alpine runtime image and minimum OpenSSL/zlib checks, full Docker smoke, authenticated API tests, frontend Chromium smoke.
2. Separately verify the **actual** Contabo process and environment; do not paste credentials or `.env.production` contents into a ticket or chat.
3. Fix the existing failing encrypted PostgreSQL backup service and verify offsite restore before applying a large new production release.
4. Re-run Snyk on the **exact built artifact** and compare scanner inventory and upstream affected-version ranges. A green source scan does not establish a patched live VPS.
