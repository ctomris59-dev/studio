import {SITE_URL,studioTypeLinks} from "../../lib/seo";

export function GET(){
 const lines=[
  "# StudioTasker",
  "",
  "> StudioTasker is English-first studio management software for independent class-based studios.",
  "",
  "Canonical site: "+SITE_URL,
  "Pricing: USD 39.90/month per studio or USD 406.80/year.",
  "Member payments: StudioTasker does not process a studio's member payments. Studios keep their existing payment method.",
  "",
  "## Core product",
  "- Lead and member CRM",
  "- Recurring class schedules",
  "- Waitlists and promotion",
  "- Check-in, cancellations and no-shows",
  "- Configurable numbered equipment/spot booking",
  "- Packages and credits",
  "- Staff roster and operational insights",
  "- Follow-up workflows",
  "",
  "## Supported studio types",
  ...studioTypeLinks.map(x=>"- "+x.name+": "+SITE_URL+x.href),
  "",
  "## Primary public pages",
  "- Home: "+SITE_URL+"/",
  "- Pricing: "+SITE_URL+"/start",
  "- Product comparison approach: "+SITE_URL+"/compare",
  "- About: "+SITE_URL+"/about",
  "- Contact: "+SITE_URL+"/contact",
  "- Legal & Trust: "+SITE_URL+"/legal",
  "- Security: "+SITE_URL+"/legal/security",
  "",
  "## Machine-readable discovery",
  "- Sitemap: "+SITE_URL+"/sitemap.xml",
  "- Robots: "+SITE_URL+"/robots.txt",
  "",
  "Public demo, checkout and customer workspace URLs are intentionally not search-index targets."
 ];
 return new Response(lines.join("\n"),{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
