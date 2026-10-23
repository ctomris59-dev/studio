"use client";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ArrowUpRight,Check} from "lucide-react";

// Pricing content remains visible in static SSR fallback while URL-based
// selection is progressively enhanced after hydration.
export function PlanCards({selected,registrationOpen}:{selected:"monthly"|"annual";registrationOpen:boolean}){
 return <>
   <div className="st-start-plans" aria-label="StudioTasker plans">
    <article className={selected==="monthly"?"selected":""}>
     <div className="st-plan-head"><span>MONTHLY · FLEXIBLE</span>{selected==="monthly"&&<strong>SELECTED</strong>}</div>
     <div className="st-plan-price"><sup>$</sup>39<em>.90</em><small>/ month · USD</small></div>
     <p className="st-plan-charge">BILLED MONTHLY · $39.90 TOTAL</p>
     <p>Flexible monthly billing for one studio, with every feature included.</p>
     <ul><li><Check size={18}/> Full StudioTasker workspace</li><li><Check size={18}/> StudioTasker Today priorities</li><li><Check size={18}/> CRM, classes, bookings and credits</li><li><Check size={18}/> Studio branding and customization</li></ul>
     <Link href={registrationOpen?"/workspace?mode=register&plan=monthly":"/app-demo?tour=1"} className="st-plan-buy">{registrationOpen?"START MONTHLY · $39.90":"EXPLORE MONTHLY PLAN IN DEMO"} <ArrowUpRight size={20}/></Link>
    </article>

    <article className={"annual "+(selected==="annual"?"selected":"")}>
     <div className="st-plan-head"><span>ANNUAL · BEST VALUE · SAVE $72/YEAR</span>{selected==="annual"&&<strong>SELECTED</strong>}</div>
     <div className="st-plan-price"><sup>$</sup>33<em>.90</em><small>/ month equivalent</small></div>
     <p className="st-plan-charge">BILLED YEARLY · $406.80 TOTAL</p>
     <p>Pay <b>$406.80 once per year</b>. Save $72 compared with twelve monthly payments. The same features are included.</p>
     <ul><li><Check size={18}/> Everything in the monthly plan</li><li><Check size={18}/> $72/year lower total price</li><li><Check size={18}/> One yearly renewal instead of monthly billing</li><li><Check size={18}/> Lower effective monthly price: $33.90</li></ul>
     <Link href={registrationOpen?"/workspace?mode=register&plan=annual":"/app-demo?tour=1"} className="st-plan-buy">{registrationOpen?"START ANNUAL · $406.80/YEAR":"EXPLORE ANNUAL PLAN IN DEMO"} <ArrowUpRight size={20}/></Link>
    </article>
   </div>
 </>;
}
export function PlanSelector({registrationOpen}:{registrationOpen:boolean}){
 const params=useSearchParams();
 return <PlanCards selected={params.get("plan")==="annual"?"annual":"monthly"} registrationOpen={registrationOpen}/>;
}
