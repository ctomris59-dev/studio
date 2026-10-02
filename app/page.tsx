import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleCheck, Clock3, CreditCard, Heart, LayoutDashboard, Menu, MoveUpRight, Play, ShieldCheck, Sparkles, Users, WandSparkles, Waves, Zap } from "lucide-react";

const benefits = [
  { number: "01", icon: CalendarDays, title: "A schedule that just flows.", text: "Create recurring classes, set reformer capacity, and see every booking in a single glance.", detail: "Fewer tabs. More clarity." },
  { number: "02", icon: CreditCard, title: "Class packs, minus the maths.", text: "Keep track of 5-class, 10-class and unlimited plans, without another spreadsheet.", detail: "Every credit accounted for." },
  { number: "03", icon: Users, title: "Your people, all in one place.", text: "Know your members, their packages and upcoming sessions—without the admin overload.", detail: "A little more personal." },
];

const weekDays = ["MON", "TUE", "WED", "THU", "FRI"];
const schedule = [
  {time:"07:30",name:"Morning Reset",with:"Sophie",capacity:"6 / 8",width:"75%",type:"green"},
  {time:"09:00",name:"Reformer Foundations",with:"Olivia",capacity:"8 / 8",width:"100%",type:"terra"},
  {time:"12:30",name:"Midday Flow",with:"Ava",capacity:"5 / 8",width:"62%",type:"green"},
  {time:"17:30",name:"Evening Sculpt",with:"Sophie",capacity:"7 / 8",width:"87%",type:"green"},
];

function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/" className={light ? "brand brand-light" : "brand"} aria-label="ReformDesk home"><span className="brand-symbol"><span/><span/><span/></span><span>reform<span className="brand-bold">desk</span><b>.</b></span></Link>;
}

