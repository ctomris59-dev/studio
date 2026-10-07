# StudioTasker Global SEO Runbook

## Index architecture
Index only pages that can satisfy a search intent: home, pricing, contact, comparison, seven vertical studio pages, Legal & Trust, and Security. Demo, workspace, checkout, booking preview and detailed contract/privacy documents are intentionally excluded from the XML sitemap and use noindex.

Do not block a URL in robots.txt merely to make it disappear from Search. If Google must see a noindex directive, it must be able to crawl the response. API routes are the exception: they are not documents and are disallowed.

## Crawl -> render -> index
The commercial acquisition pages are Next.js server components. Their headings, copy, canonical tags, JSON-LD and internal links are in initial server HTML. Client-side React is reserved for interactive islands and the noindex demo/workspace. Never move critical acquisition copy or primary internal links into post-hydration-only code without a specific reason.

Keep /_next/ JS and CSS crawlable. A 200 response should contain useful HTML before JavaScript executes.

## Canonical and redirects
Canonical host: https://www.studiotasker.com
- non-www -> www: permanent 308
- /demo -> /app-demo: permanent 308
- /today -> /app-demo?tour=1: permanent 308
- tracking and plan query parameters canonicalize to the clean page URL.
Avoid redirect chains. Update internal links to final destinations rather than relying on redirects.

## Soft 404 and removed URLs
Unknown URLs must return an actual HTTP 404, not a 200 page saying "not found". A permanently removed URL with no close replacement should be 404/410. A URL with a true successor should use a permanent redirect to the closest equivalent.

## Sitemap
The sitemap contains only canonical, indexable 200 URLs. Do not add demo, workspace, checkout, API, redirects, or noindex pages. Do not manufacture lastmod timestamps unless they reflect a real material content change.

## Facets, filters, pagination, infinite scroll
StudioTasker currently has no public faceted category system, so do not create crawlable URL combinations for filters. If a future directory or marketplace is added:
- define which facets have independent search demand before making them indexable;
- canonicalize or block crawl-waste combinations;
- keep filter/sort parameters out of sitemaps;
- provide real paginated href links for discovery even if the UI also uses infinite scroll.

## International SEO
Do not create US, UK, DE, FR, etc. copies by changing only country names. Localization is not translation.
Create a regional URL only after SERP/intent research proves meaningful differences in terminology, search demand, product expectations or conversion copy. When real alternates exist, use reciprocal hreflang and self-canonicals. Until then, one strong English international site is cleaner than thin regional duplicates.

Suggested future research clusters:
- US: studio management software, fitness studio software, class scheduling software
- UK: studio management software, class booking system, fitness booking software
- Germany: research German-language intent and local competitors before /de-de/ exists
Each market gets its own SERP and competitor analysis.

## Structured data
Home: Organization + WebSite + Service. Do not add SoftwareApplication rich-result markup until genuine review/rating data exists, because Google requires a review or aggregate rating for SoftwareApplication rich-result eligibility.
Vertical pages: FAQPage + BreadcrumbList.
Never invent customer reviews, aggregate ratings, inventory, discounts or availability. Add review/rating schema only after genuine attributable customer reviews exist.
StudioTasker is SaaS, not a physical catalog. Merchant Center feeds, product variants, shipping schema and inventory feeds are not added unless the business model materially changes.

## Internal linking
Home links to all seven vertical pages in server HTML. Every vertical links to the other studio categories, pricing, demo and comparison. Keep descriptive anchor text. Prevent orphan pages by requiring every indexable page to have at least one crawlable internal href from another indexable page.

## AI answer/search engines
robots.txt explicitly permits OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot and Google-Extended while keeping API routes out of crawl. OAI-SearchBot is the important OpenAI crawler for ChatGPT Search discovery; crawler access does not guarantee citation or ranking.
llms.txt provides concise canonical facts and primary URLs. It is supplemental, not a guaranteed ranking standard.
Factual claims such as price, supported verticals and payment boundaries should remain consistent across visible copy, JSON-LD and llms.txt.
Do not create fake "AI optimized" content or synthetic reviews.

## Server log analysis
Nginx example logs crawler traffic to /var/log/nginx/studiotasker-seo.log.
Run:
npm run seo:logs -- /var/log/nginx/studiotasker-seo.log

Review:
- Googlebot/OAI/Perplexity crawl volume
- top crawled URLs
- unexpected query-parameter crawl
- 3xx chains
- 4xx/5xx errors
- slow crawler responses
- repeated crawling of low-value URLs

A crawler surge should be diagnosed in access logs before changing robots.txt or rate limits.

## Launch verification
After www.studiotasker.com is live:
1. Verify HTTPS and one-hop non-www -> www redirects.
2. Submit /sitemap.xml in Google Search Console and Bing Webmaster Tools.
3. Inspect raw HTML and rendered DOM for home + each vertical.
4. Use Google URL Inspection on representative pages.
5. Validate JSON-LD with Rich Results Test / Schema validator.
6. Verify real 404 status on a random nonexistent URL.
7. Verify noindex on /app-demo, /workspace, /checkout and /book/preview.
8. Confirm robots.txt is reachable with HTTP 200 and does not block /_next/.
9. Check access logs after Googlebot crawls the new host.
10. Compare indexed canonical URL with declared canonical in Search Console.

## Ongoing cadence
Weekly during launch month: index coverage, crawl errors, redirects, Core Web Vitals, query impressions and log crawl patterns.
Monthly: country/device/query intent, pages with impressions but weak CTR, orphan/broken links, stale claims and structured-data validation.
Quarterly: competitor SERPs by target country, content gaps, backlink/referring-domain quality, localization decisions and AI-search citations.


## Nginx crawler-log format
Use a dedicated tab-delimited log so the bundled analyzer can measure crawl -> status -> latency without parsing application logs:

```nginx
log_format studiotasker_seo '$time_iso8601\t$remote_addr\t$host\t$request_method\t$uri\t$args\t$status\t$body_bytes_sent\t$http_user_agent\t$request_time\t$sent_http_location';
map $http_user_agent $is_seo_bot {
 default 0;
 ~*googlebot 1;
 ~*bingbot 1;
 ~*OAI-SearchBot 1;
 ~*GPTBot 1;
 ~*ChatGPT-User 1;
 ~*PerplexityBot 1;
}
access_log /var/log/nginx/studiotasker-seo.log studiotasker_seo if=$is_seo_bot;
```

At this site size, "crawl budget optimization" means preventing crawl traps, not artificially reducing useful crawling. There is no public faceted navigation today, so do not add robots rules for hypothetical filters. If filters are introduced later, measure log demand first and decide indexability facet by facet.
