import Link from "next/link";
import {ArrowLeft,ArrowRight,Globe2,ShieldCheck} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "./start.css";
import {Suspense} from "react";
import {PlanCards,PlanSelector} from "./plan-selector";

export const metadata={title:"StudioTasker Pricing | Monthly & Annual Plans",description:"StudioTasker costs $39.90/month per studio or $406.80/year. Compare monthly and annual billing for the full studio management workspace.",alternates:{canonical:"/start"},robots:{index:true,follow:true}};

export const revalidate=300;
export default function StartPage(){
 return <main className="st-start"><a className="studio-skip-link" href="#main-content">Skip to main content</a>
  <header className="st-start-top">
   <Link href="/" className="st-start-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <div className="st-start-top-actions"><Link href="/app-demo">Try demo</Link><Link href="/workspace">Customer sign in</Link></div>
  </header>

  <section id="main-content" tabIndex={-1} className="st-start-hero">
   <div className="st-start-intro">
    <div className="st-start-intro-meta">
     <Link href="/" className="st-start-back"><ArrowLeft size={17}/> Back to StudioTasker</Link>
     <span className="st-start-kicker">START STUDIOTASKER · GLOBAL</span>
    </div>
    <h1>Choose a plan.<br/><em>Create your studio.</em></h1>
    <p>There is no complicated sales process. Pick monthly or annual billing in USD, create your private studio workspace, then set your own timezone, logo, members and classes.</p>
    <div className="st-start-steps">
     <span><b>1</b> Choose plan</span><i/><span><b>2</b> Create studio</span><i/><span><b>3</b> Start using it</span>
    </div>
   </div>
   <div className="st-start-global"><Globe2 size={19}/><span>USA · Canada · UK · Europe · International</span><small>English-first · studio timezone & 12/24-hour clock supported</small></div>

   <Suspense fallback={<PlanCards selected="monthly"/>}><PlanSelector/></Suspense>

   <div className="st-start-legal"><ShieldCheck size={18}/><span>Before creating a paid studio, review our <Link href="/legal/terms">Terms</Link>, <Link href="/legal/dpa">DPA</Link> and <Link href="/legal/privacy">Privacy Policy</Link>. Acceptance is recorded when you create or update your subscription.</span></div>
   <div className="st-start-help">
    <ShieldCheck size={22}/>
    <div><b>Not ready to buy yet?</b><span>Try the full owner demo with sample data first. No account is required.</span></div>
    <Link href="/app-demo">TRY THE DEMO <ArrowRight size={19}/></Link>
   </div>
  </section>
 </main>;
}
