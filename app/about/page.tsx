import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,Check,Globe2,ShieldCheck} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import {JsonLd} from "../../components/json-ld";
import {breadcrumbJsonLd} from "../../lib/seo";
import "../marketing-landing.css";

export const metadata:Metadata={
 title:"About StudioTasker | Focused Studio Management Software",
 description:"Learn what StudioTasker is, who it is built for, what it manages and what it intentionally leaves with the studio.",
 alternates:{canonical:"/about"},
 robots:{index:true,follow:true}
};

export default function About(){
 return <main className="mk-page">
  <JsonLd data={breadcrumbJsonLd([{name:"Home",path:"/"},{name:"About StudioTasker",path:"/about"}])}/>
  <header className="mk-top"><div className="mk-shell"><Link className="mk-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><nav className="mk-nav"><Link href="/">Studios</Link><Link href="/compare">VS. others</Link><Link href="/app-demo">Demo</Link><Link className="mk-nav-cta" href="/start">START · $39.90 <ArrowUpRight size={16}/></Link></nav></div></header>
  <section className="mk-hero"><div className="mk-shell mk-hero-grid">
   <div className="mk-hero-copy"><span className="mk-kicker">ABOUT STUDIOTASKER</span><h1>Focused software.<br/><em>For class-based studios.</em></h1><p className="mk-hero-lede">StudioTasker is English-first studio management software for independent Pilates, yoga, barre, dance, indoor cycling, fitness and boutique studios. It keeps day-to-day operations visible without trying to replace every system a studio already uses.</p><div className="mk-hero-points"><span>INDEPENDENT STUDIOS</span><span>GLOBAL</span><span>SELF-SERVE</span></div></div>
   <div className="mk-hero-art"><div className="mk-board"><div className="mk-board-head"><strong>What StudioTasker owns</strong><span>OPERATIONS</span></div><div className="mk-board-list">{[["01","Members & leads","CRM and context"],["02","Classes","Schedules, waitlists, attendance"],["03","Packages & credits","Studio-managed entitlements"],["04","Follow-up","Clear next actions"]].map(x=><article key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><i>→</i></article>)}</div></div><div className="mk-float">LESS ADMIN.<br/>MORE MOVEMENT.</div></div>
  </div></section>
  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">THE PRODUCT BOUNDARY</span><h2>Clear about what it does.<br/><em>Clear about what it does not.</em></h2></div><p>StudioTasker is the operating layer for a class-based studio. It is not a consumer marketplace, a bank or the studio&apos;s member-payment processor.</p></div><div className="mk-grid">
   <article className="mk-card"><Check size={27}/><h3>Studio operations.</h3><p>Recurring schedules, waitlists, equipment spots, check-in, attendance, no-shows, CRM, credits, staff and operational insights.</p></article>
   <article className="mk-card"><ShieldCheck size={27}/><h3>Payment independence.</h3><p>Studios keep their existing method for collecting money from members. StudioTasker bills only for the StudioTasker software subscription.</p></article>
   <article className="mk-card"><Globe2 size={27}/><h3>Global-first.</h3><p>Designed for independent studios in the USA, Canada, UK, Europe and other supported markets, with studio timezone, week-start and 12/24-hour preferences.</p></article>
  </div></div></section>
  <section className="mk-section dark"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">ONE PRODUCT · ONE PRICE MODEL</span><h2>$39.90 monthly.<br/><em>$33.90/month yearly equivalent.</em></h2></div><p>One studio workspace is $39.90 USD/month or $406.80 USD/year. The annual plan is $72 lower than twelve monthly payments. Subscription checkout is handled by Paddle as Merchant of Record.</p></div></div></section>
  <section className="mk-last"><div className="mk-shell"><h2>See the product<br/>before you buy.</h2><div><p>The guided demo uses fictional studio data and does not require a sales call or account.</p><div className="mk-actions"><Link className="mk-primary" href="/app-demo?tour=1">WATCH THE DEMO <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/start">SEE PLANS <ArrowRight size={19}/></Link></div></div></div></section>
  <footer className="mk-footer"><div className="mk-shell"><p>StudioTasker · focused class-based studio management software.</p><nav><Link href="/">Home</Link><Link href="/contact">Contact</Link><Link href="/legal">Legal & Trust</Link><Link href="/start">Pricing</Link></nav></div></footer>
 </main>
}
