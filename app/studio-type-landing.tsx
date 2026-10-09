import Link from "next/link";
import {Activity,ArrowRight,ArrowUpRight,Bike,CalendarDays,Check,CircleCheckBig,Clock3,CreditCard,Dumbbell,HeartPulse,Users,Waves} from "lucide-react";
import {StudioTaskerMark} from "../components/studio-tasker-mark";
import {JsonLd} from "../components/json-ld";
import {breadcrumbJsonLd,studioTypeLinks} from "../lib/seo";
import "./marketing-landing.css";

type IconName="calendar"|"users"|"clock"|"activity"|"heart"|"bike"|"dumbbell"|"waves";
type Card={icon:IconName;title:string;copy:string};
export type StudioLandingConfig={
 path:string;
 seoName:string;
 kicker:string;
 heroLine:string;
 heroEm:string;
 lede:string;
 boardName:string;
 strip:string[];
 dailyLine:string;
 dailyEm:string;
 dailyCopy:string;
 cards:[Card,Card,Card];
 fitLine:string;
 fitEm:string;
 fitCopy:string;
 strongFits:string[];
 broaderFits:string[];
 faqLabel:string;
 faqs:[string,string][];
};

const icons={calendar:CalendarDays,users:Users,clock:Clock3,activity:Activity,heart:HeartPulse,bike:Bike,dumbbell:Dumbbell,waves:Waves};

