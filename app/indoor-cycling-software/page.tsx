import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";
export const metadata:Metadata={title:"Indoor Cycling Studio Software — StudioTasker",description:"Indoor cycling studio software for numbered bike spots, recurring rides, waitlists, check-in, attendance, instructors and credits.",alternates:{canonical:"/indoor-cycling-software"}};
const config:StudioLandingConfig={
 path:"/indoor-cycling-software",
 seoName:"Indoor Cycling Studio Software",
 kicker:"INDOOR CYCLING STUDIO SOFTWARE · GLOBAL",heroLine:"Fill the bikes.",heroEm:"Keep the front desk clear.",
 lede:"StudioTasker helps independent indoor cycling studios manage numbered bike spots, recurring rides, capacity, waitlists, check-in, instructors, packages and follow-up.",
 boardName:"Willow Cycle Studio",strip:["BIKE SPOTS","RIDE SCHEDULES","WAITLISTS","CHECK-IN","PACKS & CREDITS"],
 dailyLine:"Built around bikes,",dailyEm:"capacity and repeat riders.",dailyCopy:"Use configurable equipment spots and recurring schedules without adding access hardware or a large payment ecosystem.",
 cards:[
  {icon:"bike",title:"Numbered bike spots.",copy:"Assign configurable equipment spots so staff can see exact bike availability and booked places."},
  {icon:"calendar",title:"Recurring ride schedules.",copy:"Create repeating rides with coach, room, duration, capacity and weekly patterns."},
  {icon:"clock",title:"Waitlist to check-in.",copy:"Handle waitlists, promotion, check-in, cancellations, no-shows and follow-up in one flow."}
 ],
 fitLine:"Built for the independent",fitEm:"cycling studio.",fitCopy:"A strong fit when bike assignment and class operations matter more than integrated hardware or payment processing.",
 strongFits:["You need numbered bike or equipment spots.","Recurring ride schedules are central.","Waitlists and fast check-in matter.","You use class packs or credits.","You want a simple owner workspace with transparent pricing."],
 broaderFits:["Door/access hardware integration is required.","Integrated payment processing is essential.","A consumer marketplace is central to acquisition.","You need enterprise franchise controls."],
 faqLabel:"INDOOR CYCLING SOFTWARE FAQ",
 faqs:[
  ["Can riders choose or be assigned bike spots?","StudioTasker supports configurable numbered equipment spots, which can be used for bikes in indoor cycling classes."],
  ["Does it support waitlists?","Yes. Waitlist status and promotion logic are part of the booking workflow."],
  ["Can staff check riders in?","Yes. Front-desk check-in and no-show status are supported."],
  ["Can I create recurring rides?","Yes. Recurring schedules can repeat on selected weekdays until a chosen date."],
  ["Does StudioTasker integrate door hardware?","Not currently. StudioTasker focuses on class and member operations rather than access-control hardware."],
  ["What is the price?","$39.90 USD/month per studio or $406.80 USD/year."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
