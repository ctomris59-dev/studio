import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,Check,CircleCheckBig,CreditCard,Layers3,ShieldCheck,Users} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "../marketing-landing.css";

export const metadata:Metadata={
 title:"Mindbody Alternative for Independent Studios — StudioTasker",
 description:"Looking for a simpler Mindbody alternative? StudioTasker gives independent studios CRM, classes, bookings, credits and follow-ups for $39.90 USD/month while keeping member payments separate."
};

const faqs=[
 ["Is StudioTasker a direct replacement for every Mindbody feature?","No. StudioTasker is deliberately narrower. It focuses on independent-studio operations such as CRM, classes, studio-managed bookings, attendance, credits and follow-ups. It does not try to replace Mindbody’s integrated payment processing, consumer marketplace or broader marketing ecosystem."],
 ["Why would a studio choose StudioTasker instead?","A studio may prefer StudioTasker if it wants a smaller operational workspace, a flat $39.90 USD monthly software price, and the freedom to keep member payments with its existing provider."],
 ["When should I choose Mindbody instead?","Mindbody may be a better fit if integrated payments, a large consumer marketplace, advanced marketing tools, multi-location operations or its wider ecosystem are central to your business."],
 ["How much does StudioTasker cost?","StudioTasker is $39.90 USD per studio per month or $418.80 USD per year. Mindbody’s official U.S. pricing page currently lists plans starting at $79 USD/month per location; pricing and optional services can change, so verify Mindbody’s current offer directly."],
 ["Can I try StudioTasker before switching?","Yes. The interactive owner demo uses fictional data and requires no sign-up. You can explore the workflow before creating a studio account."],
 ["Can I import member records?","Yes. StudioTasker includes CSV migration with preview for member records, helping reduce manual re-entry during a move."]
];

