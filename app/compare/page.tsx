import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,Check,CircleCheckBig,CreditCard,Layers3,ShieldCheck,Users} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "../marketing-landing.css";

export const metadata:Metadata={
 title:"StudioTasker vs. Others — Studio Management Software",
 description:"Compare StudioTasker's focused studio-management approach with broader all-in-one platforms. CRM, classes, bookings, credits, attendance and follow-ups for independent studios."
};

const faqs=[
 ["Is StudioTasker only for Pilates studios?","No. StudioTasker is designed for independent Pilates, yoga, barre, dance, gym, boutique fitness and other class-based studios."],
 ["What makes StudioTasker different?","StudioTasker focuses on the operational work independent studios touch every day: CRM, classes, bookings, attendance, credits, follow-ups and clear next-action signals."],
 ["Does StudioTasker process member payments?","No. Member payments stay with the studio's existing payment method or provider. StudioTasker only charges the studio for its own software subscription."],
 ["Is this a feature-by-feature competitor comparison?","No. Other studio platforms vary widely by market, plan and provider. This page compares product approaches rather than making claims about any named company."],
 ["How much does StudioTasker cost?","StudioTasker is $39.90 USD per studio per month or $418.80 USD per year."],
 ["Can I try it first?","Yes. The interactive owner demo uses fictional data and requires no sign-up."]
];

