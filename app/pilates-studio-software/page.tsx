import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,CalendarDays,Check,CircleCheckBig,Clock3,CreditCard,Users} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "../marketing-landing.css";

export const metadata:Metadata={
 title:"Pilates Studio Software — StudioTasker",
 description:"Simple Pilates and Reformer studio management software for independent studios worldwide. Manage members, classes, bookings, credits, attendance and follow-ups for $39.90 USD/month."
};

const faqs=[
 ["Is StudioTasker only for Pilates studios?","No. StudioTasker also supports yoga, barre, dance, gyms and other class-based studios. This page focuses on Pilates because the same workflows—classes, credits, attendance, trials and renewals—fit independent Pilates and Reformer studios especially well."],
 ["Can I manage Reformer classes and capacity?","Yes. Create classes, set capacity, assign instructors and rooms, track bookings and attendance, and see open-place signals in StudioTasker Today."],
 ["Does StudioTasker process my members’ payments?","No. StudioTasker deliberately keeps member payments outside the software. Keep your existing payment method, such as card processing, bank transfer or cash."],
 ["Can I import my current member list?","Yes. StudioTasker includes CSV migration with preview so you can bring in existing member records without retyping them one by one."],
 ["Is StudioTasker available in the US and Europe?","Yes. StudioTasker is English-first software designed for independent studios in the USA, Canada, UK, Europe and other international markets. Each studio can choose its own timezone, 12/24-hour clock and week-start preference."],
 ["How much does it cost?","StudioTasker is $39.90 USD per studio per month, or $406.80 USD per year when billed annually ($33.90/month equivalent, about 15% lower)."]
];

