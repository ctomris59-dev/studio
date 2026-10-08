import type {Metadata} from "next";
import Link from "next/link";
import {
  Activity, ArrowRight, ArrowUpRight, Check, Clock3,
  CreditCard, Dumbbell, HeartPulse, ShieldCheck, Users, Waves
} from "lucide-react";
import "./editorial.css";
import { StudioTaskerMark } from "../components/studio-tasker-mark";
import ProductTourTabs from "../components/product-tour-tabs";
import {JsonLd} from "../components/json-ld";
import {websiteJsonLd} from "../lib/seo";
import { legalOperator } from "../lib/server/legal-config";

export const metadata:Metadata={
 title:"StudioTasker | Studio Management Software for Independent Studios",
 description:"Manage recurring classes, waitlists, bookings, members, credits, attendance, staff and follow-up with StudioTasker. Built for independent class-based studios worldwide.",
 alternates:{canonical:"/"},
 openGraph:{type:"website",url:"/",siteName:"StudioTasker",title:"StudioTasker | Studio Management Software",description:"Focused studio management software for independent class-based studios.",images:["/opengraph-image"]},
 twitter:{card:"summary_large_image",title:"StudioTasker | Studio Management Software",description:"Focused studio management software for independent class-based studios.",images:["/opengraph-image"]}
};

const timetable = [
  { time: "07:30", title: "Morning Flow", coach: "Sophie M.", spots: "6 / 8", state: "OPEN", value: 75 },
  { time: "09:00", title: "Reformer Foundations", coach: "Olivia K.", spots: "8 / 8", state: "FULL", value: 100 },
  { time: "12:30", title: "Midday Sculpt", coach: "Ava R.", spots: "5 / 8", state: "OPEN", value: 63 },
  { time: "17:30", title: "Evening Reset", coach: "Sophie M.", spots: "7 / 8", state: "OPEN", value: 88 },
];

const studioTypes = [
  {name:"PILATES / REFORMER",short:"PILATES",copy:"Reformer classes, packages, credits and attendance.",href:"/pilates-studio-software",Icon:Activity},
  {name:"YOGA",short:"YOGA",copy:"Classes, workshops, member records and scheduling.",href:"/yoga-studio-software",Icon:HeartPulse},
  {name:"BARRE",short:"BARRE",copy:"Class capacity, waitlists and package usage.",href:"/barre-studio-software",Icon:Waves},
  {name:"DANCE",short:"DANCE",copy:"Lessons, levels, student records and bookings.",href:"/dance-studio-software",Icon:Users},
  {name:"INDOOR CYCLING",short:"CYCLING",copy:"Bike spots, waitlists, check-in and timetables.",href:"/indoor-cycling-software",Icon:Activity},
  {name:"FITNESS & GYM",short:"FITNESS",copy:"Group classes, personal training and members.",href:"/fitness-gym-software",Icon:Dumbbell},
  {name:"BOUTIQUE FITNESS",short:"BOUTIQUE",copy:"Leads, classes, credits and follow-up workflows.",href:"/boutique-fitness-software",Icon:Waves}
];

function Identity({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={"ed-identity" + (inverse ? " ed-identity-inverse" : "")} aria-label="StudioTasker home">
      <StudioTaskerMark className="ed-identity-icon"/>
      <span>studio<span className="ed-identity-strong">tasker</span><span className="ed-identity-dot">.</span></span>
    </Link>
  );
}

