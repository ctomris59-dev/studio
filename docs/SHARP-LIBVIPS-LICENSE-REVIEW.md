# Sharp/libvips and JSON-LD scanner findings (October 2026)

## 1. JSON-LD and dangerous HTML insertion

`components/json-ld.tsx` contains one deliberate use of React's
`dangerouslySetInnerHTML` for an **inert** `application/ld+json` script.

The serializer is now isolated in `lib/jsonld-safe.cjs` and tested by
`scripts/test-jsonld.cjs` against `</script><img onerror>`, mixed-case
closing tags, malicious SVG markup, HTML delimiters and Unicode line separators.
It serializes with `JSON.stringify` and escapes `<`, `>`, `&`, U+2028 and
U+2029 as JSON-compatible Unicode escape sequences **before** React inserts it.

This is the recommended approach in Next.js's [JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld).
A generic code rule matching any non-constant `dangerouslySetInnerHTML` cannot
by itself prove an XSS exploit. The sink is constrained and explicitly
security-tested. The source scanner continues to **fail on any other** newly
introduced direct HTML assignment or raw JSX injection.

Do not silence the scanner with a general exclusion of this file or switch to
an unescaped dynamic HTML string.

## 2. @img/sharp-libvips-* LGPL-3.0-or-later

The entries shown in the CheckVibe screenshot are **platform-specific,
optional prebuilt Sharp/libvips artifacts** from the Next.js dependency graph,
not 13 separate copies running on the StudioTasker server. For a typical
Linux x64 Alpine/musl runtime the relevant artifact is
`@img/sharp-libvips-linuxmusl-x64`; macOS, Windows and other CPU variants
are not runnable on that server. Verify the **actual deployed image SBOM**,
rather than interpreting every package in a cross-platform lockfile as
installed or shipped.

**Important:** the LGPL-3.0-or-later license does **not automatically
require the complete StudioTasker proprietary application source to be
released**. The LGPL explicitly permits combining and distributing separately
licensed applications with a library, subject to its conditions.

For a proprietary SaaS operated on a server, merely serving the application
over HTTPS normally is not the same as distributing its server-side binaries to
end users. Supplying Docker images, executables or packages to customers,
partners, on-premise deployers or other third parties **does create
distribution questions** and may trigger LGPL sections 3–4:

- Provide attribution and the applicable LGPL/GPL license texts.
- Offer the corresponding source of the LGPL-covered library and modifications
  (if any), and preserve its notices.
- Ensure the recipient can replace/relink the LGPL-covered library in a
  compliant way (e.g. dynamic library linking) or supply the corresponding
  relinkable application code, as relevant to the actual distribution method.
- Do not represent these notices as requiring publication of unrelated
  StudioTasker business-logic source.
- Do not remove package license metadata or `sharp` merely to improve a
  superficial scanner score. Removing `sharp` can break Next.js image
  optimization.

**Pre-distribution checkpoint** (requires legal review):
record the precise binary and version actually shipped; obtain complete
license texts and the relevant source-code offer; validate how the native
library is dynamically linked and replaceable; document any modifications and
keep distribution records. If an LGPL condition cannot be met, choose a
differently licensed alternative before **distributing binaries**.

Sources:
- [GNU LGPL v3 full terms](https://www.gnu.org/licenses/lgpl-3.0.html)
- [Next.js JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld)
- [Sharp licensing/project](https://sharp.pixelplumbing.com/)

This is a technical compliance analysis, not a formal legal opinion.
