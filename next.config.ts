import type {NextConfig} from "next";

const noIndex=[
 {key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},
 {key:"X-Content-Type-Options",value:"nosniff"}
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
   {source:"/workspace/:path*",headers:[...secure,...noIndex]},
   {source:"/checkout",headers:noIndex},
   {source:"/app-demo",headers:noIndex},
   {source:"/book/preview",headers:noIndex},
   {source:"/api/:path*",headers:[...secure,{key:"X-Robots-Tag",value:"noindex, nofollow, nosnippet"}]}
  ];
 }
};

export default nextConfig;
