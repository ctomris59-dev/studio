import type {NextConfig} from "next";

const noIndex=[
 {key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},
 {key:"X-Content-Type-Options",value:"nosniff"}
];
// Marketing pages use 300-second ISR and currently need inline Next.js
// hydration code. Their CSP cannot safely use a request nonce without disabling
// caching. Middleware applies strict nonce CSP on dynamic /workspace instead;
// upgrade cached routes to build-time script hashes only after browser verification.
const contentSecurityPolicy=[
 "default-src 'self'",
 "base-uri 'self'",
 "object-src 'none'",
 "frame-ancestors 'none'",
 "form-action 'self' https://*.paddle.com",
 "script-src 'self' 'unsafe-inline' https://*.paddle.com https://cdn.paddle.com",
 "script-src-attr 'none'",
 "style-src 'self' 'unsafe-inline' https://*.paddle.com",
 "img-src 'self' data: blob: https://*.paddle.com",
 "font-src 'self' data:",
 "connect-src 'self' https://*.paddle.com https://*.paddlepayments.com",
 "frame-src https://*.paddle.com https://*.paddlepayments.com",
 "media-src 'self' blob:",
 "upgrade-insecure-requests"
].join("; ");
// HSTS subdomain/preload scope is irreversible for clients over its max-age.
// Only opt in when every existing/future subdomain is HTTPS-only and the
// operator has approved preload requirements for the apex domain.
const hstsAllSubdomains=process.env.HSTS_ALL_SUBDOMAINS_HTTPS_VERIFIED==="true";
const hstsPreload=process.env.HSTS_PRELOAD_APPROVED==="true"&&hstsAllSubdomains;
const hstsValue="max-age=31536000"+(hstsAllSubdomains?"; includeSubDomains":"")+(hstsPreload?"; preload":"");
const publicSecurity=[
 {key:"Content-Security-Policy",value:contentSecurityPolicy},
 {key:"Strict-Transport-Security",value:hstsValue},
 {key:"X-Frame-Options",value:"DENY"},
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
 {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
];
const secure=[
 {key:"X-Frame-Options",value:"DENY"},
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"Referrer-Policy",value:"no-referrer"},
 {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
 {key:"Cache-Control",value:"private, no-store"}
];

const nextConfig:NextConfig={
 reactStrictMode:true,
 poweredByHeader:false,
 trailingSlash:false,
 async redirects(){
  return [
   {source:"/demo",destination:"/app-demo",permanent:true},
   {source:"/today",destination:"/app-demo?tour=1",permanent:true},
   {
    source:"/:path*",
    has:[{type:"host",value:"studiotasker.com"}],
    destination:"https://www.studiotasker.com/:path*",
    permanent:true
   }
  ];
 },
 async headers(){
  return [
   {source:"/:path*",headers:publicSecurity},
   {source:"/workspace/:path*",headers:[...secure,...noIndex]},
   {source:"/checkout",headers:noIndex},
   {source:"/app-demo",headers:noIndex},
   {source:"/book/preview",headers:noIndex},
   {source:"/api/:path*",headers:[...secure,{key:"X-Robots-Tag",value:"noindex, nofollow, nosnippet"}]}
  ];
 }
};

export default nextConfig;