export function StudioTypeLanding({config}:{config:StudioLandingConfig}){
 const faqJson={"@context":"https://schema.org","@type":"FAQPage","mainEntity":config.faqs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))};
 return <main className="mk-page"><a className="studio-skip-link" href="#main-content">Skip to main content</a>
  <JsonLd data={faqJson}/>
  <JsonLd data={breadcrumbJsonLd([{name:"Home",path:"/"},{name:"Studio software",path:"/#studio-types"},{name:config.seoName,path:config.path}])}/>
  <header className="mk-top"><div className="mk-shell"><Link className="mk-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><nav className="mk-nav"><Link href="/">Studios</Link><Link href="/compare">VS. others</Link><Link href="/app-demo">Demo</Link><Link className="mk-nav-cta" href="/start">START · $39.90 <ArrowUpRight size={16}/></Link></nav></div></header>

  <section id="main-content" tabIndex={-1} className="mk-hero"><div className="mk-shell mk-hero-grid">
   <div className="mk-hero-copy"><span className="mk-kicker">{config.kicker}</span><h1>{config.heroLine}<br/><em>{config.heroEm}</em></h1><p className="mk-hero-lede">{config.lede}</p><div className="mk-hero-points"><span>USA</span><span>CANADA</span><span>UK</span><span>EUROPE</span><span>INTERNATIONAL</span></div><div className="mk-actions"><Link className="mk-primary" href="/start"><span>START STUDIOTASKER · $39.90</span><ArrowUpRight size={20}/></Link><Link className="mk-secondary" href="/app-demo"><span>TRY THE DEMO</span><ArrowRight size={20}/></Link></div></div>
   <div className="mk-hero-art"><div className="mk-board"><div className="mk-board-head"><strong>{config.boardName}</strong><span>TODAY / WEDNESDAY</span></div><div className="mk-board-metrics"><div><small>CLASSES</small><b>8</b></div><div><small>BOOKINGS</small><b>42</b></div><div><small>CAPACITY</small><b>84%</b></div></div><div className="mk-board-list"><span>WHAT NEEDS ATTENTION</span>{[["HIGH","Trial follow-up","Mia · attended yesterday"],["HIGH","Low credits","Oliver · 1 class remaining"],["MED","Inactive member","Emma · 24 days"],["LOW","Open places","Tomorrow · 3 spots"]].map(x=><article key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><i>→</i></article>)}</div></div><div className="mk-float">LESS ADMIN.<br/>MORE MOVEMENT.</div></div>
  </div></section>

  <div className="mk-strip"><div className="mk-shell">{config.strip.map(x=><span key={x}>{x}</span>)}</div></div>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">THE DAILY WORK</span><h2>{config.dailyLine}<br/><em>{config.dailyEm}</em></h2></div><p>{config.dailyCopy}</p></div><div className="mk-grid">
   {config.cards.map(card=>{const Icon=icons[card.icon];return <article className="mk-card" key={card.title}><Icon size={27}/><h3>{card.title}</h3><p>{card.copy}</p></article>})}
  </div></div></section>

  <section className="mk-section"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">A GOOD FIT?</span><h2>{config.fitLine}<br/><em>{config.fitEm}</em></h2></div><p>{config.fitCopy}</p></div><div className="mk-fit">
   <article className="is-yes"><h3>StudioTasker is a strong fit if…</h3><ul>{config.strongFits.map(x=><li key={x}><CircleCheckBig size={18}/><span>{x}</span></li>)}</ul></article>
   <article><h3>A broader platform may fit better if…</h3><ul>{config.broaderFits.map(x=><li key={x}><CreditCard size={18}/><span>{x}</span></li>)}</ul></article>
  </div></div></section>

  <section className="mk-section dark"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">STUDIOTASKER TODAY</span><h2>Your software should tell you<br/><em>what needs attention.</em></h2></div><p>StudioTasker turns studio-entered operational data into explainable next-action signals while leaving the decision with your team.</p></div><table className="mk-compare"><thead><tr><th>Signal</th><th>What StudioTasker shows</th><th>What you decide</th></tr></thead><tbody><tr><td>Trial attended</td><td>No package recorded after your follow-up window</td><td>Contact, create a task or dismiss</td></tr><tr><td>Low credits</td><td>Member is approaching your chosen threshold</td><td>Review renewal opportunity</td></tr><tr><td>Inactivity</td><td>No visit for your chosen number of days</td><td>Follow up or leave it alone</td></tr><tr><td>Open places</td><td>Upcoming class is below your occupancy threshold</td><td>Decide whether to promote it</td></tr></tbody></table></div></section>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-price"><div className="mk-price-main"><span>ONE STUDIO · FULL WORKSPACE</span><div className="mk-price-number">$39<small>.90 USD / MONTH</small></div><p>Annual billing is $406.80 USD/year · $33.90/month equivalent · save $72/year. No per-member StudioTasker pricing.</p></div><div className="mk-price-list"><ul>{["Recurring classes and waitlists","Check-in, cancellation and no-show workflows","Lead and member CRM","Packages, credits and attendance","Staff roster and operational insights","CSV migration with preview"].map(x=><li key={x}><Check size={18}/><span>{x}</span></li>)}</ul><div className="mk-actions"><Link className="mk-primary" href="/start">START STUDIOTASKER <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/app-demo">TRY DEMO <ArrowRight size={19}/></Link></div></div></div></div></section>

  <section className="mk-section"><div className="mk-shell mk-faq"><div><span className="mk-kicker">{config.faqLabel}</span><h2>Before you start.</h2></div><div className="mk-faq-list">{config.faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">EXPLORE STUDIO TYPES</span><h2>Built around<br/><em>class-based businesses.</em></h2></div><p>Explore how the same operating system adapts to different studio models without creating disconnected product silos.</p></div><div className="mk-fit">{studioTypeLinks.filter(x=>x.href!==config.path).map(x=><Link key={x.href} href={x.href} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"16px 0",borderBottom:"1px solid #ccd0d8",color:"inherit",textDecoration:"none",fontWeight:800}}><span>{x.name} software</span><span>→</span></Link>)}</div></div></section>
  <section className="mk-last"><div className="mk-shell"><h2>Less admin.<br/>More studio.</h2><div><p>Explore the owner workspace with fictional data first, or create your StudioTasker account when you are ready.</p><div className="mk-actions"><Link className="mk-primary" href="/start">START · $39.90 <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/app-demo">EXPLORE DEMO <ArrowRight size={19}/></Link></div></div></div></section>
  <footer className="mk-footer"><div className="mk-shell"><p>StudioTasker · class-based studio management software for independent studios.</p><nav><Link href="/">Home</Link><Link href="/compare">VS. others</Link><Link href="/legal">Legal & Trust</Link><Link href="/start">Pricing</Link></nav></div></footer>
 </main>;
}
