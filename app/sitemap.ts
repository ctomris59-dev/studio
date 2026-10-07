import type {MetadataRoute} from "next";
export default function sitemap():MetadataRoute.Sitemap{
 const base=(process.env.NEXT_PUBLIC_SITE_URL||"https://www.studiotasker.com").replace(/\/$/,"");
 const paths=[
  "",
  "/pilates-studio-software",
  "/yoga-studio-software",
  "/barre-studio-software",
  "/dance-studio-software",
  "/indoor-cycling-software",
  "/fitness-gym-software",
  "/boutique-fitness-software",
  "/compare",
  "/start",
  "/contact",
  "/legal",
  "/legal/security"
 ];
 return paths.map(path=>({url:base+path}));
}