export default function Compare(){
 const faqJson={"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))};
 return <main className="mk-page">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqJson)}}/>
  <header className="mk-top"><div className="mk-shell"><Link className="mk-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><nav className="mk-nav"><Link href="/">Studios</Link><Link href="/compare">VS. others</Link><Link href="/app-demo">Demo</Link><Link className="mk-nav-cta" href="/start">START · $39.90 <ArrowUpRight size={16}/></Link></nav></div></header>

  <section className="mk-hero"><div className="mk-shell mk-hero-grid">
   <div className="mk-hero-copy"><span className="mk-kicker">STUDIOTASKER · VS. OTHERS</span><h1>Need less software?<br/><em>Keep the essentials.</em></h1><p className="mk-hero-lede">StudioTasker is for independent studios that want a focused workspace for members, classes, bookings, credits, attendance and follow-ups—without forcing member payments into the same system.</p><div className="mk-hero-points"><span>$39.90 USD / MONTH</span><span>ONE STUDIO</span><span>NO PER-MEMBER PRICING</span></div><div className="mk-actions"><Link className="mk-primary" href="/app-demo"><span>TRY STUDIOTASKER</span><ArrowUpRight size={20}/></Link><Link className="mk-secondary" href="/start"><span>SEE PRICING</span><ArrowRight size={20}/></Link></div></div>
   <div className="mk-hero-art"><div className="mk-board"><div className="mk-board-head"><strong>Choose for the way you operate.</strong><span>FOCUSED COMPARISON</span></div><div className="mk-board-list"><span>STUDIOTASKER MAY FIT WHEN…</span>{[["01","You want simplicity","Focused owner workspace"],["02","Payments already work","Keep your current method"],["03","Follow-up matters","Today surfaces next actions"],["04","Price clarity matters","Flat $39.90 per studio"]].map(x=><article key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><i>→</i></article>)}</div></div><div className="mk-float">A SMALLER<br/>OPERATIONAL STACK.</div></div>
  </div></section>

  <div className="mk-strip"><div className="mk-shell"><span>SIMPLER OPERATIONS</span><span>FLAT SOFTWARE PRICE</span><span>KEEP YOUR PAYMENTS</span><span>GLOBAL STUDIOS</span></div></div>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">THE REAL QUESTION</span><h2>Not “which has more?”<br/><em>Which fits your studio?</em></h2></div><p>Studio software ranges from focused operational tools to broad all-in-one ecosystems. The right choice depends on what you actually want your software to own.</p></div><div className="mk-fit">
   <article className="is-yes"><h3>StudioTasker is a strong fit if…</h3><ul>{["You want CRM, classes, credits, attendance and follow-ups without a huge stack.","You want to keep your existing member-payment method.","You run an independent studio and value a simple owner workflow.","You want StudioTasker Today to surface operational follow-up signals.","A flat $39.90 USD monthly software price fits your model."].map(x=><li key={x}><CircleCheckBig size={18}/><span>{x}</span></li>)}</ul></article>
   <article><h3>A broader platform may fit better if…</h3><ul>{["Integrated member card processing inside the same platform is essential.","A consumer marketplace is central to how you acquire clients.","Built-in mass marketing automation is a core requirement.","You need complex multi-location or enterprise controls today.","You prefer a larger all-in-one ecosystem even if it adds more moving parts."].map(x=><li key={x}><Layers3 size={18}/><span>{x}</span></li>)}</ul></article>
  </div></div></section>

  <section className="mk-section dark"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">SIDE BY SIDE</span><h2>A focused approach,<br/><em>not a copy of anyone else.</em></h2></div><p>Other products vary by provider and plan. This table describes StudioTasker's product philosophy against common categories of broader studio software—not any named competitor.</p></div><table className="mk-compare"><thead><tr><th>Area</th><th>StudioTasker</th><th>Other platforms may</th></tr></thead><tbody>
   <tr><td>Software pricing</td><td>$39.90 USD/month per studio</td><td>Use different plan, location, feature or usage models</td></tr>
   <tr><td>Member payments</td><td>Kept outside StudioTasker; use your existing method</td><td>Offer or require integrated payment processing</td></tr>
   <tr><td>Marketplace/discovery</td><td>No consumer marketplace</td><td>Include consumer discovery or marketplace features</td></tr>
   <tr><td>CRM & studio operations</td><td>Focused on leads, members, classes, bookings, credits, attendance and follow-ups</td><td>Combine studio operations with a wider feature ecosystem</td></tr>
   <tr><td>Operational next actions</td><td>StudioTasker Today surfaces explainable follow-up signals</td><td>Use dashboards, reports, automation or other workflow models</td></tr>
   <tr><td>Best fit</td><td>Independent studios wanting a focused operational system</td><td>Depends on provider, plan and the studio's requirements</td></tr>
  </tbody></table><p className="mk-note">“Other platforms” is a general category, not a claim about any specific company. Features, pricing and policies vary by provider and can change.</p></div></section>

  <section className="mk-section"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">WHY STUDIOTASKER EXISTS</span><h2>Keep the studio visible.<br/><em>Keep the workflow human.</em></h2></div><p>StudioTasker shows operational signals, explains why they appeared and leaves the next action with the studio team.</p></div><div className="mk-grid">
   <article className="mk-card"><Users size={27}/><h3>One member view.</h3><p>See leads, active members, trials, attendance and studio notes without jumping between unrelated tools.</p></article>
   <article className="mk-card"><CreditCard size={27}/><h3>Payment independence.</h3><p>Your member payment relationship stays with you. StudioTasker only charges your studio for the software subscription.</p></article>
   <article className="mk-card"><ShieldCheck size={27}/><h3>Clear boundaries.</h3><p>Studio operations in StudioTasker. Member money stays with your studio and its chosen payment method.</p></article>
  </div></div></section>

  <section className="mk-section white"><div className="mk-shell"><div className="mk-price"><div className="mk-price-main"><span>STUDIOTASKER · ONE STUDIO</span><div className="mk-price-number">$39<small>.90 USD / MONTH</small></div><p>Or $418.80 USD/year. Explore the owner demo with sample data before creating an account.</p></div><div className="mk-price-list"><ul>{["StudioTasker Today priorities","Lead and member CRM","Classes, bookings and attendance","Packages and credit tracking","CSV migration preview","Studio branding, timezone and operating rules"].map(x=><li key={x}><Check size={18}/><span>{x}</span></li>)}</ul><div className="mk-actions"><Link className="mk-primary" href="/app-demo">TRY DEMO <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/start">START STUDIOTASKER <ArrowRight size={19}/></Link></div></div></div></div></section>

  <section className="mk-section"><div className="mk-shell mk-faq"><div><span className="mk-kicker">COMPARISON FAQ</span><h2>Compare the approach.</h2></div><div className="mk-faq-list">{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
  <section className="mk-last"><div className="mk-shell"><h2>See if simpler<br/>fits better.</h2><div><p>Use the interactive owner demo first. No sales call and no sign-up required.</p><div className="mk-actions"><Link className="mk-primary" href="/app-demo">TRY THE DEMO <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/start">SEE PLANS <ArrowRight size={19}/></Link></div></div></div></section>
  <footer className="mk-footer"><div className="mk-shell"><p>StudioTasker · focused studio-management software for independent studios.</p><nav><Link href="/">Home</Link><Link href="/compare">VS. others</Link><Link href="/legal">Legal & Trust</Link><Link href="/start">Pricing</Link></nav></div></footer>
 </main>
}
