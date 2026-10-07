import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";
export const metadata:Metadata={title:"Boutique Fitness Studio Software — StudioTasker",description:"Boutique fitness software for classes, leads, members, staff, waitlists, credits, attendance, insights and follow-up.",alternates:{canonical:"/boutique-fitness-software"}};
const config:StudioLandingConfig={
 path:"/boutique-fitness-software",
 seoName:"Boutique Fitness Studio Software",
 kicker:"BOUTIQUE FITNESS SOFTWARE · GLOBAL",heroLine:"Keep the studio focused.",heroEm:"Keep the software lighter.",
 lede:"StudioTasker gives independent boutique fitness studios one focused workspace for leads, members, recurring classes, staff, waitlists, credits, attendance, insights and follow-up.",
 boardName:"Willow Movement Studio",strip:["BOUTIQUE FITNESS","SMALL TEAMS","CLASS PACKS","FOLLOW-UP","SELF-SERVE"],
 dailyLine:"The operational core",dailyEm:"without the enterprise stack.",dailyCopy:"Run the daily work of a class-based studio with clear pricing, self-serve onboarding and no requirement to move member payments.",
 cards:[
  {icon:"calendar",title:"Classes stay organized.",copy:"Recurring schedules, staff, rooms, capacity, waitlists and attendance live in one operating flow."},
  {icon:"users",title:"CRM without a sales machine.",copy:"Keep leads, members, trials, notes, tags and next actions visible without building a complex sales pipeline."},
  {icon:"activity",title:"Insights that lead to action.",copy:"See utilization, popular times, no-shows, attendance, instructor activity and trial conversion."}
 ],
 fitLine:"Built for a small",fitEm:"boutique fitness team.",fitCopy:"Use one focused operational system while keeping payment, marketing and specialist tools only where you actually need them.",
 strongFits:["You run one independent class-based studio.","You want a focused owner workflow rather than a giant suite.","You need recurring classes, waitlists and attendance.","You want CRM, credits and follow-up together.","Transparent price and self-serve setup matter."],
 broaderFits:["You need an all-in-one consumer marketplace.","Integrated payments are essential inside the same platform.","You require complex franchise controls.","You need extensive built-in marketing automation."],
 faqLabel:"BOUTIQUE FITNESS FAQ",
 faqs:[
  ["What types of boutique studios can use StudioTasker?","StudioTasker is designed for independent class-based businesses including Pilates, yoga, barre, dance, indoor cycling, fitness and similar boutique concepts."],
  ["Does it include recurring classes and waitlists?","Yes. Recurring schedules, waitlists, promotion, attendance and no-show workflows are part of the class operating system."],
  ["Can I manage staff?","Yes. Staff and instructor records support roles, availability notes, class assignment and substitutions."],
  ["What insights are included?","Operational insights include class utilization, popular time slots, attendance, no-shows, late cancellations, instructor activity and trial conversion."],
  ["Do I have to move my member payments?","No. Member payments remain entirely with the studio's chosen payment method."],
  ["What is the price?","$39.90 USD/month per studio or $406.80 USD/year."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
