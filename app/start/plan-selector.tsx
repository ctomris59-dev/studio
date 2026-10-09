"use client";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ArrowUpRight,Check} from "lucide-react";

// Pricing content remains visible in static SSR fallback while URL-based
// selection is progressively enhanced after hydration.
export function PlanCards({selected}:{selected:"monthly"|"annual"}){
 return <>
   <div className="st-start-plans" aria-label="StudioTasker plans">
    <article className={selected==="monthly"?"selected":""}>
     <div className="st-plan-head"><span>MONTHLY · FLEXIBLE</span>{selected==="monthly"&&<strong>SELECTED</strong>}</div>
     <div className="st-plan-price"><sup>$</sup>39<em>.90</em><small>/ month · USD</small></div>
     <p>Pay month to month. One StudioTasker workspace for one studio.</p>
     <ul><li><Check size={18}/> Full StudioTasker workspace</li><li><Check size={18}/> StudioTasker Today priorities</li><li><Check size={18}/> CRM, classes, bookings and credits</li><li><Check size={18}/> Studio branding and customization</li></ul>
     <Link href="/workspace?mode=register&plan=monthly" className="st-plan-buy">START MONTHLY · $39.90 <ArrowUpRight size={20}/></Link>
    </article>

    <article className={"annual "+(selected==="annual"?"selected":"")}>
     <div className="st-plan-head"><span>ANNUAL · BEST VALUE · SAVE $72/YEAR</span>{selected==="annual"&&<strong>SELECTED</strong>}</div>
     <div className="st-plan-price"><sup>$</sup>33<em>.90</em><small>/ month · USD</small></div>
     <p>Billed once per year at <b>$406.80 USD</b>, which is $72 less than twelve monthly payments. Best for studios planning to use StudioTasker as an everyday operating system throughout the year.</p>
     <ul><li><Check size={18}/> Everything in the monthly plan</li><li><Check size={18}/> $72/year lower total price</li><li><Check size={18}/> One yearly renewal instead of monthly billing</li><li><Check size={18}/> Lower effective monthly price: $33.90</li></ul>
     <Link href="/workspace?mode=register&plan=annual" className="st-plan-buy">START ANNUAL · $406.80/YEAR <ArrowUpRight size={20}/></Link>
    </article>
   </div>
 </>;
}
export function PlanSelector(){
 const params=useSearchParams();
 return <PlanCards selected={params.get("plan")==="annual"?"annual":"monthly"}/>;
}
