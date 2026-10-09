import {NextRequest,NextResponse} from "next/server";

/**
 * Strict per-request CSP for the dynamic, authenticated workspace.
 * Marketing routes intentionally retain ISR and require a separate hash-based
 * rollout; sending nonces to a cached HTML page breaks hydration.
 *
 * Next.js extracts the nonce from the incoming Content-Security-Policy header
 * while rendering the workspace (app/workspace/page.tsx is force-dynamic).
 */
export function middleware(request:NextRequest){
 // Only the dynamic workspace requires a fresh response nonce.
 const reportingEndpoint=new URL("/api/security/csp-report",request.nextUrl.origin).href;
 const nonce=btoa(crypto.randomUUID());
 const policy=[
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.paddle.com",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.paddle.com https://cdn.paddle.com`,
  "script-src-attr 'none'",
  // Workspace uses React-generated inline style attributes; keep style policy
  // separate from script execution until a verified CSS refactor.
  "style-src 'self' 'unsafe-inline' https://*.paddle.com",
  "img-src 'self' data: blob: https://*.paddle.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.paddle.com https://*.paddlepayments.com",
  "frame-src https://*.paddle.com https://*.paddlepayments.com",
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
// favicon. A response-only header on public routes preserves ISR page caching.
export const config={matcher:["/workspace/:path*"]};
