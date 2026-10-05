import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers(){
    const secure=[
      {key:"X-Frame-Options",value:"DENY"},
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"Referrer-Policy",value:"no-referrer"},
      {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
      {key:"Cache-Control",value:"private, no-store"}
    ];
    return [{source:"/workspace",headers:secure},{source:"/book/:path*",headers:secure},{source:"/api/:path*",headers:secure}];
  },
};

export default nextConfig;
