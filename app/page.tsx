import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3,
  CreditCard, MoveRight, Plus, ShieldCheck, Users, Waves
} from "lucide-react";
import "./editorial.css";
import { StudioTaskerMark } from "../components/studio-tasker-mark";

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
  return (
    <div className="editorial">
      <div className="ed-topline"><div className="ed-container"><span>SOFTWARE FOR THE SPACE YOU&apos;VE BUILT.</span><span>DESIGNED FOR INDEPENDENT STUDIOS <span className="ed-star">✳</span> 2026</span></div></div>
      <header className="ed-header">
        <div className="ed-container ed-nav">
          <Identity/>
          <nav aria-label="Main navigation"><a href="#features">Features</a><a href="#studio">Product tour</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></nav>
          <Link className="ed-nav-cta" href="/demo">OPEN THE DEMO <ArrowUpRight size={16}/></Link>
        </div>
      </header>

      <main>
        <section className="ed-hero" aria-labelledby="main-heading">
          <div className="ed-container ed-hero-grid">
            <div className="ed-hero-copy">
              <div className="ed-hero-brand">
                <span className="ed-hero-brand-icon"><StudioTaskerMark/></span>
                <div><strong>StudioTasker</strong><small>ALL-IN-ONE STUDIO MANAGEMENT</small></div>
              </div>
              <div className="ed-index"><span className="ed-index-line"/> PILATES · YOGA · BARRE · BOUTIQUE STUDIOS</div>
              <h1 id="main-heading">LESS<br/>ADMIN.<br/><span>MORE</span><br/><em>MOVEMENT.</em></h1>
              <div className="ed-hero-under">
                <p>Members book and pay themselves. StudioTasker keeps track of classes, memberships and the next actions that need your attention.</p>
                <Link className="ed-primary-cta" href="/today"><span>SEE WHAT NEEDS ATTENTION TODAY</span><ArrowUpRight size={20}/></Link><Link className="ed-text-link" href="/app-demo">SIGN IN TO APP DEMO <ArrowUpRight size={18}/></Link>
              </div>
              <div className="ed-hero-sideword" aria-hidden="true">MADE FOR THE MOVEMENT MAKERS · MADE FOR THE MOVEMENT MAKERS</div>
            </div>
            <div className="ed-hero-canvas">
              <div className="ed-canvas-meta"><span>STUDIOTASKER / PRODUCT PREVIEW</span><span>SAMPLE DATA · NO SIGN-UP NEEDED</span></div>
              <div className="ed-hero-disc" aria-hidden="true"><span>KEEP<br/>THINGS<br/>MOVING.</span><i>↗</i></div>
              <div className="ed-hero-card"><MiniSchedule/></div>
              <div className="ed-hero-sticker"><span className="ed-sticker-cross">✳</span><span>MORE ROOM<br/>TO DO YOUR<br/>THING.</span></div>
              <div className="ed-canvas-bottom"><span>NOT MORE SOFTWARE. JUST LESS FRICTION.</span><span>↗</span></div>
            </div>
          </div>
          <div className="ed-hero-end ed-container"><span>STUDIOTASKER · KNOW WHAT YOUR STUDIO NEEDS TODAY.</span><a href="#features">SCROLL TO EXPLORE <span>↓</span></a></div>
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
            <div className="ed-features-top"><div><span className="ed-overline">02 / THE ESSENTIALS</span><h2 id="essentials-title">The good stuff.<br/><em>Without the clutter.</em></h2></div><p>From first class discovery to successful payment, reservation, attendance and renewal — a complete studio journey.</p></div>
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
             <p>Trials that never became members. Active members drifting away. Packs ready to renew. A checkout left unfinished. Tomorrow&apos;s class with open places. StudioTasker brings those signals together with the reason they appeared and a human-controlled next action.</p>
             <Link className="ed-primary-cta" href="/today"><span>TRY STUDIOTASKER TODAY</span><ArrowUpRight size={20}/></Link></div>
            <div className="ed-today-story-card">
             <div><span>STUDIOTASKER TODAY</span><b>5</b><small>things need attention</small></div>
             {[
              ["HIGH","Trial needs a next step","Mia attended yesterday · no package yet"],
              ["HIGH","Renewal opportunity","Oliver · 1 class credit remaining"],
              ["MED","Member may be drifting","Emma · no visit for 24 days"],
              ["MED","Checkout still pending","Studio Ten · $135 pending"],
              ["LOW","Open places","Barre Foundations · 3 spots tomorrow"]
             ].map((x,i)=><article key={i}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><i>→</i></article>)}
             <p>Explainable rules · no automatic marketing · no speculative “revenue saved” claim</p>
            </div>
          </div>
        </section>
        <section className="ed-member-commerce" aria-labelledby="member-commerce-title">
          <div className="ed-container">
            <div className="ed-member-commerce-heading">
              <span className="ed-overline">A COMPLETE STUDIO JOURNEY</span>
              <h2 id="member-commerce-title">From first class.<br/><em>To the next one.</em></h2>
              <p>Give members a simple experience and your team one place to keep everything in sync. Studio-direct Stripe payments are available only after the studio's payment account is connected and verified.</p>
            </div>
            <div className="ed-member-commerce-steps">
              {[
                {n:"01",name:"Choose",desc:"Find the right class and available time."},
                {n:"02",name:"Purchase",desc:"Buy a studio-priced pack using secure hosted checkout."},
                {n:"03",name:"Reserve",desc:"Book a place, use credits and manage the waitlist."},
                {n:"04",name:"Attend",desc:"Studio staff check in the member against the reservation."},
                {n:"05",name:"Renew",desc:"Add credits and extend membership validity when it's time."}
              ].map(item=><article key={item.n}><span>{item.n}</span><h3>{item.name}</h3><p>{item.desc}</p></article>)}
            </div>
            <div className="ed-member-commerce-actions"><Link className="ed-primary-cta" href="/experience"><span>TRY THE FIVE-STEP MEMBER DEMO</span><ArrowUpRight size={20}/></Link><Link className="ed-text-link" href="/book/preview">VIEW PUBLIC BOOKING PREVIEW <ArrowUpRight size={18}/></Link></div><p className="ed-member-commerce-note">Payment integration is currently in development. The walkthrough uses fictional data and does not charge cards.</p>
          </div>
        </section>
        <section className="ed-window" id="studio">
          <div className="ed-container ed-window-grid">
            <div className="ed-window-copy">
              <span className="ed-overline">03 / A LOOK INSIDE</span>
              <h2>One place.<br/><em>Every moving</em><br/>part.</h2>
              <p>From a new enquiry to their next class, follow the customer journey in one clear workspace. The everyday admin gets a little easier to act on.</p>
              <div className="ed-window-list"><span><Check size={17}/> Lead-to-member CRM pipeline</span><span><Check size={17}/> Retention and renewal prompts</span><span><Check size={17}/> Member bookings and studio insights</span></div>
              <Link className="ed-text-link" href="/demo">STEP INSIDE THE DEMO <ArrowUpRight size={18}/></Link>
              <div className="ed-window-edition">THE STUDIO EDIT <span>VOL. 01</span></div>
            </div>
            <div className="ed-window-showcase">
              <div className="ed-window-label"><span>STUDIOTASKER / SAMPLE DEMO</span><span>01 — 04</span></div>
              <div className="ed-window-schedule"><MiniSchedule compact/></div>
              <div className="ed-window-ticket"><span>JUST ENOUGH<br/>OF EVERYTHING.</span><strong>✳</strong></div>
            </div>
          </div>
        </section>

        <section className="ed-pricing" id="pricing">
          <div className="ed-container">
            <div className="ed-pricing-title"><span className="ed-overline">04 / PLAIN & SIMPLE</span><h2>Good software.<br/><em>Clear numbers.</em></h2><p>No puzzle of features to untangle. One studio, one proposed price: $49/month. Member class-pack purchases are separate.</p></div>
            <div className="ed-price-grid">
              <div className="ed-price-dark"><div className="ed-price-top"><span>STUDIO ESSENTIAL</span><span>01 / EARLY ACCESS</span></div><div className="ed-price-number"><span>$</span>49<small> / MONTH</small></div><p>Proposed $49/month per studio · $39/month on annual billing ($468/year). No live StudioTasker checkout yet. Member pack charges go to each studio, not StudioTasker.</p><Link href="/demo">EXPLORE BEFORE YOU COMMIT <ArrowUpRight size={19}/></Link></div>
              <div className="ed-price-light"><span className="ed-price-include">WHAT IT&apos;S DESIGNED TO INCLUDE</span>{["StudioTasker Today daily priorities","Revenue Rescue opportunity signals","Lead and member CRM records","Public booking & member self-registration","CSV migration with preview","Studio packages, credits & booking management"].map(x=><div className="ed-price-item" key={x}><Check size={17}/>{x}</div>)}<div className="ed-price-disclaimer"><ShieldCheck size={19}/> Public demo remains sample-only. Studio member payments require verified Stripe Connect accounts; live customer onboarding is not yet open.</div></div>
            </div>
          </div>
        </section>

        <section className="ed-faq" id="faq" aria-labelledby="faq-heading">
          <div className="ed-container ed-faq-grid">
            <div><span className="ed-overline">05 / GOOD TO KNOW</span><h2 id="faq-heading">Clear answers.<br/><em>No fine print tricks.</em></h2><p>StudioTasker is an interactive product prototype today, not a live paid service. Explore it using fictional sample data.</p></div>
            <div className="ed-faq-list">
              <details><summary>What kinds of studios is StudioTasker for?</summary><p>Designed for independent Pilates, yoga, barre, boutique fitness and other class-based studios. The demo has example studio presets and does not yet support every business model.</p></details>
              <details><summary>Can I use it for real customer bookings today?</summary><p>Not yet. The public demo stores sample information in your browser. The database-backed workspace is a separate development system, not an active commercial service.</p></details>
              <details><summary>Does it collect payments or send member messages?</summary><p>No customer payments or automatic emails are processed by the public demo. Commercial billing and verified notification delivery must be configured before launch.</p></details>
              <details><summary>Is the displayed price final?</summary><p>The proposed StudioTasker subscription is $49/month per studio, or $39/month when billed annually ($468/year). This is a launch target, not a live purchase offer. A studio\u2019s class packs are priced and sold separately by that studio.</p></details>
              <details><summary>Do I need to enter my own members to try it?</summary><p>No. Choose Explore the Demo to try fictional members, classes, bookings, reports and follow-up tasks. Please do not enter real personal information.</p></details>
            </div>
          </div>
        </section>
        <section className="ed-last"><div className="ed-container ed-last-grid"><div><span className="ed-overline">NOW, BACK TO WHAT MATTERS</span><h2>Less admin.<br/><em>More studio.</em></h2></div><div><p>See how simple the day could look.</p><Link href="/today" className="ed-last-link"><span>START WITH TODAY</span><ArrowUpRight size={22}/></Link></div><span className="ed-last-asterisk" aria-hidden="true">✳</span></div></section>
      </main>
      <footer className="ed-footer"><div className="ed-container ed-footer-main"><div><Identity inverse/><p>Thoughtfully uncomplicated studio software.</p></div><div className="ed-footer-nav"><a href="#features">Features</a><Link href="/app-demo">App login demo</Link><Link href="/today">StudioTasker Today</Link><Link href="/book/preview">Booking preview</Link><a href="#pricing">Pricing</a><Link href="/demo">CRM demo</Link></div></div><div className="ed-container ed-footer-bottom"><span>© 2026 STUDIOTASKER · DEVELOPMENT PREVIEW</span><span>BUILT FOR THE PEOPLE BEHIND THE PRACTICE. ✳</span></div></footer>
    </div>
  );
}
