import { chromium } from "playwright";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
await page.goto("http://127.0.0.1:3187/",{waitUntil:"networkidle"});
await page.screenshot({path:"final-preview/01-home-top.png",fullPage:false});
for(const [selector,name] of [
 [".ed-studio-types","02-studio-types.png"],
 [".ed-product-tour","03-product-tour.png"],
 [".ed-why","04-why-studiotasker.png"],
 [".ed-onboarding","05-self-serve-onboarding.png"]
]){
 const el=page.locator(selector).first();
 await el.scrollIntoViewIfNeeded();
 await page.waitForTimeout(300);
 await el.screenshot({path:"final-preview/"+name});
}
for(const [url,name] of [
 ["/start","06-start.png"],
 ["/checkout","07-checkout.png"],
 ["/app-demo","08-demo.png"]
]){
 await page.goto("http://127.0.0.1:3187"+url,{waitUntil:"networkidle"});
 await page.screenshot({path:"final-preview/"+name,fullPage:false});
}
await browser.close();