function PreviewDashboard() {
  return (
    <div className="ed-preview-dashboard" aria-label="Illustrative StudioTasker studio overview with fictional sample data">
      <div className="ed-preview-toolbar">
        <span className="ed-preview-brand-mark"><StudioTaskerMark/></span>
        <div className="ed-preview-brand-name"><strong>Willow Studio</strong><span>Studio overview</span></div>
        <span className="ed-preview-sample">SAMPLE DATA</span>
      </div>
      <div className="ed-preview-body">
        <p className="ed-preview-day">WEDNESDAY / DAILY OVERVIEW</p>
        <h3>Today at a glance.</h3>
        <div className="ed-preview-stats" aria-label="Example studio activity">
          <div><span>CLASSES</span><strong>8</strong></div>
          <div><span>BOOKINGS</span><strong>42</strong></div>
          <div><span>CAPACITY</span><strong>84%</strong></div>
        </div>
        <div className="ed-preview-schedule-title"><strong>Today's classes</strong><span>3 of 8 shown</span></div>
        <div className="ed-preview-classes">
          {timetable.slice(0, 3).map((item) => (
            <div className="ed-preview-class-row" key={item.time}>
              <span className="ed-preview-time">{item.time}</span>
              <div className="ed-preview-class-detail"><strong>{item.title}</strong><span>{item.coach} · {item.spots} booked</span></div>
              <span className={"ed-preview-state" + (item.state === "FULL" ? " ed-preview-state-full" : "")}>{item.state}</span>
            </div>
          ))}
        </div>
        <Link className="ed-preview-demo-link" href="/app-demo?tour=1">
          EXPLORE THE INTERACTIVE DEMO <ArrowUpRight size={19}/>
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  const op=legalOperator();
  return (
    <div className="editorial">
      <JsonLd data={websiteJsonLd()}/>
      <div className="ed-topline"><div className="ed-container"><span>SOFTWARE FOR THE SPACE YOU&apos;VE BUILT.</span><span>INDEPENDENT STUDIOS · USA · CANADA · UK · EUROPE · INTERNATIONAL <span className="ed-star"><Activity size={12}/></span></span></div></div>
      <header className="ed-header">
        <div className="ed-container ed-nav">
          <Identity/>
          <nav aria-label="Main navigation"><a href="#pricing">Pricing</a><a href="#studio-types">Studio types</a><a href="#product-tour">Product tour</a><a href="#why">Why StudioTasker</a><Link href="/contact">Contact</Link></nav>
          <div className="ed-nav-actions"><Link className="ed-customer-login" href="/workspace">CUSTOMER SIGN IN</Link><Link className="ed-nav-demo" href="/app-demo">TRY DEMO</Link><Link className="ed-nav-cta" href="/start">BUY NOW · $39.90 <ArrowUpRight size={16}/></Link></div>
        </div>
      </header>

      <main>
        <section className="ed-hero" aria-labelledby="main-heading">
          <div className="ed-container ed-hero-grid">
            <div className="ed-hero-copy">
              <div className="ed-hero-brand">
                <span className="ed-hero-brand-icon"><StudioTaskerMark/></span>
                <div><strong>StudioTasker</strong><small>GLOBAL STUDIO MANAGEMENT SOFTWARE</small></div>
              </div>
              <div className="ed-index">PILATES · YOGA · BARRE · BOUTIQUE FITNESS</div>
              <h1 id="main-heading">LESS<br/>ADMIN.<br/><span>MORE</span><br/><em>MOVEMENT.</em></h1>
              <div className="ed-hero-under">
                <p>StudioTasker keeps member relationships, classes, package entitlements and follow-ups in one place for independent studios worldwide.</p>
                <div className="ed-hero-action-stack">
                  <Link className="ed-buy-cta ed-buy-cta-solo" href="/start"><span className="ed-buy-only">ONLY $39.90 / MONTH</span><strong>START STUDIOTASKER</strong><ArrowUpRight size={22}/></Link>
                  <div className="ed-hero-quick-links">
                    <Link className="ed-demo-compact" href="/app-demo?tour=1"><span>WATCH 90-SEC DEMO</span><small>No sign-up</small><ArrowRight size={16}/></Link>
                    <Link className="ed-annual-compact" href="/start?plan=annual"><span>ANNUAL · $33.90/MO</span><small>SAVE $72/YEAR</small><ArrowUpRight size={16}/></Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="ed-hero-canvas">
              <div className="ed-preview-intro">
                <span className="ed-preview-eyebrow">STUDIOTASKER / PRODUCT PREVIEW</span>
                <h2>See your studio in one clear view.</h2>
                
              </div>
              <PreviewDashboard/>
              
            </div>
          </div>
          <div className="ed-hero-end ed-container"><span>BUILT FOR INDEPENDENT STUDIOS WORLDWIDE · ENGLISH-FIRST · STUDIO-CONTROLLED MEMBER PAYMENTS</span><a href="#pricing">SEE PRICING <span>↓</span></a></div>
        </section>

        <section className="ed-impact-band" aria-labelledby="impact-band-title">
          <div className="ed-container">
            <div className="ed-impact-card">
              <img
                src="https://images.pexels.com/photos/3775566/pexels-photo-3775566.jpeg?auto=compress&cs=tinysrgb&w=1800"
                alt="Group of people doing squats together during a fitness class in a brick-walled studio"
                width="1800"
                height="1200"
                loading="lazy"
                decoding="async"
              />
              <div className="ed-impact-overlay">
                <span className="ed-impact-kicker">BUILT FOR ACTIVE STUDIOS</span>
                <h2 id="impact-band-title">Less admin.<br/><em>More movement.</em></h2>
                <p>Bookings, packages, check-ins and follow-ups in one clear studio system.</p>
                <Link className="ed-impact-cta" href="/app-demo?tour=1">EXPLORE THE DEMO <ArrowUpRight size={18}/></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ed-pricing" id="pricing">
          <div className="ed-container">
            <div className="ed-pricing-kicker"><span className="ed-overline">01 / PLAIN & SIMPLE</span></div>
            <div className="ed-price-grid">
              <div className="ed-price-dark"><div className="ed-price-top"><span>STUDIO ESSENTIAL</span><span>ONE STUDIO · FULL WORKSPACE</span></div><div className="ed-price-number"><span>$</span>39<sup>.90</sup><small> / MONTH</small></div><p>Monthly is the flexible option: full StudioTasker access at <strong>only $39.90/month</strong>.</p><div className="ed-annual-value"><span>BEST VALUE · ANNUAL</span><strong>$33.90/month</strong><p>$406.80 billed once yearly. <b>Save $72/year</b> versus 12 monthly payments. For a studio system you use week after week, annual means the lower effective price and one yearly renewal instead of monthly billing.</p></div><div className="ed-price-actions"><Link href="/start?plan=monthly">MONTHLY FLEXIBILITY · $39.90 <ArrowUpRight size={19}/></Link><Link href="/start?plan=annual">BEST VALUE · ANNUAL · $406.80/YEAR <ArrowUpRight size={19}/></Link><Link href="/app-demo">TRY DEMO FIRST <ArrowRight size={18}/></Link></div></div>
              <div className="ed-price-light"><span className="ed-price-include">WHAT&apos;S INCLUDED</span>{["StudioTasker Today daily priorities","Follow-up opportunity signals","Lead and member CRM records","CSV migration with preview","Studio-managed class packages & credits","Classes, attendance and follow-up workflows"].map(x=><div className="ed-price-item" key={x}><Check size={17}/>{x}</div>)}<div className="ed-price-disclaimer"><ShieldCheck size={19}/> StudioTasker bills your studio only for the software subscription. Subscription checkout is handled by Paddle as Merchant of Record; member payments remain entirely outside StudioTasker.</div></div>
            </div>
          </div>
        </section>


        <section className="ed-studio-types" id="studio-types" aria-labelledby="studio-types-title">
          <div className="ed-container">
            <div className="ed-section-heading ed-section-heading-split">
              <div><span className="ed-overline">02 / BUILT FOR YOUR KIND OF STUDIO</span><h2 id="studio-types-title">Different classes.<br/><em>Same daily pressure.</em></h2></div>
              <p>StudioTasker is designed for independent class-based businesses that need clear scheduling, member context, package entitlements and follow-up without an enterprise sales process.</p>
            </div>
            <div className="ed-studio-type-grid">
              {studioTypes.map(({name,short,copy,href,Icon})=><article key={name}><span><Icon size={25}/></span><h3>{name}</h3><p>{copy}</p><Link href={href} aria-label={"Explore "+name.toLowerCase()+" studio software"}>EXPLORE {short} <ArrowRight size={15}/></Link></article>)}
            </div>
            <div className="ed-proof-strip"><strong>BUILT FOR INDEPENDENT STUDIOS WORLDWIDE</strong><span>USA · CANADA · UK · EUROPE · INTERNATIONAL</span><span>English-first · transparent pricing · no fake customer-logo wall</span></div>
          </div>
        </section>

        <section className="ed-product-tour" id="product-tour" aria-labelledby="product-tour-title">
          <div className="ed-container">
            <div className="ed-section-heading ed-section-heading-split">
              <div><span className="ed-overline">03 / PRODUCT TOUR</span><h2 id="product-tour-title">See the work.<br/><em>Not a feature dump.</em></h2></div>
              <p>Move through the four areas an owner actually checks: what needs attention, who the members are, what is happening in classes and what the team should follow up.</p>
            </div>
            <ProductTourTabs/>
          </div>
        </section>

        <section className="ed-why" id="why" aria-labelledby="why-title">
          <div className="ed-container">
            <div className="ed-section-heading ed-section-heading-split">
              <div><span className="ed-overline">04 / WHY STUDIOTASKER</span><h2 id="why-title">Useful software.<br/><em>Without the enterprise baggage.</em></h2></div>
              <p>StudioTasker focuses on the operating layer of a studio. It does not try to become your bank, payment processor, marketing agency or consulting project.</p>
            </div>
            <div className="ed-why-grid">
              <article><span>01</span><ShieldCheck size={24}/><h3>One clear price.</h3><p>$39.90 monthly, or $33.90/month with annual billing. No sales call required to see the price.</p></article>
              <article><span>02</span><CreditCard size={24}/><h3>Keep your payments.</h3><p>Your member payments stay with the studio and its existing payment method. StudioTasker bills only for its software.</p></article>
              <article><span>03</span><Clock3 size={24}/><h3>Know what needs attention.</h3><p>Explainable signals highlight trials, renewals, inactivity and open capacity. Staff decide the next action.</p></article>
              <article><span>04</span><Users size={24}/><h3>Built for a small team.</h3><p>Clear member, class and follow-up workflows without requiring an implementation consultant or enterprise rollout.</p></article>
            </div>
          </div>
        </section>

        <section className="ed-onboarding" id="onboarding" aria-labelledby="onboarding-title">
          <div className="ed-container ed-onboarding-grid">
            <div>
              <span className="ed-overline">05 / SELF-SERVE ONBOARDING</span>
              <h2 id="onboarding-title">Start without<br/><em>booking a setup call.</em></h2>
              <p>Create the workspace yourself, import what you already have and keep the systems that do not need replacing.</p>
              <div className="ed-onboarding-actions"><Link href="/start">START STUDIOTASKER <ArrowUpRight size={18}/></Link><Link href="/app-demo?tour=1">WATCH 90-SEC DEMO <ArrowRight size={17}/></Link></div>
            </div>
            <div className="ed-onboarding-steps">
              <article><b>01</b><div><strong>Create your studio</strong><p>Choose your plan, create your private workspace and set timezone, terminology and class defaults.</p></div><Check size={20}/></article>
              <article><b>02</b><div><strong>Import by CSV with preview</strong><p>Bring member records in without paying for a migration project. Review the import before committing it.</p></div><Check size={20}/></article>
              <article><b>03</b><div><strong>Keep your payment setup</strong><p>No member-payment migration is required because StudioTasker does not take over the studio&apos;s customer payments.</p></div><Check size={20}/></article>
              <article><b>04</b><div><strong>Get to useful data fast</strong><p>The first setup is designed to take minutes, not a training programme. Add classes, members and follow-up rules as you go.</p></div><Check size={20}/></article>
            </div>
          </div>
        </section>

        <section className="ed-faq" id="faq" aria-labelledby="faq-heading">
          <div className="ed-container ed-faq-grid">
            <div><span className="ed-overline">06 / GOOD TO KNOW</span><h2 id="faq-heading">Clear answers.<br/><em>No fine print tricks.</em></h2><p>StudioTasker is subscription-based studio management software. You can explore the interactive demo first, then use your own private workspace for day-to-day studio operations.</p></div>
            <div className="ed-faq-list">
              <details><summary>What kinds of studios is StudioTasker for?</summary><p>StudioTasker is designed for independent Pilates, yoga, barre, dance, gym, boutique fitness and other class-based studios. Studio name, logo, colors, terminology, class defaults and operating rules can be customized to fit the way your studio works.</p></details><details><summary>Where is StudioTasker available?</summary><p>StudioTasker is designed for independent studios in the United States, Canada, the United Kingdom, Europe and other supported international markets. Checkout availability is subject to applicable law and Paddle-supported markets. The interface is English-first, pricing is shown in USD, and each studio can choose its own timezone, 12/24-hour clock and week-start preference.</p></details>
              <details><summary>Can I use it for real customer bookings today?</summary><p>Yes. Your private StudioTasker workspace is built for real studio operations: customer records, classes, studio-managed bookings, attendance, package entitlements and follow-ups. The public demo remains a separate sandbox so you can explore safely without changing your live studio data.</p></details><details><summary>What happens after I subscribe?</summary><p>You sign in to your private StudioTasker workspace, complete the guided setup, add or import your studio records, then customize your studio name, logo, primary color, terminology, class defaults and StudioTasker Today rules. Your studio&apos;s data and settings stay isolated inside its own workspace.</p></details>
              <details><summary>Does StudioTasker collect member payments or contact members?</summary><p>No. StudioTasker is studio-facing software. Member payment collection and member communications stay with the studio. StudioTasker only bills the studio for its own software subscription.</p></details>
              <details><summary>How much does StudioTasker cost?</summary><p>StudioTasker is $39.90/month per studio. With annual billing, the price is $33.90/month, billed as $406.80 for the year, about 15% less than paying monthly for 12 months. Paddle acts as Merchant of Record for StudioTasker subscription checkout, applicable transaction taxes, buyer billing documents and refunds. Your studio&apos;s own memberships, class packs and customer payments are completely separate.</p></details>
              <details><summary>Do I need to enter my own members to try it?</summary><p>No. Choose Explore the Demo to try fictional members, classes, bookings, reports and follow-up tasks. Please do not enter real personal information.</p></details>
            </div>
          </div>
        </section>
        <section className="ed-contact-cta" aria-labelledby="contact-cta-title">
          <div className="ed-container ed-contact-cta-grid">
            <div><span className="ed-overline">QUESTIONS / SUPPORT</span><h2 id="contact-cta-title">Need a human?<br/><em>We&apos;re here.</em></h2><p>Product questions, account help, billing questions or feedback. Contact StudioTasker support directly.</p></div>
            <div><a href="mailto:support@studiotasker.com">support@studiotasker.com <ArrowUpRight size={20}/></a><Link href="/contact">OPEN CONTACT FORM <ArrowRight size={18}/></Link></div>
          </div>
        </section>
      </main>
      <footer className="ed-footer"><div className="ed-container ed-footer-main"><div><Identity inverse/><p>Thoughtfully uncomplicated studio software for independent studios across supported international markets.</p></div><div className="ed-footer-nav"><Link href="/start">Buy StudioTasker</Link><a href="#pricing">Pricing</a><a href="#studio-types">Studio types</a><a href="#product-tour">Product tour</a><a href="#why">Why StudioTasker</a><a href="#onboarding">Self-serve onboarding</a><Link href="/workspace">Customer sign in</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/legal">Legal & Trust</Link></div></div>{op.configured&&<div className="ed-container"><p className="ed-price-disclaimer"><strong>Legal operator:</strong> {op.name} · {op.address}, {op.country} · {op.email} · {op.phone}. StudioTasker subscription orders are processed by Paddle as Merchant of Record.</p></div>}<div className="ed-container ed-footer-bottom"><span>© 2026 STUDIOTASKER · GLOBAL STUDIO MANAGEMENT SOFTWARE</span><span>USA · CANADA · UK · EUROPE · INTERNATIONAL <Activity className="ed-inline-sport" size={12}/></span></div></footer>
    </div>
  );
}
