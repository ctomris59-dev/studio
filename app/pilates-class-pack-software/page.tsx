import type {Metadata} from "next";
import {FeatureLanding,type FeatureLandingConfig} from "../feature-landing";

export const metadata:Metadata={
 title:"Pilates Class Pack & Credit Tracking Software | StudioTasker",
 description:"Track Pilates class packs, remaining session credits, attendance and renewals in one studio workspace. Explore StudioTasker with fictional data.",
 alternates:{canonical:"/pilates-class-pack-software"},
 robots:{index:true,follow:true}
};
const config:FeatureLandingConfig={
 path:"/pilates-class-pack-software",
 name:"Pilates class pack software",
 kicker:"PILATES CLASS PACK MANAGEMENT SOFTWARE",
 headline:"Class packs.",accent:"Credits in view.",
 lede:"Pilates class pack and credit tracking software helps a studio see which sessions members have purchased, what has been used and what needs attention next. StudioTasker puts package records, class attendance and renewal follow-ups alongside the daily timetable, without taking over member payments.",
 boardTitle:"A package from purchase to renewal",
 boardRows:[
  ["Create a member package","Record the studio-managed pack and available credits"],
  ["Book a Reformer class","Use the member record alongside the timetable"],
  ["Review remaining sessions","See usage and the member's current credit balance"],
  ["Follow up before credits run out","Staff decide whether and when to contact the member"]
 ],
 topics:["CLASS PACKS","SESSION CREDITS","REFORMER CLASSES","RENEWAL FOLLOW-UP"],
 benefitsTitle:"One member record.",benefitsAccent:"Less package guesswork.",
 benefitsIntro:"An independent Pilates studio may sell five-class, ten-class or private-session packs using its own payment method. The hard part is keeping that agreement aligned with bookings and attendance as instructors, schedules and members change.",
 cards:[
  {title:"Know the remaining balance.",copy:"Staff can review the member's package and credits alongside their attendance history instead of reconciling separate spreadsheets."},
  {title:"Keep classes connected.",copy:"Build group, private or semi-private Pilates sessions with recurring schedules and numbered Reformer places. Review bookings and check-ins in the same studio workspace."},
  {title:"Spot renewal opportunities.",copy:"StudioTasker Today can surface low-credit and inactivity signals based on studio records and configurable rules. Your team chooses the next action."}
 ],
 stepsTitle:"From new pack to next visit.",
 stepsIntro:"A simple staff-managed example. The financial transaction stays in your existing payment system; StudioTasker tracks the operational entitlement used in the studio.",
 steps:[
  {title:"Record the package.",copy:"After a member buys sessions through your existing payment process, add or update their package and credit entitlement in the studio workspace."},
  {title:"Schedule the class.",copy:"Create or select a recurring Reformer, mat Pilates, private or semi-private class with the right instructor, room and capacity."},
  {title:"Manage attendance and usage.",copy:"Keep bookings, check-ins and package credit history together so staff can review what happened rather than calculate balances manually."},
  {title:"Review before renewal.",copy:"Use low-credit follow-up signals and the member's history to decide whether it is time for a personal renewal conversation."}
 ],
 flowTitle:"Everyday pack scenarios.",
 flowIntro:"These examples illustrate what staff need to see, not a claim that StudioTasker contacts members or charges their cards on its own.",
 flowRows:[
  {label:"Ten-session pack",example:"A member has used eight of ten studio-recorded credits.",action:"Review remaining credits and decide whether to follow up about renewal."},
  {label:"Private Reformer lesson",example:"A member books a one-to-one class with a named instructor.",action:"Check the member record and class details together before attendance."},
  {label:"Expired or low-balance pack",example:"A member attempts another class with a pack that needs review.",action:"Staff inspect package status and follow studio policy before confirming the reservation."},
  {label:"New member migration",example:"A studio is moving member and package records from a spreadsheet.",action:"Preview available CSV imports and verify the data before committing records."}
 ],
 limitsTitle:"You stay in control.",
 limitsIntro:"StudioTasker is an operational tool for studios, not a marketplace, a member payment gateway or an automated sales agency.",
 boundaries:[
  "Member payments remain with your studio and the provider you already use.",
  "Studio staff manage member records, schedules, credits and follow-up decisions.",
  "The interactive demo uses fictional studio data. Do not enter real member information.",
  "There is no public member self-booking checkout or automated member payment collection in the current product."
 ],
 faqs:[
  ["Can I track a ten-class Pilates pack?","Yes. StudioTasker tracks studio-managed packages and class credits alongside member records and attendance."],
  ["Does it work for private and Reformer classes?","Yes. The class schedule supports group, private and semi-private formats, including numbered equipment spots for Reformer sessions."],
  ["Can I see which members are running low on credits?","StudioTasker Today includes configurable low-credit signals based on your studio's records, so staff can review renewal opportunities."],
  ["Will StudioTasker charge the member or automatically send renewal messages?","No. StudioTasker does not collect your members' payments or send member marketing messages. Your team remains responsible for member communications and payments."],
  ["Can I test the workflow without importing my clients?","Yes. The interactive demo has fictional records and a guided product tour. No account or real client data is required."],
  ["What does the complete software cost?","StudioTasker costs $39.90 USD per studio monthly, or $406.80 USD billed annually. Paid onboarding is not yet open."]
 ],
 related:[
  {title:"Pilates and Reformer studio software",href:"/pilates-studio-software"},
  {title:"Studio waitlist management",href:"/studio-waitlist-management-software"},
  {title:"Explore the interactive demo",href:"/app-demo?tour=1"}
 ]
};
export default function Page(){return <FeatureLanding config={config}/>;}
