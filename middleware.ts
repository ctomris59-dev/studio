import {NextRequest,NextResponse} from "next/server";

/**
 * Strict per-request CSP for every dynamically rendered HTML document.
 * The root layout is force-dynamic: Next.js reads this header during SSR and
 * stamps matching nonces on framework hydration scripts. Never cache these
 * HTML responses or enable static ISR without a tested hash-based policy.
 */
export function middleware(request:NextRequest){
 if(request.headers.get("rsc")==="1"||request.headers.has("next-router-prefetch")||
    request.headers.get("purpose")==="prefetch")return NextResponse.next();
 // No static/ISR HTML is served: all page responses use fresh nonces.
 const reportingEndpoint=new URL("/api/security/csp-report",request.nextUrl.origin).href;
 const nonce=btoa(crypto.randomUUID());
 const policy=[
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.paddle.com",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.paddle.com https://challenges.cloudflare.com`,
  "script-src-attr 'none'",
  // React components use inline style attributes. Style policy is separate
  // from script execution; remove style unsafe-inline only after CSS refactor.
  "style-src 'self' 'unsafe-inline' https://*.paddle.com https://challenges.cloudflare.com",
  "img-src 'self' data: blob: https://*.paddle.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.paddle.com https://*.paddlepayments.com https://challenges.cloudflare.com",
  "frame-src https://*.paddle.com https://*.paddlepayments.com https://challenges.cloudflare.com",
  "media-src 'self' blob:",
  "upgrade-insecure-requests",
  "report-uri /api/security/csp-report",
  "report-to studio-csp"
 ].join("; ");
 const headers=new Headers(request.headers);
 headers.set("Content-Security-Policy",policy);
 headers.set("x-nonce",nonce);
 const response=NextResponse.next({request:{headers}});
 response.headers.set("Content-Security-Policy",policy);
 response.headers.set("Reporting-Endpoints",`studio-csp="${reportingEndpoint}"`);
 // The nonce must never become a reusable cached page response.
 response.headers.set("Cache-Control","private, no-store");
 return response;
}

// Intercept document routes only; exclude API, static chunks, image optimizer,
// SEO data, static metadata and icons. RSC prefetch responses must not create
// standalone navigation nonces.
export const config={matcher:[
 "/((?!api/|_next/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|twitter-image|icon|apple-icon|\\.well-known/).*)"
]};
