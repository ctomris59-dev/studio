import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";

export const metadata:Metadata={
 title:"Pilates & Reformer Studio Software — StudioTasker",
 description:"Pilates and Reformer studio software for recurring classes, numbered equipment spots, waitlists, credits, attendance, staff and follow-up.",
 alternates:{canonical:"/pilates-studio-software"}
};
const config:StudioLandingConfig={
 path:"/pilates-studio-software",
 seoName:"Pilates & Reformer Studio Software",
 kicker:"PILATES / REFORMER STUDIO SOFTWARE · GLOBAL",
 heroLine:"Run the studio.",heroEm:"Not the software.",
 lede:"StudioTasker gives independent Pilates and Reformer studios one clear operating workspace for recurring classes, numbered Reformer spots, waitlists, packages, credits, attendance, staff and follow-up.",
 boardName:"Willow Reformer Studio",
 strip:["REFORMER PILATES","MAT PILATES","PRIVATE SESSIONS","SEMI-PRIVATE","PACKS & CREDITS"],
 dailyLine:"Everything your Pilates studio",dailyEm:"needs to keep moving.",
 dailyCopy:"Plan recurring schedules, keep Reformer capacity visible and know who needs attention without forcing member payments into the same system.",
 cards:[
  {icon:"activity",title:"Reformer spots stay clear.",copy:"Use numbered equipment spots for Reformer sessions so staff can see capacity and assigned places at a glance."},
  {icon:"calendar",title:"Recurring classes without retyping.",copy:"Create repeating group, private and semi-private sessions with instructors, rooms, duration and capacity."},
  {icon:"clock",title:"Waitlists and follow-up.",copy:"Track waitlists, check-ins, late cancellations, no-shows, trials, low credits and inactivity from one workspace."}
 ],
 fitLine:"Built for the independent",fitEm:"Pilates studio.",
 fitCopy:"Keep the payment method you already use and improve the operational layer around members, Reformer capacity and follow-up.",
 strongFits:["You run an independent Pilates or Reformer studio.","Equipment spots, recurring schedules and waitlists matter to your day.","You want packages, credits, attendance and member context together.","You already have a member-payment method you prefer.","You want a flat software subscription rather than per-member pricing."],
 broaderFits:["Integrated member payment processing inside the same platform is essential.","A consumer marketplace is central to client acquisition.","You need complex franchise or enterprise controls today.","Built-in mass marketing automation is a core requirement."],
 faqLabel:"PILATES SOFTWARE FAQ",
 faqs:[
  ["Can StudioTasker manage Reformer spots?","Yes. Classes can use configurable numbered equipment spots so a Pilates studio can operate Reformer-based sessions with visible capacity and assigned places."],
  ["Can I run private and semi-private sessions?","Yes. StudioTasker supports group, private and semi-private class formats alongside recurring schedules, attendance and staff assignment."],
  ["Does StudioTasker support waitlists and no-shows?","Yes. Class operations include waitlists, automatic promotion logic, check-in, cancellations, late cancellations and no-show status."],
  ["Does StudioTasker process member payments?","No. Member payments stay with the studio and its chosen payment method. StudioTasker charges only for the software subscription."],
  ["Can I import my existing member list?","Yes. CSV migration includes a preview step so records can be reviewed before they are committed."],
  ["How much does StudioTasker cost?","StudioTasker is $39.90 USD/month per studio or $406.80 USD/year, equivalent to $33.90/month."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
