import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";
export const metadata:Metadata={title:"Fitness & Gym Software | StudioTasker",description:"Fitness and gym studio software for group classes, personal training, open gym, check-in, attendance, memberships, credits and follow-up.",alternates:{canonical:"/fitness-gym-software"}};
const config:StudioLandingConfig={
 path:"/fitness-gym-software",
 seoName:"Fitness & Gym Software",
 kicker:"FITNESS & GYM SOFTWARE · GLOBAL",heroLine:"Run classes and PT.",heroEm:"Keep members in view.",
 lede:"StudioTasker supports independent fitness and gym businesses with group classes, personal training, open-gym formats, check-in, member records, packages, attendance and follow-up.",
 boardName:"Willow Fitness Club",strip:["GROUP FITNESS","PERSONAL TRAINING","OPEN GYM","CHECK-IN","MEMBER CRM"],
 dailyLine:"One operating view for",dailyEm:"classes, PT and members.",dailyCopy:"Keep the class-based side of the gym organized without adding workout programming, door hardware or payment processing you may not need.",
 cards:[
  {icon:"dumbbell",title:"Group, PT and open gym.",copy:"Use class formats for group sessions, personal training and open-gym operations with capacity and staff assignment."},
  {icon:"users",title:"Fast member context.",copy:"Keep active members, leads, tags, notes, waiver status, credits and attendance visible to staff."},
  {icon:"clock",title:"Check-in and follow-up.",copy:"Record check-ins and no-shows, then surface trial, renewal and inactivity signals in StudioTasker Today."}
 ],
 fitLine:"Built for an independent",fitEm:"fitness business.",fitCopy:"Best for class-based gyms and fitness studios that want operations and CRM without a full hardware or workout-tracking stack.",
 strongFits:["Group classes and personal training matter.","You need check-in, attendance and member context.","You want open-gym sessions represented in the schedule.","You want packages or credits without changing payment providers.","You value simple self-serve setup."],
 broaderFits:["Access-control hardware integration is required.","WOD/workout programming is a core product need.","You need a large chain or franchise platform.","Integrated member payment processing is mandatory."],
 faqLabel:"FITNESS & GYM SOFTWARE FAQ",
 faqs:[
  ["Can I manage group classes and personal training?","Yes. StudioTasker includes group, personal-training and open-gym class formats."],
  ["Does it have check-in?","Yes. Staff can record attendance/check-in and no-show status."],
  ["Can I track memberships, packages or credits?","StudioTasker tracks studio-managed package status and credits alongside member records and attendance."],
  ["Does it include workout programming or WOD tracking?","No. StudioTasker focuses on class-based studio operations rather than workout-programming content."],
  ["Does it control gym doors?","No. Access-control hardware is outside the current product scope."],
  ["How much is StudioTasker?","$39.90 USD/month per studio or $406.80 USD/year."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
