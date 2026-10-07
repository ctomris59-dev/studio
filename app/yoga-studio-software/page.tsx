import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";
export const metadata:Metadata={title:"Yoga Studio Software — StudioTasker",description:"Yoga studio software for recurring classes, courses, workshops, privates, waitlists, attendance, credits and member follow-up.",alternates:{canonical:"/yoga-studio-software"}};
const config:StudioLandingConfig={
 kicker:"YOGA STUDIO SOFTWARE · GLOBAL",heroLine:"Keep the schedule calm.",heroEm:"Keep the studio moving.",
 lede:"StudioTasker helps independent yoga studios run recurring classes, workshops, courses, private sessions, room capacity, packages, attendance and follow-up from one focused owner workspace.",
 boardName:"Willow Yoga Studio",strip:["YOGA CLASSES","WORKSHOPS","COURSES","PRIVATES","PACKS & CREDITS"],
 dailyLine:"A clearer rhythm for",dailyEm:"your yoga studio.",dailyCopy:"Manage recurring timetables, course-style sessions and member context without turning the studio into an enterprise software project.",
 cards:[
  {icon:"heart",title:"Recurring classes and courses.",copy:"Set weekly classes, workshops or course-style sessions with instructors, rooms, duration and capacity."},
  {icon:"users",title:"Member context in one place.",copy:"Keep leads, trial visitors, active members, tags, notes, waiver status and attendance together."},
  {icon:"clock",title:"Waitlists that stay visible.",copy:"See booked places, waitlisted members, check-ins, no-shows and follow-up signals without separate spreadsheets."}
 ],
 fitLine:"Built for an independent",fitEm:"yoga studio.",fitCopy:"Useful when you want strong class operations and member context while keeping payments and marketing tools separate.",
 strongFits:["You run recurring yoga classes, workshops, courses or privates.","Room capacity and waitlists matter.","You want member records, attendance and follow-up together.","You want self-serve setup without a sales-led implementation.","You prefer to keep your existing payment setup."],
 broaderFits:["You require an integrated consumer marketplace.","Built-in livestream/VOD is a core requirement.","You need enterprise multi-location controls today.","You want the software to own member payment processing."],
 faqLabel:"YOGA SOFTWARE FAQ",
 faqs:[
  ["Can I schedule recurring yoga classes?","Yes. StudioTasker supports repeat schedules and selected weekdays so recurring classes do not need to be recreated one by one."],
  ["Can I run workshops or courses?","Yes. Course and term-style formats can be used for structured programmes, workshops and multi-session yoga offerings."],
  ["Can I manage waitlists and attendance?","Yes. Booking status, waitlists, check-in, no-shows and attendance are part of the class workflow."],
  ["Can I keep notes and waiver status on members?","Yes. Member records support operational tags, notes and waiver status."],
  ["Does StudioTasker collect payments from my students?","No. Student payments stay outside StudioTasker with the studio's existing provider or method."],
  ["What does it cost?","StudioTasker is $39.90 USD/month per studio or $406.80 USD/year."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