export default function Home() {
  return (
    <div className="site">
      <header className="site-header">
        <div className="container nav-wrap">
          <Logo />
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="nav-actions"><Link className="nav-signin" href="/demo">Live demo <ArrowUpRight size={15}/></Link><Link className="btn btn-dark btn-sm" href="/demo">Explore the demo <ArrowRight size={16}/></Link></div>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="container hero-layout">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot"/> FOR THE STUDIOS THAT MOVE US</div>
              <h1>Less admin.<br/><em>More movement.</em></h1>
              <p className="hero-lede">Your Pilates studio deserves a little breathing room. Meet the refreshingly simple space for classes, clients, and everything in between.</p>
              <div className="hero-actions"><Link className="btn btn-dark btn-lg" href="/demo">Explore interactive demo <ArrowUpRight size={18}/></Link><a className="text-cta" href="#how-it-works"><span className="play-circle"><Play size={13} fill="currentColor"/></span> See how it works</a></div>
              <div className="hero-foot"><div className="mini-avatars"><span>AM</span><span>SL</span><span>KC</span></div><p><strong>Built for independent studios</strong><br/>Made for the way you actually work.</p></div>
            </div>
            <div className="hero-visual" aria-label="Preview of Pilates studio dashboard">
              <div className="hero-art">
                <div className="art-sun"></div><div className="art-arch"></div>
                <div className="art-floor"></div>
                <div className="pilates-rig"><div className="rig-rope rope-left"></div><div className="rig-rope rope-right"></div><div className="rig-bed"></div><div className="rig-leg leg-1"></div><div className="rig-leg leg-2"></div><div className="rig-pillow"></div><div className="rig-rail"></div></div>
                <div className="art-label">A little space to breathe.</div>
              </div>
              <div className="preview-card">
                <div className="preview-head"><span className="preview-mark"><Waves size={17}/></span><div><strong>Good morning, Alex <span>✳</span></strong><small>Here&apos;s your studio today</small></div><span className="preview-more">•••</span></div>
                <div className="preview-stats"><div><small>TODAY&apos;S CLASSES</small><b>08</b></div><div><small>BOOKINGS</small><b>42</b></div><div><small>CAPACITY</small><b>84%</b></div></div>
                <div className="preview-row-title"><strong>Today&apos;s schedule</strong><span>View all <ArrowRight size={13}/></span></div>
                {schedule.slice(0,3).map((item)=> <div className="preview-row" key={item.time}><span className="preview-time">{item.time}</span><span className="preview-class"><b>{item.name}</b><small>with {item.with}</small></span><span className="preview-seats">{item.capacity}</span><span className={"preview-indicator "+item.type}></span></div>)}
              </div>
              <div className="floating-note"><span><CircleCheck size={18}/></span><div><b>All caught up!</b><small>You&apos;re right on track today.</small></div></div>
            </div>
          </div>
          <div className="hero-bottom"><span>INTENTIONALLY SIMPLE</span><span className="hero-bottom-flower">✳</span><span>BUILT FOR REAL STUDIO LIFE</span></div>
        </section>
        <section className="intro-band"><div className="container"><div className="center-eyebrow">A BETTER WAY TO RUN YOUR STUDIO</div><h2>Beautifully simple software.<br/><em>More room for what matters.</em></h2><p>Because you started a Pilates studio to teach, connect, and inspire—not spend your evenings in spreadsheets.</p></div></section>
        <section className="features section-pad" id="features"><div className="container">
          <div className="section-heading"><div><span className="section-kicker">EVERYTHING YOU NEED. NOTHING YOU DON&apos;T.</span><h2>Run your studio.<br/><em>Not the other way around.</em></h2></div><p>Less bouncing between tools. More time making your studio the place everyone loves to be.</p></div>
          <div className="feature-grid">
            {benefits.map((b)=>{const Icon=b.icon;return <div className="feature-card" key={b.number}><div className="feature-top"><span>{b.number} / 03</span><span className="feature-icon"><Icon size={23} strokeWidth={1.7}/></span></div><h3>{b.title}</h3><p>{b.text}</p><div className="feature-bottom"><span><Check size={15}/>{b.detail}</span><ArrowUpRight size={20}/></div></div>})}
          </div>
        </div></section>
        <section className="product-section" id="how-it-works"><div className="container product-layout">
          <div className="product-copy"><span className="section-kicker">ONE CALM PLACE FOR IT ALL</span><h2>A clear view<br/>of <em>every day.</em></h2><p>Your studio&apos;s entire day, beautifully laid out. See who&apos;s coming, what&apos;s full, and where there&apos;s room to grow.</p><div className="product-points"><div><span><CalendarDays size={19}/></span><div><strong>Classes at a glance</strong><p>Daily schedules with live availability.</p></div></div><div><span><WandSparkles size={19}/></span><div><strong>Waitlists that make sense</strong><p>Keep an eye on the next person in line.</p></div></div><div><span><Heart size={19}/></span><div><strong>Know your community</strong><p>Member profiles and class credits together.</p></div></div></div><Link className="btn btn-dark btn-lg" href="/demo">Try the working demo <ArrowRight size={17}/></Link></div>
          <div className="calendar-frame">
            <div className="calendar-head"><div><small>YOUR STUDIO</small><h3>Weekly schedule</h3></div><div className="calendar-nav"><span>‹</span><strong>This week</strong><span>›</span></div></div>
            <div className="calendar-days">{weekDays.map((d,i)=><div className={i===2?"cal-day selected":"cal-day"} key={d}><small>{d}</small><b>{12+i}</b></div>)}</div>
            <div className="calendar-list"><div className="cal-list-head"><strong>Wednesday, 14 October</strong><span>4 classes</span></div>{schedule.map((s)=><div className="cal-row" key={s.time}><div className="cal-time">{s.time}</div><div className="cal-left"><b>{s.name}</b><small>{s.with} • Reformer</small></div><div className="cal-bar"><div style={{width:s.width}}/></div><div className="cal-count">{s.capacity}</div><span className={s.type==="terra"?"cal-status full":"cal-status"}>{s.type==="terra"?"Full":"Open"}</span></div>)}</div>
            <div className="calendar-footer"><span><span className="green-circle"/> 27 bookings today</span><span>See all classes <ArrowRight size={13}/></span></div>
          </div>
        </div></section>
        <section className="story-section"><div className="container story-layout"><div className="story-orbit"><div className="orbit-ring one"></div><div className="orbit-ring two"></div><div className="orbit-middle"><Waves size={66} strokeWidth={1}/></div><span className="orbit-floating orbit-one">✳</span><span className="orbit-floating orbit-two">+</span></div><div className="story-copy"><span className="section-kicker">MADE FOR THE LITTLE DETAILS</span><h2>You bring the energy.<br/><em>We&apos;ll bring the ease.</em></h2><p>From your first morning class to your last evening stretch, ReformDesk keeps the small stuff feeling small.</p><div className="story-checks"><span><Check size={17}/> No complicated setup</span><span><Check size={17}/> No bloated toolkits</span><span><Check size={17}/> No per-booking platform fees from us*</span></div><small>* Payment processing fees from your chosen providers may still apply if you use them outside ReformDesk.</small></div></div></section>
        <section className="pricing-section section-pad" id="pricing"><div className="container"><div className="pricing-title"><span className="section-kicker">STRAIGHTFORWARD BY DESIGN</span><h2>One studio. One price.<br/><em>No guessing games.</em></h2><p>Simple, transparent pricing is our goal. We&apos;re inviting studios to shape the first release.</p></div><div className="pricing-card"><div className="price-left"><span className="price-badge"><Sparkles size={13}/> EARLY ACCESS CONCEPT</span><h3>Studio Essential</h3><p>For independent reformer studios that want their time back.</p><div className="price-display"><span>$</span><strong>129</strong><span>/ month</span></div><small>Illustrative pricing — not yet available to purchase.</small><Link className="btn btn-light btn-lg" href="/demo">Explore the demo <ArrowUpRight size={18}/></Link></div><div className="price-right"><strong>Designed to include</strong>{["Classes & instructor scheduling","Reformer capacity & booking tracking","Member profiles & class packs","Waitlist and cancellation flows","Mobile-friendly studio dashboard","Easy setup without IT support"].map(x=><div key={x}><Check size={18}/><span>{x}</span></div>)}<div className="price-note"><ShieldCheck size={20}/><p>Live payments, customer accounts and production storage are not enabled in this demonstration.</p></div></div></div></div></section>
        <section className="final-cta"><div className="container cta-inner"><div><span className="section-kicker">YOUR STUDIO, A LITTLE LIGHTER</span><h2>Make space for <em>more.</em></h2><p>Discover what a simpler studio day could feel like.</p></div><Link className="btn btn-light btn-lg" href="/demo">See the interactive demo <ArrowUpRight size={18}/></Link></div></section>
      </main>
      <footer className="footer"><div className="container footer-top"><div><Logo light/><p>A calmer way to run your Pilates studio.<br/>Made for the people behind the practice.</p></div><div className="footer-links"><a href="#features">Features</a><a href="#pricing">Pricing</a><Link href="/demo">Live demo</Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} ReformDesk. Concept preview.</span><span>Made with care, for the studios that move us. ✳</span></div></footer>
    </div>
  );
}
