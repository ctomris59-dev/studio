// Rendered dynamically by root layout to guarantee fresh CSP script nonces.
import type {Metadata} from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Activity, ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3,
  CreditCard, Dumbbell, HeartPulse, ShieldCheck, Users, Waves
} from "lucide-react";
import "./editorial.css";
import { StudioTaskerMark } from "../components/studio-tasker-mark";
import ProductTourTabs from "../components/product-tour-tabs";
import {MarketingMobileMenu} from "../components/marketing-mobile-menu";
import {JsonLd} from "../components/json-ld";
import {websiteJsonLd} from "../lib/seo";
import { legalOperator } from "../lib/server/legal-config";

export const metadata:Metadata={
 title:"StudioTasker | Studio Management Software for Independent Studios",
 description:"Studio management software for Pilates, yoga and fitness studios. Manage classes, bookings, members, waitlists, credits and attendance in one workspace.",
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
  {name:"PILATES / REFORMER",short:"PILATES",copy:"Reformer classes, credits and check-ins.",href:"/pilates-studio-software",Icon:Activity},
  {name:"YOGA",short:"YOGA",copy:"Classes, workshops and member records.",href:"/yoga-studio-software",Icon:HeartPulse},
  {name:"BARRE",short:"BARRE",copy:"Capacity, waitlists and packages.",href:"/barre-studio-software",Icon:Waves},
  {name:"DANCE",short:"DANCE",copy:"Lessons, levels and bookings.",href:"/dance-studio-software",Icon:Users},
  {name:"INDOOR CYCLING",short:"CYCLING",copy:"Bike spots, waitlists and check-ins.",href:"/indoor-cycling-software",Icon:Activity},
  {name:"FITNESS & GYM",short:"FITNESS",copy:"Group classes, training and members.",href:"/fitness-gym-software",Icon:Dumbbell},
  {name:"BOUTIQUE FITNESS",short:"BOUTIQUE",copy:"Leads, classes, credits and follow-ups.",href:"/boutique-fitness-software",Icon:Waves}
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
    <div className="editorial"><a className="studio-skip-link" href="#main-content">Skip to main content</a>
      <JsonLd data={websiteJsonLd()}/>
      <div className="ed-topline"><div className="ed-container"><span>LESS ADMIN. MORE MOVEMENT.</span><span>BUILT FOR INDEPENDENT STUDIOS WORLDWIDE <span className="ed-star"><Activity size={12}/></span></span></div></div>
      <header className="ed-header">
        <div className="ed-container ed-nav">
          <Identity/>
          <nav aria-label="Main navigation"><a href="#product-tour">Product tour</a><a href="#features">Features</a><a href="#studio-types">Studio types</a><a href="#pricing">Pricing</a><a href="#why">Why us</a><Link href="/contact">Contact</Link></nav>
          <div className="ed-nav-actions"><Link className="ed-customer-login" href="/workspace" aria-label="Customer sign in">SIGN IN</Link><Link className="ed-nav-demo" href="/app-demo">TRY DEMO</Link><Link className="ed-nav-cta" href="/start">VIEW PLANS · $39.90 <ArrowUpRight size={16}/></Link></div>
          <MarketingMobileMenu/>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>

        <section className="ed-hero ed-hero-consolidated" aria-labelledby="main-heading">
          <div className="ed-container ed-hero-grid">
            <div className="ed-hero-copy ed-hero-photo">
              <Image className="ed-hero-image"
                src="https://images.pexels.com/photos/2294400/pexels-photo-2294400.jpeg"
                alt="" width={1200} height={1200} quality={65} priority fetchPriority="high"
                sizes="(max-width: 950px) 100vw, 50vw"
              />
              <div className="ed-hero-inner">
                <span className="ed-hero-eyebrow">STUDIOTASKER / INDEPENDENT STUDIO SOFTWARE</span>
                <h1 id="main-heading">Less admin.<br/><em>More movement.</em></h1>
                <p>Classes, members, bookings, packages and follow-ups - all in one clear workspace for your studio team.</p>
                <div className="ed-hero-primary-actions">
                  <Link href="/app-demo?tour=1" className="ed-hero-demo">TRY THE INTERACTIVE DEMO <ArrowUpRight size={18}/></Link>
                  <a href="#pricing" className="ed-hero-plans">SEE SIMPLE PRICING <ArrowRight size={17}/></a>
                </div>
                <span className="ed-hero-reassurance">NO SIGN-UP TO EXPLORE THE DEMO · FROM $39.90/MONTH</span>
              </div>
            </div>
            <div className="ed-hero-canvas">
              <div className="ed-preview-intro">
                <span className="ed-preview-eyebrow">A DAY AT YOUR STUDIO / SAMPLE DATA</span>
                <h2>See the day.<br/>Stay in control.</h2>
                <p>From the morning schedule to the next follow-up, see what needs your attention.</p>
              </div>
              <PreviewDashboard/>
            </div>
          </div>
        </section>

        <section className="ed-product-tour" id="product-tour" aria-labelledby="product-tour-title">
          <div className="ed-container">
            <div className="ed-section-heading ed-section-heading-split">
              <div><span className="ed-overline">01 / TAKE A LOOK INSIDE</span><h2 id="product-tour-title">Your studio.<br/><em>In full view.</em></h2></div>
              <p>StudioTasker is studio management software for independent Pilates, yoga, fitness and other class-based studios. Manage schedules, member records, bookings, waitlists, package credits and attendance in one workspace. Explore Today, Members, Classes, Follow-ups and Operations in our interactive product tour.</p>
            </div>
            <ProductTourTabs/>
          </div>
        </section>

        <section className="ed-capabilities" id="features" aria-labelledby="features-title">
          <div className="ed-container">
            <div className="ed-section-heading ed-section-heading-split">
              <div><span className="ed-overline">02 / EVERYTHING YOU NEED</span><h2 id="features-title">Powerful tools.<br/><em>One clear workspace.</em></h2></div>
              <p>Plan classes, stay on top of members and handle the details without switching between disconnected tools.</p>
            </div>
            <div className="ed-capability-grid">
              <article><span>01 / DAILY CONTROL</span><Clock3 size={23}/><h3>Today &amp; follow-ups</h3><p>See capacity, trial and renewal signals, then turn priorities into clear staff tasks.</p></article>
              <article><span>02 / RELATIONSHIPS</span><Users size={23}/><h3>Members &amp; CRM</h3><p>Keep enquiries, member profiles, notes, attendance history and waiver status together.</p></article>
              <article><span>03 / THE TIMETABLE</span><CalendarDays size={23}/><h3>Classes &amp; schedules</h3><p>Schedule one-off or recurring classes with coaches, rooms, capacity and equipment spots.</p></article>
              <article><span>04 / THE EXCEPTIONS</span><Activity size={23}/><h3>Bookings &amp; waitlists</h3><p>Manage check-ins, no-shows, timed waitlists, reservation moves and bulk class changes.</p></article>
              <article><span>05 / ENTITLEMENTS</span><CheckCircle2 size={23}/><h3>Packages, credits &amp; waivers</h3><p>Track package use, credit changes, one-cycle rollovers and versioned waivers.</p></article>
              <article><span>06 / YOUR CONTROL</span><ShieldCheck size={23}/><h3>Team, branding &amp; data</h3><p>Set staff roles, branding and timezone. Preview imports and export your studio data.</p></article>
            </div>
            <nav className="ed-feature-guides" aria-label="Explore class and package management details"><span>DEEPER INTO THE WORKFLOW</span><Link href="/pilates-class-pack-software">Pilates class packs &amp; credits <ArrowUpRight size={16}/></Link><Link href="/studio-waitlist-management-software">Class waitlist management <ArrowUpRight size={16}/></Link></nav>
          </div>
        </section>

        <section className="ed-studio-types" id="studio-types" aria-labelledby="studio-types-title">
          <div className="ed-container">
            <div className="ed-section-heading ed-section-heading-split">
              <div><span className="ed-overline">03 / MADE FOR YOUR STUDIO</span><h2 id="studio-types-title">Your kind of studio.<br/><em>Your way of working.</em></h2></div>
              <p>From Pilates and yoga to fitness and dance, choose your studio type to see how StudioTasker fits your classes.</p>
            </div>
            <div className="ed-studio-type-grid">
              {studioTypes.map(({name,short,copy,href,Icon})=><article key={name}><span><Icon size={25}/></span><h3>{name}</h3><p>{copy}</p><Link href={href} aria-label={"Explore "+short.toLowerCase()+" studio software"}>EXPLORE {short} <ArrowRight size={15}/></Link></article>)}
            </div>
          </div>
        </section>


        <section className="ed-pricing ed-pricing-refined" id="pricing" aria-labelledby="pricing-title">
          <div className="ed-container">
            <div className="ed-section-heading ed-section-heading-split">
              <div><span className="ed-overline">04 / SIMPLE PRICING</span><h2 id="pricing-title">One studio.<br/><em>One straightforward price.</em></h2></div>
              <p>Every plan includes the full owner-and-staff workspace. Choose monthly flexibility or save with annual billing.</p>
            </div>
            <div className="ed-plan-grid">
              <article className="ed-plan-card">
                <span className="ed-plan-label">MONTHLY / FLEXIBLE</span>
                <h3>Pay month to month.</h3>
                <div className="ed-plan-amount"><strong>$39.90</strong><span>/ month</span></div>
                <p>All features. $39.90 billed monthly.</p>
                <Link href="/start?plan=monthly">CHOOSE MONTHLY <ArrowUpRight size={18}/></Link>
              </article>
              <article className="ed-plan-card ed-plan-card-featured">
                <span className="ed-plan-label">ANNUAL / SAVE ABOUT 15%</span>
                <h3>Keep more in your studio.</h3>
                <div className="ed-plan-amount"><strong>$33.90</strong><span>/ month equivalent</span></div>
                <p>$406.80 billed yearly. Save $72 compared with monthly billing.</p>
                <strong className="ed-plan-effective-total">TOTAL YEARLY BILL · $406.80</strong>
                <Link href="/start?plan=annual">CHOOSE ANNUAL <ArrowUpRight size={18}/></Link>
              </article>
            </div>
            <div className="ed-pricing-assurance" aria-label="StudioTasker pricing and trust details">
              <span><CheckCircle2 size={17}/> Same complete workspace with either plan</span>
              <span><CheckCircle2 size={17}/> One subscription per studio</span>
              <Link href="/legal/cancellation">Cancellation terms <ArrowUpRight size={15}/></Link>
              <Link href="/legal/security">Security practices <ArrowUpRight size={15}/></Link>
            </div>
          </div>
        </section>


        <section className="ed-why-setup" id="why" aria-labelledby="why-title">
          <div className="ed-container">
            <div className="ed-section-heading ed-section-heading-split">
              <div><span className="ed-overline">05 / BUILT FOR INDEPENDENCE</span><h2 id="why-title">The essentials.<br/><em>Without the overhead.</em></h2></div>
              <p>StudioTasker helps your team run the studio. It does not take over your members' payments or require an enterprise implementation.</p>
            </div>
            <div className="ed-value-grid">
              <article><CreditCard size={24}/><h3>Keep your payments.</h3><p>Your existing member payment arrangements remain with your studio.</p></article>
              <article><Users size={24}/><h3>Made for small teams.</h3><p>Clear role-based workflows for owners and staff, without a complex rollout.</p></article>
              <article><ShieldCheck size={24}/><h3>Your studio. Your data.</h3><p>Configure your workspace, import with a preview and export records when needed.</p></article>
            </div>
            <div className="ed-trust-evidence" aria-label="Check how StudioTasker handles trust and support">
              <span>CHECK THE DETAILS</span>
              <Link href="/legal/security">Read our security practices <ArrowUpRight size={15}/></Link>
              <Link href="/legal/dpa">Review the data processing terms <ArrowUpRight size={15}/></Link>
              <Link href="/contact">Ask a product question <ArrowUpRight size={15}/></Link>
            </div>
            <div className="ed-setup-compact" id="onboarding">
              <div>
                <span className="ed-overline">SELF-SERVE SETUP</span>
                <h3>Start simply.<br/><em>Grow at your pace.</em></h3>
                <p>Create your workspace, add your members and start building your class schedule. No setup call required.</p>
                <Link href="/app-demo?tour=1">EXPLORE FIRST <ArrowRight size={18}/></Link>
              </div>
              <ol>
                <li><b>01</b><div><strong>Create your studio</strong><span>Choose a plan and set your timezone, terminology and class defaults.</span></div></li>
                <li><b>02</b><div><strong>Add your records</strong><span>Enter members as you go or preview an optional CSV import.</span></div></li>
                <li><b>03</b><div><strong>Run your classes</strong><span>Set up schedules, bookings, packages and staff follow-ups.</span></div></li>
              </ol>
            </div>
          </div>
        </section>

        <section className="ed-faq" id="faq" aria-labelledby="faq-heading">
          <div className="ed-container ed-faq-grid">
            <div><span className="ed-overline">06 / QUESTIONS ANSWERED</span><h2 id="faq-heading">Before you begin.<br/><em>Know what to expect.</em></h2><p>Try the sample demo without creating an account. Here are the answers to the questions most studio owners ask before choosing a plan.</p></div>
            <div className="ed-faq-list">
              <details><summary>What kinds of studios is StudioTasker for?</summary><p>StudioTasker is designed for independent Pilates, yoga, barre, dance, gym, boutique fitness and other class-based studios. Studio name, logo, colors, terminology, class defaults and operating rules can be customized to fit the way your studio works.</p></details><details><summary>Where is StudioTasker available?</summary><p>StudioTasker is designed for independent studios in all international markets. The interface is English-first, pricing is shown in USD, and each studio can choose its own timezone, 12/24-hour clock and week-start preference.</p></details>
              <details><summary>Can I use StudioTasker for real bookings now?</summary><p>The interactive demo is available now. The private workspace is designed for staff-managed bookings, attendance, packages and follow-ups, but paid production onboarding will open only after operational and security checks are completed. There is no public member booking link or member payment checkout.</p></details><details><summary>What happens after I subscribe?</summary><p>You sign in to your private StudioTasker workspace, complete the guided setup, add or import your studio records, then customize your studio name, logo, primary color, terminology, class defaults and StudioTasker Today rules. Your studio&apos;s data and settings stay isolated inside its own workspace.</p></details>
              <details><summary>Does StudioTasker collect member payments or contact members?</summary><p>No. StudioTasker is studio-facing software. Member payment collection and member communications stay with the studio. StudioTasker only bills the studio for its own software subscription.</p></details>
              <details><summary>How much does StudioTasker cost?</summary><p>StudioTasker is $39.90/month per studio. With annual billing, the price is $33.90/month, billed as $406.80 for the year, about 15% less than paying monthly for 12 months. Your studio&apos;s own memberships, class packs and customer payments are completely separate.</p></details>
              <details><summary>Do I need to enter my own members to try it?</summary><p>No. Choose Explore the Demo to try fictional members, classes, bookings, reports and follow-up tasks. Please do not enter real personal information.</p></details>
              <details><summary>What can I do in the interactive demo?</summary><p>Take the 90-second guided tour, then practise with fictional studio data: add a sample member, schedule a class, review package credits or create a follow-up. No account or real customer data is required.</p></details>
              <details><summary>How does StudioTasker handle my members’ information?</summary><p>Your studio decides which customer information to enter and is responsible for using it lawfully. StudioTasker hosts and processes those records to provide the service. Read our <Link href="/legal/privacy">Privacy Policy</Link>, <Link href="/legal/dpa">Data Processing Agreement</Link> and <Link href="/legal/security">security practices</Link> for details.</p></details>
            </div>
          </div>
        </section>

        <section className="ed-contact-cta ed-contact-refined" aria-labelledby="contact-cta-title">
          <div className="ed-container ed-contact-cta-grid">
            <div><span className="ed-overline">READY TO EXPLORE?</span><h2 id="contact-cta-title">Less admin.<br/><em>More studio time.</em></h2><p>See the product in action with sample data before choosing a plan.</p></div>
            <div className="ed-contact-actions">
              <Link href="/app-demo?tour=1">TRY THE INTERACTIVE DEMO <ArrowUpRight size={18}/></Link>
              <a href="#pricing">VIEW THE PLANS <ArrowRight size={18}/></a>
              <p>Have a question? <Link href="/contact">Contact us</Link> or email <a href="mailto:support@studiotasker.com">support@studiotasker.com</a>.</p>
            </div>
          </div>
        </section>

      </main>
      <footer className="ed-footer"><div className="ed-container ed-footer-main"><div><Identity inverse/><p>Thoughtfully uncomplicated studio software for independent studios across supported international markets.</p></div><div className="ed-footer-nav"><a href="#product-tour">Product tour</a><a href="#features">Features</a><a href="#studio-types">Studio types</a><a href="#pricing">Pricing</a><a href="#why">Why StudioTasker</a><a href="#onboarding">Self-serve onboarding</a><Link href="/workspace">Customer sign in</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/legal">Legal & Trust</Link><Link href="/legal/privacy">Privacy Policy</Link><Link href="/legal/security">Security</Link></div></div>{op.configured&&<div className="ed-container"><p className="ed-price-disclaimer"><strong>Legal operator:</strong> {op.name} · {op.address}, {op.country} · {op.email} · {op.phone}. StudioTasker subscription orders are processed by Paddle as Merchant of Record.</p></div>}<div className="ed-container ed-footer-bottom"><span>© 2026 STUDIOTASKER · GLOBAL STUDIO MANAGEMENT SOFTWARE</span><span>USA · CANADA · UK · EUROPE · INTERNATIONAL <Activity className="ed-inline-sport" size={12}/></span></div></footer>
    </div>
  );
}
