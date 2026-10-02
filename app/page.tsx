import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3,
  CreditCard, MoveRight, Plus, ShieldCheck, Users, Waves
} from "lucide-react";
import "./editorial.css";

const timetable = [
  { time: "07:30", title: "Morning Flow", coach: "Sophie M.", spots: "6 / 8", state: "OPEN", value: 75 },
  { time: "09:00", title: "Reformer Foundations", coach: "Olivia K.", spots: "8 / 8", state: "FULL", value: 100 },
  { time: "12:30", title: "Midday Sculpt", coach: "Ava R.", spots: "5 / 8", state: "OPEN", value: 63 },
  { time: "17:30", title: "Evening Reset", coach: "Sophie M.", spots: "7 / 8", state: "OPEN", value: 88 },
];

const services = [
  { n: "01", title: "Keep your classes in line.", category: "SCHEDULING", description: "Set your week, manage instructors and see how many places are left. A schedule that makes sense the first time you look at it.", icon: CalendarDays },
  { n: "02", title: "Know your people.", category: "MEMBERS", description: "Member profiles, class-pack credits and bookings stay in one place. Less searching, more personal attention.", icon: Users },
  { n: "03", title: "Make room for everyone.", category: "WAITLISTS & PACKS", description: "Keep track of your waitlist, cancellations and class-pack balances without piecing together another spreadsheet.", icon: CreditCard },
];