export default function MindbodyAlternative(){
 const faqJson={"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))};
 return <main className="mk-page">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqJson)}}/>
  <header className="mk-top"><div className="mk-shell"><Link className="mk-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><nav className="mk-nav"><Link href="/pilates-studio-software">Pilates software</Link><Link href="/app-demo">Demo</Link><Link className="mk-nav-cta" href="/start">START · $39.90 <ArrowUpRight size={16}/></Link></nav></div></header>
  <section className="mk-hero"><div className="mk-shell mk-hero-grid">
   <div className="mk-hero-copy"><span className="mk-kicker">MINDBODY ALTERNATIVE · INDEPENDENT STUDIOS</span><h1>Need less software?<br/><em>Keep the essentials.</em></h1><p className="mk-hero-lede">StudioTasker is for studio owners who want a focused workspace for members, classes, bookings, credits and follow-ups—and prefer to keep member payments outside their studio-management software.</p><div className="mk-hero-points"><span>$39.90 USD / MONTH</span><span>ONE STUDIO</span><span>NO PER-MEMBER PRICING</span></div><div className="mk-actions"><Link className="mk-primary" href="/app-demo"><span>TRY STUDIOTASKER</span><ArrowUpRight size={20}/></Link><Link className="mk-secondary" href="/start"><span>SEE PRICING</span><ArrowRight size={20}/></Link></div></div>
   <div className="mk-hero-art"><div className="mk-board"><div className="mk-board-head"><strong>Choose for the way you operate.</strong><span>FOCUSED COMPARISON</span></div><div className="mk-board-list"><span>STUDIOTASKER MAY FIT WHEN…</span>{[["01","You want simplicity","Focused owner workspace"],["02","Payments already work","Keep your current provider"],["03","Follow-up matters","Today surfaces next actions"],["04","Price clarity matters","Flat $39.90 per studio"]].map(x=><article key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><i>→</i></article>)}</div></div><div className="mk-float">A SMALLER<br/>OPERATIONAL STACK.</div></div>
  </div></section>
  <div className="mk-strip"><div className="mk-shell"><span>SIMPLER OPERATIONS</span><span>FLAT SOFTWARE PRICE</span><span>KEEP YOUR PAYMENTS</span><span>GLOBAL STUDIOS</span></div></div>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">THE REAL QUESTION</span><h2>Not “which has more?”<br/><em>Which fits your studio?</em></h2></div><p>Mindbody is a broad platform with integrated payments, consumer discovery and a larger ecosystem. StudioTasker is intentionally smaller. The right choice depends on what you actually want your software to own.</p></div><div className="mk-fit">
   <article className="is-yes"><h3>Choose StudioTasker if…</h3><ul>{["You want CRM, classes, credits, attendance and follow-ups without a huge stack.","You want to keep Stripe, Square, bank transfer or another member-payment method.","You run an independent studio and value a simple owner workflow.","You want StudioTasker Today to surface operational follow-up signals.","A flat $39.90 USD monthly software price fits your model."].map(x=><li key={x}><CircleCheckBig size={18}/><span>{x}</span></li>)}</ul></article>
   <article><h3>Mindbody may fit better if…</h3><ul>{["Integrated payment processing inside the same platform is essential.","You want exposure through Mindbody’s consumer marketplace.","Advanced built-in marketing and a wider add-on ecosystem are priorities.","You need broader multi-location or enterprise capabilities.","You prefer a larger all-in-one platform even if you use only part of it."].map(x=><li key={x}><Layers3 size={18}/><span>{x}</span></li>)}</ul></article>
  </div></div></section>

  <section className="mk-section dark"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">SIDE BY SIDE</span><h2>A focused alternative,<br/><em>not a copy.</em></h2></div><p>This comparison is intentionally conservative: it highlights meaningful product-model differences rather than claiming StudioTasker replaces every Mindbody capability.</p></div><table className="mk-compare"><thead><tr><th>Area</th><th>StudioTasker</th><th>Mindbody</th></tr></thead><tbody>
   <tr><td>Starting software price</td><td>$39.90 USD/month per studio</td><td>Official U.S. pricing currently starts at $79 USD/month per location</td></tr>
   <tr><td>Member payments</td><td>Kept outside StudioTasker; use your existing method</td><td>Integrated payment processing is part of the platform</td></tr>
   <tr><td>Consumer marketplace</td><td>No consumer marketplace</td><td>Mindbody app/marketplace is a core discovery channel</td></tr>
   <tr><td>CRM & studio operations</td><td>Focused on leads, members, classes, bookings, credits, attendance and follow-ups</td><td>Broad business-management platform with scheduling, booking, reporting, staff and more</td></tr>
   <tr><td>Operational next actions</td><td>StudioTasker Today surfaces explainable follow-up signals</td><td>Different workflow and reporting model</td></tr>
   <tr><td>Best fit</td><td>Independent studios wanting a focused operational system</td><td>Studios wanting a broad integrated ecosystem</td></tr>
  </tbody></table><p className="mk-note">Mindbody information is based on its public U.S. pricing and product pages reviewed in October 2026. Mindbody pricing, availability and features can change. <a href="https://www.mindbodyonline.com/business/pricing" target="_blank" rel="noreferrer">Check Mindbody’s official pricing page.</a> Mindbody is a trademark of its respective owner; StudioTasker is not affiliated with or endorsed by Mindbody.</p></div></section>

  <section className="mk-section"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">WHY STUDIOTASKER EXISTS</span><h2>Keep the studio visible.<br/><em>Keep the workflow human.</em></h2></div><p>StudioTasker does not automatically message members or claim to “save” speculative revenue. It shows the signal, explains why it appeared and leaves the decision with the studio team.</p></div><div className="mk-grid">
   <article className="mk-card"><Users size={27}/><h3>One member view.</h3><p>See leads, active members, trials, attendance and studio notes without jumping between unrelated tools.</p></article>
   <article className="mk-card"><CreditCard size={27}/><h3>Payment independence.</h3><p>Your member payment relationship stays with you. StudioTasker only charges your studio for the software subscription.</p></article>
   <article className="mk-card"><ShieldCheck size={27}/><h3>Clear boundaries.</h3><p>Focused scope means the product can stay understandable: studio operations in StudioTasker, member money outside it.</p></article>
  </div></div></section>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-price"><div className="mk-price-main"><span>STUDIOTASKER · ONE STUDIO</span><div className="mk-price-number">$39<small>.90 USD / MONTH</small></div><p>Or $418.80 USD/year. Explore the owner demo with sample data before creating an account.</p></div><div className="mk-price-list"><ul>{["StudioTasker Today priorities","Lead and member CRM","Classes, bookings and attendance","Packages and credit tracking","CSV migration preview","Studio branding, timezone and operating rules"].map(x=><li key={x}><Check size={18}/><span>{x}</span></li>)}</ul><div className="mk-actions"><Link className="mk-primary" href="/app-demo">TRY DEMO <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/start">START STUDIOTASKER <ArrowRight size={19}/></Link></div></div></div></div></section>

  <section className="mk-section"><div className="mk-shell mk-faq"><div><span className="mk-kicker">ALTERNATIVE FAQ</span><h2>Compare before you move.</h2></div><div className="mk-faq-list">{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
  <section className="mk-last"><div className="mk-shell"><h2>See if simpler<br/>fits better.</h2><div><p>Use the interactive owner demo first. No sales call and no sign-up required.</p><div className="mk-actions"><Link className="mk-primary" href="/app-demo">TRY THE DEMO <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/start">SEE PLANS <ArrowRight size={19}/></Link></div></div></div></section>
  <footer className="mk-footer"><div className="mk-shell"><p>StudioTasker · a focused studio-management alternative for independent studios.</p><nav><Link href="/">Home</Link><Link href="/pilates-studio-software">Pilates studio software</Link><Link href="/legal">Legal & Trust</Link><Link href="/start">Pricing</Link></nav></div></footer>
 </main>
}
