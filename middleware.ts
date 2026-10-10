import {NextRequest,NextResponse} from "next/server";

/**
 * Strict per-request CSP for ALL HTML pages. The root layout reads x-nonce,
 * which forces dynamic rendering; never combine per-request nonces with ISR.
 *
 * Next.js extracts the nonce from the incoming Content-Security-Policy header
 * and applies it to its rendered hydration scripts.
 */
export function middleware(request:NextRequest){
 // Nonces are fresh per HTML response, including public marketing pages.
 const reportingEndpoint=new URL("/api/security/csp-report",request.nextUrl.origin).href;
 const nonce=btoa(crypto.randomUUID());
 const policy=[
  "default-src 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.paddle.com",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.paddle.com https://cdn.paddle.com https://challenges.cloudflare.com`,
  "script-src-attr 'none'",
  `style-src 'self' 'nonce-${nonce}' https://*.paddle.com https://challenges.cloudflare.com`,
  "style-src-attr 'none'",
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

// Never intercept Next static chunks, optimizer, metadata image assets or
// favicon. HTML responses are intentionally dynamic for nonce isolation.
export const config={matcher:[
 "/((?!api/|_next/|favicon.ico|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:png|jpe?g|webp|avif|gif|ico|svg|woff2?|txt|xml|webmanifest)).*)"
]};
