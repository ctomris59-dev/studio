import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,CircleCheckBig,Layers3} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "../marketing-landing.css";

export const metadata:Metadata={
 title:"StudioTasker vs. Broader Studio Software",
 description:"See when StudioTasker's focused class-based studio operating system is a better fit than a broader all-in-one platform.",
 alternates:{canonical:"/compare"}
};

export default function Compare(){
 return <main className="mk-page">
  <header className="mk-top"><div className="mk-shell"><Link className="mk-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><nav className="mk-nav"><Link href="/">Studios</Link><Link href="/app-demo">Demo</Link><Link className="mk-nav-cta" href="/start">START · $39.90 <ArrowUpRight size={16}/></Link></nav></div></header>

  <section className="mk-hero"><div className="mk-shell mk-hero-grid">
   <div className="mk-hero-copy"><span className="mk-kicker">STUDIOTASKER · VS. BROADER PLATFORMS</span><h1>Need less software?<br/><em>Keep the essentials.</em></h1><p className="mk-hero-lede">StudioTasker is for independent class-based studios that want members, classes, bookings, credits, attendance, staff and follow-up in one focused workspace while keeping member payments with the studio.</p><div className="mk-hero-points"><span>$39.90 USD / MONTH</span><span>ONE STUDIO</span><span>SELF-SERVE</span></div><div className="mk-actions"><Link className="mk-primary" href="/app-demo"><span>TRY STUDIOTASKER</span><ArrowUpRight size={20}/></Link><Link className="mk-secondary" href="/start"><span>SEE PLANS</span><ArrowRight size={20}/></Link></div></div>
   <div className="mk-hero-art"><div className="mk-board"><div className="mk-board-head"><strong>Choose for the way you operate.</strong><span>FIT, NOT FEATURE COUNT</span></div><div className="mk-board-list"><span>STUDIOTASKER MAY FIT WHEN…</span>{[["01","You want simplicity","Focused owner workspace"],["02","Payments already work","Keep your current method"],["03","Follow-up matters","Today surfaces next actions"],["04","Price clarity matters","Flat software subscription"]].map(x=><article key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><i>→</i></article>)}</div></div><div className="mk-float">FIT OVER<br/>FEATURE COUNT.</div></div>
  </div></section>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">THE REAL QUESTION</span><h2>Which operating model<br/><em>fits your studio?</em></h2></div><p>Broader platforms can be the right choice when you want payments, marketplaces, marketing and enterprise controls inside one ecosystem. StudioTasker deliberately stays focused on day-to-day studio operations.</p></div><div className="mk-fit">
   <article className="is-yes"><h3>StudioTasker is a strong fit if…</h3><ul>{["You run an independent class-based studio.","You want recurring classes, waitlists, attendance, CRM, credits and follow-up together.","You want to keep your existing member-payment method.","You prefer self-serve onboarding and transparent pricing.","You want operational signals without a large enterprise stack."].map(x=><li key={x}><CircleCheckBig size={18}/><span>{x}</span></li>)}</ul></article>
   <article><h3>A broader platform may fit better if…</h3><ul>{["Integrated member payment processing is essential.","A consumer marketplace is central to client acquisition.","Built-in mass marketing automation is a core requirement.","You need advanced franchise or multi-location enterprise controls.","You want a larger all-in-one ecosystem even if it adds complexity."].map(x=><li key={x}><Layers3 size={18}/><span>{x}</span></li>)}</ul></article>
  </div></div></section>

  <section className="mk-section dark"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">SIDE BY SIDE</span><h2>Focused operations.<br/><em>Clear boundaries.</em></h2></div><p>This compares general product approaches only. Other software varies by provider, plan and market; StudioTasker does not make feature claims about any named competitor.</p></div><table className="mk-compare"><thead><tr><th>Area</th><th>StudioTasker</th><th>Broader platforms may</th></tr></thead><tbody>
   <tr><td>Studio operations</td><td>Classes, waitlists, attendance, CRM, credits, staff and follow-up</td><td>Combine operations with a wider feature ecosystem</td></tr>
   <tr><td>Member payments</td><td>Stay with the studio&apos;s existing method</td><td>Offer or require integrated processing</td></tr>
   <tr><td>Onboarding</td><td>Self-serve workspace and CSV migration</td><td>Use sales-led setup, training or implementation</td></tr>
   <tr><td>Price model</td><td>$39.90/month per studio or $406.80/year</td><td>Use plan, location, feature or usage-based pricing</td></tr>
  </tbody></table></div></section>

  <section className="mk-last"><div className="mk-shell"><h2>See if focused<br/>fits better.</h2><div><p>Use the 90-second guided demo first. No sales call and no sign-up required.</p><div className="mk-actions"><Link className="mk-primary" href="/app-demo?tour=1">WATCH THE DEMO <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/start">SEE PLANS <ArrowRight size={19}/></Link></div></div></div></section>
  <footer className="mk-footer"><div className="mk-shell"><p>StudioTasker · focused class-based studio management software.</p><nav><Link href="/">Home</Link><Link href="/legal">Legal & Trust</Link><Link href="/start">Pricing</Link></nav></div></footer>
 </main>
}
