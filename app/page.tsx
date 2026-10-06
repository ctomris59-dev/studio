import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3,
  CreditCard, Globe2, MoveRight, Plus, ShieldCheck, Users, Waves
} from "lucide-react";
import "./editorial.css";
import { StudioTaskerMark } from "../components/studio-tasker-mark";
import { legalOperator } from "../lib/server/legal-config";

const timetable = [
  { time: "07:30", title: "Morning Flow", coach: "Sophie M.", spots: "6 / 8", state: "OPEN", value: 75 },
  { time: "09:00", title: "Reformer Foundations", coach: "Olivia K.", spots: "8 / 8", state: "FULL", value: 100 },
  { time: "12:30", title: "Midday Sculpt", coach: "Ava R.", spots: "5 / 8", state: "OPEN", value: 63 },
  { time: "17:30", title: "Evening Reset", coach: "Sophie M.", spots: "7 / 8", state: "OPEN", value: 88 },
];

const services = [
  { n: "01", title: "Plan every class.", category: "SCHEDULING", description: "Organize instructors, class schedules and available places in a clear studio calendar.", icon: CalendarDays },
  { n: "02", title: "Keep bookings flowing.", category: "RESERVATIONS", description: "Manage class reservations, package credits and waitlist changes without a paper register.", icon: Check },
  { n: "03", title: "Know your members.", category: "MEMBERSHIP / CRM", description: "Keep member information, trials and membership status in one organized place.", icon: Users },
  { n: "04", title: "Never miss a follow-up.", category: "TASKS / RENEWALS", description: "Review explainable reminders for expiring packs, unanswered leads and low class credits.", icon: Clock3 },
  { n: "05", title: "See what needs attention.", category: "INSIGHTS", description: "Review occupancy, member activity and customer-journey trends without misleading revenue estimates.", icon: CreditCard },
];

function Identity({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={"ed-identity" + (inverse ? " ed-identity-inverse" : "")} aria-label="StudioTasker home">
      <StudioTaskerMark className="ed-identity-icon"/>
      <span>studio<span className="ed-identity-strong">tasker</span><span className="ed-identity-dot">.</span></span>
    </Link>
  );
}

function MiniSchedule({ compact = false }: { compact?: boolean }) {
  return (
    <div className={"ed-schedule" + (compact ? " ed-schedule-compact" : "")}>
      <div className="ed-sch-head">
        <div className="ed-sch-identity"><span className="ed-sch-icon"><Waves size={17} strokeWidth={1.6}/></span><div><strong>Willow Studio</strong><small>THE SPACE IS YOURS</small></div></div>
        <span className="ed-sch-week">THIS WEEK <span>↗</span></span>
      </div>
      <div className="ed-sch-greeting"><span>Studio overview / <b>Wednesday</b></span><strong>Today is looking good.</strong></div>
      <div className="ed-sch-metrics"><div><small>CLASSES</small><strong>08</strong></div><div><small>BOOKINGS</small><strong>42</strong></div><div><small>CAPACITY</small><strong>84<span>%</span></strong></div></div>
      <div className="ed-sch-tablehead"><strong>TODAY&apos;S SCHEDULE</strong><span>4 of 8 classes <ArrowUpRight size={12}/></span></div>
      <div className="ed-sch-rows">{timetable.map((c) =>
        <div className="ed-sch-row" key={c.time}>
          <span className="ed-sch-time">{c.time}</span>
          <span className="ed-sch-class"><b>{c.title}</b><small>with {c.coach}</small></span>
          <span className="ed-sch-cap"><b>{c.spots}</b><i><i style={{width:c.value+"%"}}/></i></span>
          <span className={"ed-sch-status" + (c.state==="FULL" ? " is-full" : "")}>{c.state}</span>
        </div>)}</div>
      <div className="ed-sch-foot"><span><i/> Your studio, in sync.</span><span>VIEW DEMO <ArrowRight size={12}/></span></div>
    </div>
  );
}

