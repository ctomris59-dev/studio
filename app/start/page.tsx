import Link from "next/link";
import {ArrowLeft,ArrowRight,Globe2,ShieldCheck} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "./start.css";
import {Suspense} from "react";
import {PlanCards,PlanSelector} from "./plan-selector";
import {commercialRegistrationReady} from "../../lib/server/release-config";

export const metadata={title:"StudioTasker Pricing | Monthly & Annual Plans",description:"StudioTasker costs $39.90/month per studio or $406.80/year. Compare monthly and annual billing for the full studio management workspace.",alternates:{canonical:"/start"},robots:{index:true,follow:true}};

// Rendered dynamically by root layout to guarantee fresh CSP script nonces.
export default function StartPage(){
 const registrationOpen=Boolean(process.env.DATABASE_URL)&&process.env.AUTH_ALLOW_REGISTRATION==="true"&&commercialRegistrationReady();
 return <main className="st-start"><a className="studio-skip-link" href="#main-content">Skip to main content</a>
  <header className="st-start-top">
   <Link href="/" className="st-start-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <div className="st-start-top-actions"><Link href="/app-demo">Try demo</Link><Link href="/workspace">Customer sign in</Link></div>
  </header>

  <section id="main-content" tabIndex={-1} className="st-start-hero">
   <div className="st-start-intro">
    <div className="st-start-intro-meta">
     <Link href="/" className="st-start-back"><ArrowLeft size={17}/> Back to StudioTasker</Link>
     <span className="st-start-kicker">START STUDIOTASKER · GLOBAL</span>
    </div>
    <h1>Simple pricing. <em>Everything included.</em></h1>
    <p>One complete studio workspace. Choose flexible monthly billing or save $72 with an annual plan.</p>
   </div>
   <nav className="st-start-price-glance" aria-label="Jump to monthly or annual plan">
    <a href="#monthly-plan"><span>MONTHLY</span><strong>$39.90<small> / month</small></strong></a>
    <a href="#annual-plan"><span>ANNUAL <b>· SAVE $72</b></span><strong>$406.80<small> / year</small></strong><em>$33.90/month equivalent</em></a>
   </nav>
   {!registrationOpen&&<div className="st-start-availability" role="status"><ShieldCheck size={19}/><div><strong>New studio subscriptions are not open yet.</strong><span>Explore our demo before launch. No payment or account required.</span></div></div>}
   <Suspense fallback={<PlanCards selected="monthly" registrationOpen={registrationOpen}/>}>
    <PlanSelector registrationOpen={registrationOpen}/>
   </Suspense>
   <div className="st-start-postscript">
    <div className="st-start-plan-summary"><ShieldCheck size={18}/><span>Both plans include the same studio features. Your choice only changes the billing period.</span></div>
    <div className="st-start-steps" aria-label={registrationOpen?"Getting started":"Preview steps"}>
     <span><b>1</b> Compare plans</span><i/><span><b>2</b> {registrationOpen?"Create studio":"Explore demo"}</span><i/><span><b>3</b> {registrationOpen?"Start using it":"Join when open"}</span>
    </div>
    <div className="st-start-global"><Globe2 size={19}/><span>USA · Canada · UK · Europe · International</span><small>English-first · studio timezone & 12/24-hour clock supported</small></div>
   </div>

   <div className="st-start-trust" aria-label="Pricing, data and support information">
    <Link href="/legal/security"><ShieldCheck size={17}/> Security practices</Link>
    <Link href="/legal/cancellation">Cancellation &amp; refunds</Link>
    <Link href="/legal/privacy">Privacy policy</Link>
    <Link href="/contact">Contact support</Link>
   </div>
   <div className="st-start-legal"><ShieldCheck size={18}/><span>Review our <Link href="/legal/terms">Terms</Link>, <Link href="/legal/dpa">DPA</Link> and <Link href="/legal/privacy">Privacy Policy</Link> before subscribing. Acceptance is recorded at account creation and subscription changes.</span></div>
   <div className="st-start-help">
    <ShieldCheck size={22}/>
    <div><b>Not ready to buy yet?</b><span>Try the full owner demo with sample data first. No account is required.</span></div>
    <Link href="/app-demo">TRY THE DEMO <ArrowRight size={19}/></Link>
   </div>
  </section>
 </main>;
}
