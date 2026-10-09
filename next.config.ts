import type {NextConfig} from "next";

const noIndex=[
 {key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},
 {key:"X-Content-Type-Options",value:"nosniff"}
];
// Conservative CSP allowing only current app/CDN resources and hosted Paddle checkout.
// Inline script/style remain allowed for Next.js hydration and third-party checkout.
// Tighten to nonce-based CSP after a dedicated browser compatibility test.
const contentSecurityPolicy=[
 "default-src 'self'",
 "base-uri 'self'",
 "object-src 'none'",
 "frame-ancestors 'none'",
 "form-action 'self' https://*.paddle.com",
 "script-src 'self' 'unsafe-inline' https://*.paddle.com https://cdn.paddle.com",
 "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.paddle.com",
 "img-src 'self' data: blob: https://images.pexels.com https://*.paddle.com",
 "font-src 'self' data: https://fonts.gstatic.com",
 "connect-src 'self' https://*.paddle.com https://*.paddlepayments.com",
 "frame-src https://*.paddle.com https://*.paddlepayments.com",
 "media-src 'self' blob:",
 "upgrade-insecure-requests"
].join("; ");
const publicSecurity=[
 {key:"Content-Security-Policy",value:contentSecurityPolicy},
 {key:"Strict-Transport-Security",value:"max-age=31536000"},
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
