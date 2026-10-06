import Link from "next/link";
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,ShieldCheck} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import "./start.css";

export const metadata={title:"Start StudioTasker — Choose your plan"};

export default async function StartPage({searchParams}:{searchParams:Promise<{plan?:string}>}){
 const params=await searchParams;
 const selected=params.plan==="annual"?"annual":"monthly";
 return <main className="st-start">
  <header className="st-start-top">
   <Link href="/" className="st-start-brand"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <div className="st-start-top-actions"><Link href="/app-demo">Try demo</Link><Link href="/workspace">Customer sign in</Link></div>
  </header>

  <section className="st-start-hero">
   <div className="st-start-intro">
    <Link href="/" className="st-start-back"><ArrowLeft size={17}/> Back to StudioTasker</Link>
    <span className="st-start-kicker">START STUDIOTASKER</span>
    <h1>Choose a plan.<br/><em>Create your studio.</em></h1>
    <p>There is no complicated sales process. Pick monthly or annual billing, create your private studio workspace, then complete setup with your own logo, members and classes.</p>
    <div className="st-start-steps">
     <span><b>1</b> Choose plan</span><i/><span><b>2</b> Create studio</span><i/><span><b>3</b> Start using it</span>
    </div>
   </div>

   <div className="st-start-plans" aria-label="StudioTasker plans">
    <article className={selected==="monthly"?"selected":""}>
     <div className="st-plan-head"><span>MONTHLY</span>{selected==="monthly"&&<strong>SELECTED</strong>}</div>
     <div className="st-plan-price"><sup>$</sup>39<em>.90</em><small>/ month</small></div>
     <p>Pay month to month. One StudioTasker workspace for one studio.</p>
     <ul><li><Check size={18}/> Full StudioTasker workspace</li><li><Check size={18}/> StudioTasker Today priorities</li><li><Check size={18}/> CRM, classes, bookings and credits</li><li><Check size={18}/> Studio branding and customization</li></ul>
     <Link href="/workspace?mode=register&plan=monthly" className="st-plan-buy">START MONTHLY · $39.90 <ArrowUpRight size={20}/></Link>
    </article>

    <article className={"annual "+(selected==="annual"?"selected":"")}>
     <div className="st-plan-head"><span>ANNUAL · BEST VALUE</span>{selected==="annual"&&<strong>SELECTED</strong>}</div>
     <div className="st-plan-price"><sup>$</sup>34<em>.90</em><small>/ month</small></div>
     <p>Billed once per year at <b>$418.80</b>. Save $60 compared with monthly billing.</p>
     <ul><li><Check size={18}/> Everything in the monthly plan</li><li><Check size={18}/> One annual payment</li><li><Check size={18}/> Same full workspace</li><li><Check size={18}/> Lower effective monthly price</li></ul>
     <Link href="/workspace?mode=register&plan=annual" className="st-plan-buy">START ANNUAL · $418.80/YEAR <ArrowUpRight size={20}/></Link>
    </article>
   </div>

   <div className="st-start-help">
    <ShieldCheck size={22}/>
    <div><b>Not ready to buy yet?</b><span>Try the full owner demo with sample data first. No account is required.</span></div>
    <Link href="/app-demo">TRY THE DEMO <ArrowRight size={19}/></Link>
   </div>
  </section>
 </main>;
}