export default function HomePage() {
  const op=legalOperator();
  return (
    <div className="editorial">
      <div className="ed-topline"><div className="ed-container"><span>SOFTWARE FOR THE SPACE YOU&apos;VE BUILT.</span><span>INDEPENDENT STUDIOS · USA · CANADA · UK · EUROPE · WORLDWIDE <span className="ed-star">✳</span></span></div></div>
      <header className="ed-header">
        <div className="ed-container ed-nav">
          <Identity/>
          <nav aria-label="Main navigation"><a href="#features">Features</a><a href="#studio">Product tour</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></nav>
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
              <div className="ed-index"><span className="ed-index-line"/> PILATES · YOGA · BARRE · BOUTIQUE FITNESS</div>
              <h1 id="main-heading">LESS<br/>ADMIN.<br/><span>MORE</span><br/><em>MOVEMENT.</em></h1>
              <div className="ed-hero-under">
                <p>StudioTasker keeps member relationships, classes, package entitlements and follow-ups in one place — for independent studios in the USA, Canada, UK, Europe and beyond.</p>
                <div className="ed-hero-action-stack">
                  <div className="ed-hero-actions">
                    <Link className="ed-buy-cta" href="/start"><span>START STUDIOTASKER</span><strong>$39.90 / month</strong><ArrowUpRight size={22}/></Link>
                    <Link className="ed-demo-cta" href="/app-demo"><span>TRY THE DEMO</span><strong>No sign-up needed</strong><ArrowUpRight size={22}/></Link>
                  </div>
                  <div className="ed-hero-price-note"><ShieldCheck size={16}/><span>USD billing · $39.90 monthly · $33.90/month annually · SAVE 15%</span></div>
                  <Link className="ed-hero-today-link" href="/today">See what StudioTasker tells you to do today <ArrowRight size={17}/></Link>
                </div>
              </div>
              <div className="ed-hero-sideword" aria-hidden="true">MADE FOR THE MOVEMENT MAKERS · MADE FOR THE MOVEMENT MAKERS</div>
            </div>
            <div className="ed-hero-canvas">
              <div className="ed-canvas-meta"><span>STUDIOTASKER / PRODUCT PREVIEW</span><span>EXPLORE WITH SAMPLE DATA · NO SIGN-UP NEEDED</span></div>
              <div className="ed-hero-disc" aria-hidden="true"><span>YOUR<br/>STUDIO<br/>IN SYNC.</span><i>↗</i></div>
              <div className="ed-hero-card"><MiniSchedule/></div>
              <div className="ed-hero-sticker"><span className="ed-sticker-cross">✳</span><span>MORE ROOM<br/>TO DO YOUR<br/>THING.</span></div>
              <div className="ed-canvas-bottom"><span>NOT MORE SOFTWARE. JUST LESS FRICTION.</span><span>↗</span></div>
            </div>
          </div>
          <div className="ed-hero-end ed-container"><span>STUDIOTASKER · KNOW WHAT YOUR STUDIO NEEDS TODAY.</span><a href="#features">SCROLL TO EXPLORE <span>↓</span></a></div>
        </section>

        <section className="ed-start-simple" aria-labelledby="start-simple-title">
          <div className="ed-container ed-start-simple-grid">
            <div className="ed-start-simple-head"><span className="ed-overline">START HERE</span><h2 id="start-simple-title">Three steps.<br/><em>Then you&apos;re in.</em></h2></div>
            <div className="ed-start-steps">
              <article><b>1</b><div><strong>Choose your plan</strong><p>$39.90 monthly or $406.80 yearly ($33.90/month · save 15%).</p></div></article>
              <article><b>2</b><div><strong>Create your studio</strong><p>Add your email, studio name and basic setup.</p></div></article>
              <article><b>3</b><div><strong>Start using StudioTasker</strong><p>Import members, add your logo and begin managing the studio.</p></div></article>
            </div>
            <div className="ed-start-simple-actions"><Link href="/start" className="ed-start-buy">BUY / START STUDIOTASKER <ArrowUpRight size={21}/></Link><Link href="/app-demo" className="ed-start-demo">TRY DEMO FIRST <ArrowRight size={20}/></Link></div>
          </div>
        </section>

        <section className="ed-global" aria-labelledby="global-title">
          <div className="ed-container">
            <div className="ed-global-head">
              <div><span className="ed-overline">BUILT TO TRAVEL</span><h2 id="global-title">One studio system.<br/><em>Wherever you run it.</em></h2></div>
              <p>StudioTasker is English-first software for independent studios across the United States, Canada, the United Kingdom, Europe and beyond. Your operating setup stays local to your studio.</p>
            </div>
            <div className="ed-global-regions" aria-label="Primary StudioTasker markets"><span>USA</span><span>CANADA</span><span>UK</span><span>EUROPE</span><span>WORLDWIDE</span></div>
            <div className="ed-global-grid">
              <article><span>01</span><Globe2 size={24}/><h3>Your location.</h3><p>Choose your studio timezone and run the workspace around your own local day.</p></article>
              <article><span>02</span><Clock3 size={24}/><h3>Your clock.</h3><p>Use 12-hour or 24-hour time, and choose Monday or Sunday as the start of your week.</p></article>
              <article><span>03</span><CreditCard size={24}/><h3>Your payments.</h3><p>Keep your existing card processor, bank transfer or any other member-payment method outside StudioTasker.</p></article>
              <article><span>04</span><ShieldCheck size={24}/><h3>One clear price.</h3><p>$39.90 USD per studio each month. No per-member pricing and no country-specific software tier.</p></article>
            </div>
          </div>
        </section>

        <section className="ed-tape" aria-label="Supported studio types"><div className="ed-tape-track"><span>PILATES</span><b>✳</b><span>YOGA</span><b>✳</b><span>BARRE</span><b>✳</b><span>BOUTIQUE FITNESS</span><b>✳</b><span>GROUP CLASSES</span><b>✳</b></div></section>

        <section className="ed-manifesto" id="features">
          <div className="ed-container ed-manifesto-grid">
            <div className="ed-overline">01 / WHAT WE BELIEVE</div>
            <div><h2>You didn&apos;t open a studio<br/>to <em>manage software.</em></h2><p>Classes to plan. People to look after. A dozen things happening at once. The tools behind your studio should make the day feel lighter—not louder.</p></div>
            <div className="ed-manifesto-seal" aria-hidden="true"><span>KEEP IT HUMAN</span><strong>✳</strong><small>KEEP IT MOVING</small></div>
          </div>
        </section>

        <section className="ed-features" aria-labelledby="essentials-title">
          <div className="ed-container">
            <div className="ed-features-top"><div><span className="ed-overline">02 / THE ESSENTIALS</span><h2 id="essentials-title">The good stuff.<br/><em>Without the clutter.</em></h2></div><p>Member CRM, class operations, package entitlements and follow-ups — without taking over the studio’s customer payments.</p></div>
            <div className="ed-feature-list">{services.map((item)=><div className="ed-feature-row" key={item.n}>
              <span className="ed-feature-num">{item.n} / 05</span>
              <div className="ed-feature-title"><span>{item.category}</span><h3>{item.title}</h3></div>
              <p>{item.description}</p>
              <span className="ed-feature-arrow" aria-hidden="true"><ArrowUpRight size={22}/></span>
            </div>)}</div>
          </div>
        </section>

        <section className="ed-today-story" aria-labelledby="today-story-title">
          <div className="ed-container ed-today-story-grid">
            <div><span className="ed-overline">THE DIFFERENCE / STUDIOTASKER TODAY</span><h2 id="today-story-title">Your software should tell you<br/><em>what needs attention next.</em></h2>
             <p>Trials that never became members. Active members drifting away. Packs ready to renew. A package status that needs review. Tomorrow&apos;s class with open places. StudioTasker brings those signals together with the reason they appeared and a human-controlled next action.</p>
             <Link className="ed-primary-cta" href="/today"><span>TRY STUDIOTASKER TODAY</span><ArrowUpRight size={20}/></Link></div>
            <div className="ed-today-story-card">
             <div><span>STUDIOTASKER TODAY</span><b>5</b><small>things need attention</small></div>
             {[
              ["HIGH","Trial needs a next step","Mia attended yesterday · no package yet"],
              ["HIGH","Renewal opportunity","Oliver · 1 class credit remaining"],
              ["MED","Member may be drifting","Emma · no visit for 24 days"],
              ["MED","Package status needs review","Ava · no confirmed package"],
              ["LOW","Open places","Barre Foundations · 3 spots tomorrow"]
             ].map((x,i)=><article key={i}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><i>→</i></article>)}
             <p>Explainable rules · no automatic marketing · no speculative “revenue saved” claim</p>
            </div>
          </div>
        </section>
        <section className="ed-window" id="studio">
          <div className="ed-container ed-window-grid">
            <div className="ed-window-copy">
              <span className="ed-overline">03 / A LOOK INSIDE</span>
              <h2>One place.<br/><em>Every moving</em><br/>part.</h2>
              <p>From a new enquiry to their next class, follow the customer journey in one clear workspace. The everyday admin gets a little easier to act on.</p>
              <div className="ed-window-list"><span><Check size={17}/> Lead-to-member CRM pipeline</span><span><Check size={17}/> Retention and renewal prompts</span><span><Check size={17}/> Studio-managed bookings and attendance</span></div>
              <Link className="ed-text-link" href="/app-demo">STEP INSIDE THE APP <ArrowUpRight size={18}/></Link>
              <div className="ed-window-edition">THE STUDIO EDIT <span>VOL. 01</span></div>
            </div>
            <div className="ed-window-showcase">
              <div className="ed-window-label"><span>STUDIOTASKER / INTERACTIVE DEMO</span><span>01 — 04</span></div>
              <div className="ed-window-schedule"><MiniSchedule compact/></div>
              <div className="ed-window-ticket"><span>JUST ENOUGH<br/>OF EVERYTHING.</span><strong>✳</strong></div>
            </div>
          </div>
        </section>

        <section className="ed-pricing" id="pricing">
          <div className="ed-container">
            <div className="ed-pricing-title"><span className="ed-overline">04 / PLAIN & SIMPLE</span><h2>Good software.<br/><em>Clear numbers.</em></h2><p>One studio, one global subscription. Prices are shown in USD: $39.90 monthly, or $33.90/month with annual billing — save 15%. Member payments stay completely outside StudioTasker.</p></div>
            <div className="ed-price-grid">
              <div className="ed-price-dark"><div className="ed-price-top"><span>STUDIO ESSENTIAL</span><span>ONE STUDIO · FULL WORKSPACE</span></div><div className="ed-price-number"><span>$</span>39<sup>.90</sup><small> / MONTH</small></div><p><strong>Annual option: $33.90/month · SAVE 15%</strong> · billed annually at $406.80/year. Your subscription covers StudioTasker software; what your studio charges members remains entirely separate.</p><div className="ed-price-actions"><Link href="/start?plan=monthly">BUY MONTHLY · $39.90 <ArrowUpRight size={19}/></Link><Link href="/start?plan=annual">BUY ANNUAL · $406.80/YEAR <ArrowUpRight size={19}/></Link><Link href="/app-demo">TRY DEMO FIRST <ArrowRight size={18}/></Link></div></div>
              <div className="ed-price-light"><span className="ed-price-include">WHAT&apos;S INCLUDED</span>{["StudioTasker Today daily priorities","Revenue Rescue opportunity signals","Lead and member CRM records","CSV migration with preview","Studio-managed class packages & credits","Classes, attendance and follow-up workflows"].map(x=><div className="ed-price-item" key={x}><Check size={17}/>{x}</div>)}<div className="ed-price-disclaimer"><ShieldCheck size={19}/> StudioTasker bills your studio only for the software subscription. Subscription checkout is handled by Paddle as Merchant of Record; member payments remain entirely outside StudioTasker.</div></div>
            </div>
          </div>
        </section>

        <section className="ed-faq" id="faq" aria-labelledby="faq-heading">
          <div className="ed-container ed-faq-grid">
            <div><span className="ed-overline">05 / GOOD TO KNOW</span><h2 id="faq-heading">Clear answers.<br/><em>No fine print tricks.</em></h2><p>StudioTasker is subscription-based studio management software. You can explore the interactive demo first, then use your own private workspace for day-to-day studio operations.</p></div>
            <div className="ed-faq-list">
              <details><summary>What kinds of studios is StudioTasker for?</summary><p>StudioTasker is designed for independent Pilates, yoga, barre, dance, gym, boutique fitness and other class-based studios. Studio name, logo, colors, terminology, class defaults and operating rules can be customized to fit the way your studio works.</p></details><details><summary>Where is StudioTasker available?</summary><p>StudioTasker is designed for independent studios in the United States, Canada, the United Kingdom, Europe and other international markets. The interface is English-first, pricing is shown in USD, and each studio can choose its own timezone, 12/24-hour clock and week-start preference.</p></details>
              <details><summary>Can I use it for real customer bookings today?</summary><p>Yes. Your private StudioTasker workspace is built for real studio operations: customer records, classes, studio-managed bookings, attendance, package entitlements and follow-ups. The public demo remains a separate sandbox so you can explore safely without changing your live studio data.</p></details><details><summary>What happens after I subscribe?</summary><p>You sign in to your private StudioTasker workspace, complete the guided setup, add or import your studio records, then customize your studio name, logo, primary color, terminology, class defaults and StudioTasker Today rules. Your studio&apos;s data and settings stay isolated inside its own workspace.</p></details>
              <details><summary>Does StudioTasker collect member payments or contact members?</summary><p>No. StudioTasker is studio-facing software. Member payment collection and member communications stay with the studio. StudioTasker only bills the studio for its own software subscription.</p></details>
              <details><summary>How much does StudioTasker cost?</summary><p>StudioTasker is $39.90/month per studio. With annual billing, the price is $33.90/month, billed as $406.80 for the year — about 15% less than paying monthly for 12 months. Paddle acts as Merchant of Record for StudioTasker subscription checkout, applicable transaction taxes, buyer billing documents and refunds. Your studio&apos;s own memberships, class packs and customer payments are completely separate.</p></details>
              <details><summary>Do I need to enter my own members to try it?</summary><p>No. Choose Explore the Demo to try fictional members, classes, bookings, reports and follow-up tasks. Please do not enter real personal information.</p></details>
            </div>
          </div>
        </section>
        <section className="ed-last"><div className="ed-container ed-last-grid"><div><span className="ed-overline">READY WHEN YOU ARE</span><h2>Less admin.<br/><em>More studio.</em></h2></div><div><p>Choose a plan and create your StudioTasker workspace.</p><Link href="/start" className="ed-last-link"><span>BUY / START STUDIOTASKER</span><ArrowUpRight size={22}/></Link><Link href="/app-demo" className="ed-last-demo-link">Or try the demo first →</Link></div><span className="ed-last-asterisk" aria-hidden="true">✳</span></div></section>
      </main>
      <footer className="ed-footer"><div className="ed-container ed-footer-main"><div><Identity inverse/><p>Thoughtfully uncomplicated studio software for independent studios worldwide.</p></div><div className="ed-footer-nav"><Link href="/start">Buy StudioTasker</Link><a href="#features">Features</a><Link href="/workspace">Customer sign in</Link><Link href="/app-demo">Interactive demo</Link><Link href="/today">StudioTasker Today</Link><a href="#features">Studio software</a><Link href="/compare">VS. others</Link><a href="#pricing">Pricing</a><Link href="/legal">Legal & Trust</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/turkiye-privacy">Türkiye Privacy (KVKK)</Link><Link href="/legal/dpa">DPA</Link><Link href="/legal/cookies">Cookies</Link><Link href="/legal/subprocessors">Subprocessors</Link><Link href="/legal/security">Security</Link><Link href="/legal/cancellation">Cancellation & Refunds</Link></div></div>{op.configured&&<div className="ed-container"><p className="ed-price-disclaimer"><strong>Legal operator:</strong> {op.name} · {op.address}, {op.country} · {op.email} · {op.phone}. StudioTasker subscription orders are processed by Paddle as Merchant of Record.</p></div>}<div className="ed-container ed-footer-bottom"><span>© 2026 STUDIOTASKER · GLOBAL STUDIO MANAGEMENT SOFTWARE</span><span>USA · CANADA · UK · EUROPE · WORLDWIDE ✳</span></div></footer>
    </div>
  );
}