function Identity({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={"ed-identity" + (inverse ? " ed-identity-inverse" : "")} aria-label="ReformDesk home">
      <span className="ed-identity-icon" aria-hidden="true"><i/><i/><i/></span>
      <span>reform<span className="ed-identity-strong">desk</span><span className="ed-identity-dot">.</span></span>
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
      <div className="ed-sch-foot"><span><i/> Your studio, in sync.</span><span>VIEW SCHEDULE <ArrowRight size={12}/></span></div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="editorial">
      <div className="ed-topline"><div className="ed-container"><span>SOFTWARE FOR THE SPACE YOU&apos;VE BUILT.</span><span>DESIGNED FOR INDEPENDENT STUDIOS <span className="ed-star">✳</span> 2026</span></div></div>
      <header className="ed-header">
        <div className="ed-container ed-nav">
          <Identity/>
          <nav aria-label="Main navigation"><a href="#features">The essentials</a><a href="#studio">Inside the studio</a><a href="#pricing">Pricing</a></nav>
          <Link className="ed-nav-cta" href="/demo">OPEN THE DEMO <ArrowUpRight size={16}/></Link>
        </div>
      </header>

      <main>
        <section className="ed-hero" aria-labelledby="main-heading">
          <div className="ed-container ed-hero-grid">
            <div className="ed-hero-copy">
              <div className="ed-index"><span className="ed-index-line"/> INDEPENDENT STUDIOS / BETTER DAYS</div>
              <h1 id="main-heading">LESS<br/>ADMIN.<br/><span>MORE</span><br/><em>MOVEMENT.</em></h1>
              <div className="ed-hero-under">
                <p>Your Pilates, yoga or boutique fitness studio deserves more of your time. Not more tabs, spreadsheets and back-office noise.</p>
                <Link className="ed-primary-cta" href="/demo"><span>EXPLORE THE DEMO</span><ArrowUpRight size={20}/></Link>
              </div>
              <div className="ed-hero-sideword" aria-hidden="true">MADE FOR THE MOVEMENT MAKERS · MADE FOR THE MOVEMENT MAKERS</div>
            </div>
            <div className="ed-hero-canvas">
              <div className="ed-canvas-meta"><span>FIG. 01</span><span>YOUR STUDIO, IN FRAME</span></div>
              <div className="ed-hero-disc" aria-hidden="true"><span>KEEP<br/>THINGS<br/>MOVING.</span><i>↗</i></div>
              <div className="ed-hero-card"><MiniSchedule/></div>
              <div className="ed-hero-sticker"><span className="ed-sticker-cross">✳</span><span>MORE ROOM<br/>TO DO YOUR<br/>THING.</span></div>
              <div className="ed-canvas-bottom"><span>NOT MORE SOFTWARE. JUST LESS FRICTION.</span><span>↗</span></div>
            </div>
          </div>
          <div className="ed-hero-end ed-container"><span>THE STUDIO DESK, REIMAGINED.</span><a href="#features">SCROLL TO EXPLORE <span>↓</span></a></div>
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
            <div className="ed-features-top"><div><span className="ed-overline">02 / THE ESSENTIALS</span><h2 id="essentials-title">The good stuff.<br/><em>Without the clutter.</em></h2></div><p>Everything you need to get through a busy studio day. Nothing to get in your way.</p></div>
            <div className="ed-feature-list">{services.map((item)=><div className="ed-feature-row" key={item.n}>
              <span className="ed-feature-num">{item.n} / 03</span>
              <div className="ed-feature-title"><span>{item.category}</span><h3>{item.title}</h3></div>
              <p>{item.description}</p>
              <span className="ed-feature-arrow" aria-hidden="true"><ArrowUpRight size={22}/></span>
            </div>)}</div>
          </div>
        </section>

        <section className="ed-window" id="studio">
          <div className="ed-container ed-window-grid">
            <div className="ed-window-copy">
              <span className="ed-overline">03 / A LOOK INSIDE</span>
              <h2>One place.<br/><em>Every moving</em><br/>part.</h2>
              <p>Classes, members and class-pack credits in one clear view. The admin side of studio life, without making it your whole life.</p>
              <div className="ed-window-list"><span><Check size={17}/> Simple class scheduling</span><span><Check size={17}/> Member and package tracking</span><span><Check size={17}/> Waitlists and capacity</span></div>
              <Link className="ed-text-link" href="/demo">STEP INSIDE THE DEMO <ArrowUpRight size={18}/></Link>
              <div className="ed-window-edition">THE STUDIO EDIT <span>VOL. 01</span></div>
            </div>
            <div className="ed-window-showcase">
              <div className="ed-window-label"><span>THE DESK / LIVE DEMO</span><span>01 — 04</span></div>
              <div className="ed-window-schedule"><MiniSchedule compact/></div>
              <div className="ed-window-ticket"><span>JUST ENOUGH<br/>OF EVERYTHING.</span><strong>✳</strong></div>
            </div>
          </div>
        </section>

        <section className="ed-pricing" id="pricing">
          <div className="ed-container">
            <div className="ed-pricing-title"><span className="ed-overline">04 / PLAIN & SIMPLE</span><h2>Good software.<br/><em>Clear numbers.</em></h2><p>No puzzle of features to untangle. A single-studio pricing idea, shaped with independent businesses in mind.</p></div>
            <div className="ed-price-grid">
              <div className="ed-price-dark"><div className="ed-price-top"><span>STUDIO ESSENTIAL</span><span>01 / EARLY ACCESS</span></div><div className="ed-price-number"><span>$</span>129<small> / MONTH</small></div><p>Illustrative pricing for one studio. Not yet available for purchase.</p><Link href="/demo">EXPLORE BEFORE YOU COMMIT <ArrowUpRight size={19}/></Link></div>
              <div className="ed-price-light"><span className="ed-price-include">WHAT IT&apos;S DESIGNED TO INCLUDE</span>{["Studio schedules and instructors","Capacity and class bookings","Member profiles and class packs","Waitlists and cancellation flows","Mobile-friendly studio dashboard","Straightforward self-serve setup"].map(x=><div className="ed-price-item" key={x}><Check size={17}/>{x}</div>)}<div className="ed-price-disclaimer"><ShieldCheck size={19}/> Interactive demo only. Real accounts, live payments and production storage are not enabled yet.</div></div>
            </div>
          </div>
        </section>

        <section className="ed-last"><div className="ed-container ed-last-grid"><div><span className="ed-overline">NOW, BACK TO WHAT MATTERS</span><h2>Less desk.<br/><em>More studio.</em></h2></div><div><p>See how simple the day could look.</p><Link href="/demo" className="ed-last-link"><span>TRY THE INTERACTIVE DEMO</span><ArrowUpRight size={22}/></Link></div><span className="ed-last-asterisk" aria-hidden="true">✳</span></div></section>
      </main>
      <footer className="ed-footer"><div className="ed-container ed-footer-main"><div><Identity inverse/><p>Thoughtfully uncomplicated studio software.</p></div><div className="ed-footer-nav"><a href="#features">The essentials</a><a href="#pricing">Pricing</a><Link href="/demo">Live demo</Link></div></div><div className="ed-container ed-footer-bottom"><span>© 2026 REFORMDESK · EARLY CONCEPT</span><span>BUILT FOR THE PEOPLE BEHIND THE PRACTICE. ✳</span></div></footer>
    </div>
  );
}