export default function PilatesStudioSoftware(){
 const faqJson={"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))};
 return <main className="mk-page">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqJson)}}/>
  <header className="mk-top"><div className="mk-shell"><Link className="mk-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><nav className="mk-nav"><Link href="/app-demo">Demo</Link><Link href="/compare">VS. others</Link><Link className="mk-nav-cta" href="/start">START · $39.90 <ArrowUpRight size={16}/></Link></nav></div></header>
  <section className="mk-hero"><div className="mk-shell mk-hero-grid">
   <div className="mk-hero-copy"><span className="mk-kicker">PILATES STUDIO SOFTWARE · GLOBAL</span><h1>Run the studio.<br/><em>Not the software.</em></h1><p className="mk-hero-lede">StudioTasker gives independent Pilates and Reformer studios one clear place for members, classes, bookings, credits, attendance and follow-ups—without taking over how you collect member payments.</p><div className="mk-hero-points"><span>USA</span><span>CANADA</span><span>UK</span><span>EUROPE</span><span>WORLDWIDE</span></div><div className="mk-actions"><Link className="mk-primary" href="/start"><span>START STUDIOTASKER · $39.90</span><ArrowUpRight size={20}/></Link><Link className="mk-secondary" href="/app-demo"><span>TRY THE DEMO</span><ArrowRight size={20}/></Link></div></div>
   <div className="mk-hero-art"><div className="mk-board"><div className="mk-board-head"><strong>Willow Reformer Studio</strong><span>TODAY / WEDNESDAY</span></div><div className="mk-board-metrics"><div><small>CLASSES</small><b>8</b></div><div><small>BOOKINGS</small><b>42</b></div><div><small>CAPACITY</small><b>84%</b></div></div><div className="mk-board-list"><span>WHAT NEEDS ATTENTION</span>{[["HIGH","Trial follow-up","Mia · attended yesterday"],["HIGH","Low credits","Oliver · 1 class remaining"],["MED","Inactive member","Emma · 24 days"],["LOW","Open places","Reformer Flow · 3 spots"]].map(x=><article key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><i>→</i></article>)}</div></div><div className="mk-float">LESS ADMIN.<br/>MORE MOVEMENT.</div></div>
  </div></section>
  <div className="mk-strip"><div className="mk-shell"><span>REFORMER PILATES</span><span>MAT PILATES</span><span>PRIVATE SESSIONS</span><span>GROUP CLASSES</span><span>PACKS & CREDITS</span></div></div>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">THE DAILY WORK</span><h2>Everything your Pilates studio<br/><em>needs to keep moving.</em></h2></div><p>StudioTasker focuses on the operational layer independent studios touch every day. It is intentionally not a payment processor, marketplace or giant enterprise suite.</p></div><div className="mk-grid">
   <article className="mk-card"><CalendarDays size={27}/><h3>Classes that stay clear.</h3><p>Create schedules, assign instructors and rooms, set Reformer capacity, track bookings and attendance, and spot open places.</p></article>
   <article className="mk-card"><Users size={27}/><h3>Members you can actually follow.</h3><p>Keep leads, trial visitors, active members and relationship notes in one studio CRM instead of scattered spreadsheets.</p></article>
   <article className="mk-card"><Clock3 size={27}/><h3>Follow-ups before they disappear.</h3><p>See trials without a next step, low credits, inactivity and renewal opportunities through explainable StudioTasker Today rules.</p></article>
  </div></div></section>

  <section className="mk-section"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">A GOOD FIT?</span><h2>Built for the independent<br/><em>Pilates studio.</em></h2></div><p>You do not need to change the way you take payments just to get better studio operations.</p></div><div className="mk-fit">
   <article className="is-yes"><h3>StudioTasker is a strong fit if…</h3><ul>{["You run one independent Pilates or Reformer studio.","You want classes, CRM, credits and follow-ups in one place.","You already have a payment method you like.","You want a simple owner workspace instead of a large software stack.","You prefer one flat software price per studio."].map(x=><li key={x}><CircleCheckBig size={18}/><span>{x}</span></li>)}</ul></article>
   <article><h3>You may need a larger platform if…</h3><ul>{["You require integrated member card processing inside the same platform.","You rely heavily on a consumer marketplace to acquire clients.","You need complex multi-location enterprise controls today.","You need built-in mass email/SMS marketing automation as a core requirement."].map(x=><li key={x}><CreditCard size={18}/><span>{x}</span></li>)}</ul></article>
  </div></div></section>

  <section className="mk-section dark"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">STUDIOTASKER TODAY</span><h2>Your software should tell you<br/><em>what needs attention.</em></h2></div><p>Instead of making you hunt through reports, StudioTasker surfaces explainable operational signals and leaves the next action in your hands.</p></div><table className="mk-compare"><thead><tr><th>Signal</th><th>What StudioTasker shows</th><th>What you decide</th></tr></thead><tbody><tr><td>Trial attended</td><td>No package recorded after a configurable follow-up window</td><td>Contact, create a task or dismiss</td></tr><tr><td>Low credits</td><td>Member is approaching the threshold you set</td><td>Review renewal opportunity</td></tr><tr><td>Inactivity</td><td>No visit for your chosen number of days</td><td>Follow up or leave it alone</td></tr><tr><td>Open places</td><td>Tomorrow’s class is below your occupancy threshold</td><td>Decide whether to promote it</td></tr></tbody></table></div></section>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-price"><div className="mk-price-main"><span>ONE STUDIO · FULL WORKSPACE</span><div className="mk-price-number">$39<small>.90 USD / MONTH</small></div><p>Annual billing is $406.80 USD/year — $33.90/month equivalent, save 15%. No per-member StudioTasker pricing.</p></div><div className="mk-price-list"><ul>{["StudioTasker Today priorities","Lead and member CRM","Classes, rooms, capacity and attendance","Studio-managed packages and credits","CSV member migration with preview","Studio branding and timezone settings"].map(x=><li key={x}><Check size={18}/><span>{x}</span></li>)}</ul><div className="mk-actions"><Link className="mk-primary" href="/start">START STUDIOTASKER <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/app-demo">TRY DEMO <ArrowRight size={19}/></Link></div></div></div></div></section>

  <section className="mk-section"><div className="mk-shell mk-faq"><div><span className="mk-kicker">PILATES SOFTWARE FAQ</span><h2>Before you start.</h2></div><div className="mk-faq-list">{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
  <section className="mk-last"><div className="mk-shell"><h2>Less admin.<br/>More studio.</h2><div><p>See the owner workspace with sample data first, or create your StudioTasker account when you are ready.</p><div className="mk-actions"><Link className="mk-primary" href="/start">START · $39.90 <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/app-demo">EXPLORE DEMO <ArrowRight size={19}/></Link></div></div></div></section>
  <footer className="mk-footer"><div className="mk-shell"><p>StudioTasker · studio management software for independent studios worldwide.</p><nav><Link href="/">Home</Link><Link href="/compare">VS. others</Link><Link href="/legal">Legal & Trust</Link><Link href="/start">Pricing</Link></nav></div></footer>
 </main>
}
