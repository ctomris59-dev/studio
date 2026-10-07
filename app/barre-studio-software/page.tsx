import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";
export const metadata:Metadata={title:"Barre Studio Software — StudioTasker",description:"Barre studio software for recurring classes, capacity, waitlists, attendance, packages, credits, instructors and follow-up.",alternates:{canonical:"/barre-studio-software"}};
const config:StudioLandingConfig={
 path:"/barre-studio-software",
 seoName:"Barre Studio Software",
 kicker:"BARRE STUDIO SOFTWARE · GLOBAL",heroLine:"Keep classes full.",heroEm:"Keep admin light.",
 lede:"StudioTasker gives independent barre studios a focused place for recurring schedules, capacity, waitlists, attendance, packages, credits, instructors and member follow-up.",
 boardName:"Willow Barre Studio",strip:["BARRE","SCULPT","GROUP CLASSES","WAITLISTS","PACKS & CREDITS"],
 dailyLine:"Simple operations for",dailyEm:"a busy barre schedule.",dailyCopy:"Keep classes, member context and follow-up visible without adding a large all-in-one software stack.",
 cards:[
  {icon:"waves",title:"Recurring schedules.",copy:"Build weekly barre timetables with instructors, rooms, duration and capacity."},
  {icon:"users",title:"Capacity and waitlists.",copy:"See booked places, waitlists, check-ins and no-shows in the same class workflow."},
  {icon:"clock",title:"Packages and follow-up.",copy:"Track credits, attendance, trials, renewals and inactivity with explainable next-action signals."}
 ],
 fitLine:"Built for the independent",fitEm:"barre studio.",fitCopy:"A focused option for class-led studios that want operational clarity without moving member payments.",
 strongFits:["Recurring class scheduling is central to the business.","You use class packs or credits.","Waitlists and attendance matter day to day.","You want simple instructor and member records.","You value self-serve setup and transparent pricing."],
 broaderFits:["You need integrated payment processing as a requirement.","You rely on a consumer marketplace.","You need enterprise franchise controls.","You need built-in mass marketing automation."],
 faqLabel:"BARRE SOFTWARE FAQ",
 faqs:[
  ["Can StudioTasker manage recurring barre classes?","Yes. Recurring schedules can be created for selected weekdays with capacity, instructor and room defaults."],
  ["Does it support waitlists?","Yes. Waitlists and promotion logic are part of the class workflow."],
  ["Can I track packages and credits?","Yes. Studio-managed package entitlements and credits are tracked alongside attendance."],
  ["Can instructors be managed?","Yes. Staff records include roles, availability notes and class assignment/substitution workflows."],
  ["Does StudioTasker take member payments?","No. Member payment collection remains with the studio."],
  ["What is the price?","$39.90 USD/month per studio, or $406.80 USD/year."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
