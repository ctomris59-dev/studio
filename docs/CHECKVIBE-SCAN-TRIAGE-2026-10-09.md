# CheckVibe scan triage – 9 October 2026

This note separates **image filesystem contents**, **application production
dependencies**, **development-only test dependencies**, static rule matches and
third-party license obligations. Scanner severity is not proof that an exploit
path is reachable in StudioTasker.

## Remediated by the Docker/lockfile hardening change

- **CVE-2026-14257**, `brace-expansion@2.0.2` (HIGH):
  appears in the npm CLI bundled by the Node base image, not the StudioTasker
  application lockfile. The production stage **removes npm and npx**. The builder
  still uses npm to install dependencies; it is not shipped in the final
  image. Use the final runtime image as the scanner target.
- **CVE-2026-33671**, `picomatch@4.0.3` (HIGH): same npm CLI toolchain
  remediation. User-controlled glob patterns are not exposed by StudioTasker's
  customer HTTP API.
- **CVE-2026-48758**, `@sigstore/core@2.0.0` (MEDIUM): same npm CLI
  toolchain remediation. No customer-exposed DSSE verification exists here.
- **CVE-2026-85091**, `zlib@1.3.2-r0` (Alpine): the runtime stage uses
  Alpine 3.24, upgrades installed Alpine packages and **fails image build**
  when zlib is older than `1.3.2-r1`. CI executes that check in a real
  runtime-tools container. A package already fixed in the Alpine repos is
  preferable to hand-patching upstream C libraries.
- **GHSA-w5hq-g745-h8pq**, `uuid@8.3.2` (MEDIUM): development/test-only
  dependency pulled through `exceljs@4.4.0`. Override to CommonJS-capable
  `uuid@11.1.1` and continue running a real Excel XLSX round-trip regression
  in CI. The production runtime does not require ExcelJS.

## Cases requiring separate review, not automatic patching

- **SQL built from strings: scripts/test-restore-e2e.cjs**: an isolated CI
  restore drill, not a customer HTTP endpoint. Table names originate from
  PostgreSQL's `pg_tables` catalogue and are escaped as SQL identifiers.
  Table names are not bind-value parameters in PostgreSQL. Its database name
  comes from `crypto.randomUUID()`, not input from a client request. Treat
  the generic static match as **not confirmed exploitable**.
- **React insecure request: scripts/test-api.cjs, test-browser.cjs,
  test-seo-http.cjs**: these are **Node-only automated test harnesses** that
  call `http://127.0.0.1` on temporary local Next.js/Chrome servers.
  They do not send customer credentials across a production network.
  Changing local test URLs to public HTTPS would be a testing regression.
- **Mixed LGPL licenses**: lockfile entries from `@img/sharp-libvips-*`,
  `@img/sharp-wasm32`, and `@img/sharp-win32-*` have LGPL or combined
  SPDX license expressions. Most are optional OS/CPU-specific Sharp binary
  packages; their presence in the *lockfile* does not mean each binary is
  installed in a Linux-musl production image. License notices and the
  obligations for the *actual redistributed binaries* still require review.
  Do **not** override/remove license metadata to silence this scan.
- **Locked/upgrade-only CheckVibe rules**: their text and technical evidence
  are unavailable. They are **unverified**, not fixed or dismissed.

## Operational proof still needed

After merging, build a new production image **without reusing the previously
scanned image digest**, scan its complete final filesystem/SBOM, and report
the package paths, whether each issue is `fixed`/`not affected`/open,
and the digest of the deployed image. In particular verify:

1. `node`, `pg_dump` and `rclone` are present, but `npm` and `npx`
   are **absent** in the final image.
2. `apk info -v zlib` reports version `1.3.2-r1` or newer.
3. The configured hosting-panel scheduled jobs invoke
   `node scripts/process-mail.cjs`, `node scripts/clean-expired-links.cjs`,
   `node scripts/backup-postgres.cjs` and `node scripts/backup-offsite.cjs`.
   Do not use `npm run` inside this runtime image.
4. The panel's actual mail delivery, backup, off-site copy and restore drill
   complete and are logged. Source control changes cannot prove deployment.

### Sources

- [brace-expansion advisory](https://github.com/advisories/GHSA-mh99-v99m-4gvg)
- [picomatch advisory](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj)
- [sigstore advisory](https://github.com/advisories/GHSA-jfc7-64v2-mr8c)
- [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- [Alpine zlib security status](https://security.alpinelinux.org/vuln/CVE-2026-85091)
