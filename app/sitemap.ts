import type {MetadataRoute} from "next";
export default function sitemap():MetadataRoute.Sitemap{
 const base=(process.env.NEXT_PUBLIC_SITE_URL||"https://studio-indol-seven.vercel.app").replace(/\/$/,"");
 const routes=[
  ["",1,"daily"],
  ["/pilates-studio-software",0.9,"weekly"],
  ["/compare",0.9,"weekly"],
  ["/start",0.8,"weekly"],
  ["/today",0.8,"weekly"],
  ["/app-demo",0.7,"weekly"],
  ["/legal",0.4,"monthly"],
  ["/legal/terms",0.3,"monthly"],
  ["/legal/privacy",0.3,"monthly"],
  ["/legal/turkiye-privacy",0.3,"monthly"],
  ["/legal/dpa",0.3,"monthly"],
  ["/legal/cancellation",0.3,"monthly"],
  ["/legal/cookies",0.2,"monthly"],
  ["/legal/subprocessors",0.2,"monthly"],
  ["/legal/security",0.2,"monthly"]
 ] as const;
 return routes.map(([path,priority,changeFrequency])=>({url:base+path,lastModified:new Date(),changeFrequency,priority}));
}
