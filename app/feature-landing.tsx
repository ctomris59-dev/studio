import Link from "next/link";
import {ArrowRight,ArrowUpRight,CheckCircle2,ShieldCheck} from "lucide-react";
import {StudioTaskerMark} from "../components/studio-tasker-mark";
import {JsonLd} from "../components/json-ld";
import {breadcrumbJsonLd} from "../lib/seo";
import "./marketing-landing.css";
import "./feature-landing.css";

type Card={title:string;copy:string};
type Step={title:string;copy:string};
type FlowRow={label:string;example:string;action:string};
export type FeatureLandingConfig={
 path:string;name:string;kicker:string;
 headline:string;accent:string;lede:string;
 boardTitle:string;boardRows:[string,string][];
 topics:string[];
 benefitsTitle:string;benefitsAccent:string;benefitsIntro:string;cards:[Card,Card,Card];
 stepsTitle:string;stepsIntro:string;steps:[Step,Step,Step,Step];
 flowTitle:string;flowIntro:string;flowRows:FlowRow[];
 limitsTitle:string;limitsIntro:string;boundaries:string[];
 faqs:[string,string][];
 related:{title:string;href:string}[];
};
export function FeatureLanding({config:c}:{config:FeatureLandingConfig}){
 return <main className="mk-page feature-page"><a className="studio-skip-link" href="#main-content">Skip to main content</a>
  <JsonLd data={breadcrumbJsonLd([{name:"Home",path:"/"},{name:"Studio features",path:"/#features"},{name:c.name,path:c.path}])}/>
  <header className="mk-top"><div className="mk-shell"><Link className="mk-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><nav className="mk-nav" aria-label="Main navigation"><Link href="/pilates-studio-software">Pilates studios</Link><Link href="/compare">Compare</Link><Link href="/app-demo?tour=1">Explore demo</Link><Link className="mk-nav-cta" href="/start">VIEW PLANS <ArrowUpRight size={16}/></Link></nav></div></header>
  <section className="mk-hero" id="main-content" tabIndex={-1} aria-labelledby="feature-title"><div className="mk-shell mk-hero-grid">
   <div className="mk-hero-copy"><span className="mk-kicker">{c.kicker}</span><h1 id="feature-title">{c.headline}<br/><em>{c.accent}</em></h1><p className="mk-hero-lede">{c.lede}</p><div className="mk-hero-points"><span>STAFF-MANAGED WORKFLOWS</span><span>NO MEMBER PAYMENT PROCESSING</span></div><div className="mk-actions"><Link className="mk-primary" href="/app-demo?tour=1">EXPLORE THE DEMO <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/start">VIEW PLANS <ArrowRight size={19}/></Link></div><p className="fe-disclosure">Interactive demo uses fictional data. Check current paid registration availability on the plans page.</p></div>
   <div className="mk-hero-art"><div className="mk-board"><div className="mk-board-head"><strong>{c.boardTitle}</strong><span>ILLUSTRATIVE FLOW</span></div><div className="mk-board-list"><span>SAMPLE DATA · NOT A CUSTOMER ACCOUNT</span>{c.boardRows.map(([name,description],i)=><article key={name}><span>{String(i+1).padStart(2,"0")}</span><div><b>{name}</b><small>{description}</small></div><i aria-hidden="true">→</i></article>)}</div></div><div className="mk-float">LESS ADMIN.<br/>MORE MOVEMENT.</div></div>
  </div></section>
  <div className="mk-strip"><div className="mk-shell">{c.topics.map(t=><span key={t}>{t}</span>)}</div></div>
  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">THE STUDIO PROBLEM</span><h2>{c.benefitsTitle}<br/><em>{c.benefitsAccent}</em></h2></div><p>{c.benefitsIntro}</p></div><div className="mk-grid">{c.cards.map(item=><article className="mk-card" key={item.title}><CheckCircle2 size={27}/><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div></div></section>
  <section className="mk-section"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">HOW IT WORKS</span><h2>{c.stepsTitle}</h2></div><p>{c.stepsIntro}</p></div><ol className="fe-steps">{c.steps.map((item,i)=><li key={item.title}><span className="fe-step-number">{String(i+1).padStart(2,"0")}</span><div><h3>{item.title}</h3><p>{item.copy}</p></div></li>)}</ol></div></section>
  <section className="mk-section dark"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">REAL-WORLD WORKFLOWS</span><h2>{c.flowTitle}</h2></div><p>{c.flowIntro}</p></div><div className="fe-table-wrap"><table className="mk-compare"><thead><tr><th scope="col">Situation</th><th scope="col">Example</th><th scope="col">Staff workflow</th></tr></thead><tbody>{c.flowRows.map(item=><tr key={item.label}><th scope="row">{item.label}</th><td>{item.example}</td><td>{item.action}</td></tr>)}</tbody></table></div><p className="mk-note">Examples are illustrative studio scenarios, not customer results or promised automatic outcomes.</p></div></section>
  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">CLEAR PRODUCT BOUNDARIES</span><h2>{c.limitsTitle}</h2></div><p>{c.limitsIntro}</p></div><div className="fe-boundaries">{c.boundaries.map(item=><p key={item}><ShieldCheck size={20}/><span>{item}</span></p>)}</div><p className="fe-legal-links">Review our <Link href="/legal/security">security practices</Link> and <Link href="/legal/dpa">Data Processing Agreement</Link> before entering real member information.</p></div></section>
  <section className="mk-section"><div className="mk-shell mk-faq"><div><span className="mk-kicker">COMMON QUESTIONS</span><h2>Good to know.</h2><p className="fe-faq-intro">Practical answers before choosing a studio management system.</p></div><div className="mk-faq-list">{c.faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section>
  <section className="mk-section white"><div className="mk-shell"><div className="mk-section-head"><div><span className="mk-kicker">RELATED STUDIO RESOURCES</span><h2>Explore the<br/><em>whole workflow.</em></h2></div><p>See how this function connects with daily operations, studio-specific needs and other parts of StudioTasker.</p></div><div className="fe-related">{c.related.map(item=><Link href={item.href} key={item.href}>{item.title}<ArrowUpRight size={19}/></Link>)}</div></div></section>
  <section className="mk-last"><div className="mk-shell"><h2>See the workflow.<br/>Before you buy.</h2><div><p>Explore with fictional members and classes. The guided demo does not require registration.</p><div className="mk-actions"><Link className="mk-primary" href="/app-demo?tour=1">TRY THE INTERACTIVE DEMO <ArrowUpRight size={19}/></Link><Link className="mk-secondary" href="/start">SEE $39.90 MONTHLY PLAN <ArrowRight size={19}/></Link></div></div></div></section>
  <footer className="mk-footer"><div className="mk-shell"><p>StudioTasker · independent studio operations, with clear product boundaries.</p><nav><Link href="/">Home</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal">Legal &amp; Trust</Link></nav></div></footer>
 </main>;
}
