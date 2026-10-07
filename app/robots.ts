import type {MetadataRoute} from "next";
export default function robots():MetadataRoute.Robots{
 const base=(process.env.NEXT_PUBLIC_SITE_URL||"https://www.studiotasker.com").replace(/\/$/,"");
 return {
  rules:[
   {userAgent:"*",allow:"/",disallow:["/api/"]},
   {userAgent:"OAI-SearchBot",allow:"/",disallow:["/api/"]},
   {userAgent:"PerplexityBot",allow:"/",disallow:["/api/"]},
   {userAgent:"Google-Extended",allow:"/",disallow:["/api/"]}
  ],
  sitemap:base+"/sitemap.xml"
 };
}
