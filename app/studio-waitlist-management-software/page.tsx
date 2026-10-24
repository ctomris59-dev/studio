import type {Metadata} from "next";
import {FeatureLanding,type FeatureLandingConfig} from "../feature-landing";

export const metadata:Metadata={
 title:"Studio Class Waitlist Management Software | StudioTasker",
 description:"Manage full studio classes, timed waitlists, booking changes and attendance with StudioTasker. See the staff workflow in a free interactive demo.",
 alternates:{canonical:"/studio-waitlist-management-software"},
 robots:{index:true,follow:true}
};
const config:FeatureLandingConfig={
 path:"/studio-waitlist-management-software",
 name:"Studio class waitlist management",
 kicker:"CLASS WAITLIST MANAGEMENT SOFTWARE",
 headline:"Full classes.",accent:"Clear waitlists.",
 lede:"Class waitlist management software helps independent studios handle full sessions, open spots, cancellations and check-ins without losing track of who is next. StudioTasker keeps bookings, timed waitlist rules and attendance visible to staff across Pilates, yoga, barre and other class-based schedules.",
 boardTitle:"When a full class opens up",
 boardRows:[
  ["Class reaches capacity","The timetable shows a full session"],
  ["Member joins a waitlist","Staff can see waitlisted booking status"],
  ["A place becomes available","Timed promotion rules help manage the open place"],
  ["Review the final roster","Check bookings and attendance before the class"]
 ],
 topics:["WAITLISTS","CLASS CAPACITY","CANCELLATIONS","CHECK-IN & NO-SHOWS"],
 benefitsTitle:"Full sessions happen.",benefitsAccent:"Confusion doesn't have to.",
 benefitsIntro:"Small studios work with limited rooms, instructors and equipment places. When bookings move or someone cancels, staff need an accurate view of the roster and waitlist rather than a chain of messages and spreadsheet edits.",
 cards:[
  {title:"One view of availability.",copy:"See booked places and the waitlist against each class's capacity. In Reformer sessions, numbered equipment spots can be assigned separately."},
  {title:"Handle schedule changes.",copy:"StudioTasker supports booking moves, cancellations, late-cancellation and no-show statuses, with timed waitlist handling for newly available spots."},
  {title:"Make attendance visible.",copy:"Staff can review the roster, record check-ins and track attendance in the workspace rather than keep a separate paper list."}
 ],
 stepsTitle:"From fully booked to ready.",
 stepsIntro:"A typical staff workflow for a full Pilates or yoga class. Public self-service member booking and outbound messaging are not currently part of StudioTasker.",
 steps:[
  {title:"Set class capacity.",copy:"Build a one-off or recurring class with a coach, room, duration and maximum places. Add numbered equipment spots when relevant."},
  {title:"Track booked and waiting members.",copy:"Staff manage reservations and waitlist positions from the class workflow instead of relying on a disconnected contact list."},
  {title:"Manage an opening.",copy:"When a booking changes, review the available capacity and timed waitlist promotion behavior. Staff remain responsible for follow-up and exceptions."},
  {title:"Close the attendance loop.",copy:"Use check-in, no-show and cancellation states to keep the class roster consistent with what actually happened."}
 ],
 flowTitle:"What staff can resolve.",
 flowIntro:"These situations are illustrations of studio operations, not evidence of results from paying customers.",
 flowRows:[
  {label:"Full Reformer session",example:"Eight equipment spots are assigned for an eight-person class.",action:"Review assigned places and waitlisted members before moving reservations."},
  {label:"Late cancellation",example:"A booked member cancels near the start of a popular class.",action:"Apply the studio's cancellation rules, check capacity and review the waitlist."},
  {label:"Recurring yoga class",example:"The same class happens weekly, but attendance varies.",action:"Review each session's bookings, waiting members and completed check-ins."},
  {label:"Instructor change",example:"A coach is replaced while the upcoming class remains on the calendar.",action:"Keep the session and member roster visible while staff revise class details."}
 ],
 limitsTitle:"Designed for the studio team.",
 limitsIntro:"StudioTasker focuses on staff-run class operations. It does not claim to replace every member-facing booking or communication service.",
 boundaries:[
  "Bookings, waitlist operations, check-ins and class changes are managed in the staff workspace.",
  "The current product does not provide a public member booking link, consumer marketplace or member payment checkout.",
  "Member notifications and outreach remain your studio's responsibility; do not expect built-in automated email or SMS marketing.",
  "You can explore the workflow with fictional demo data before submitting real client records."
 ],
 faqs:[
  ["Does StudioTasker handle waitlists for full classes?","Yes. The staff workspace includes waitlist status and timed promotion logic to manage open places for class-based sessions."],
  ["Can it manage Reformer equipment places?","Yes. Studios can configure numbered equipment spots for Reformer and similar capacity-constrained sessions."],
  ["Can I track late cancellations and no-shows?","Yes. Class workflows include cancellation, late-cancellation, check-in and no-show states."],
  ["Can members book themselves from a public link?","Not currently. StudioTasker's present workflow is staff-managed; there is no public member booking link or member payment checkout."],
  ["Does it send automatic SMS or email when a place opens?","No. The current product does not provide automated member messaging. Staff should use their existing communication tools."],
  ["What kinds of studios can use it?","The same class and waitlist workflow supports independent Pilates, yoga, barre, dance and other class-based studios. A fictional-data interactive demo is available without registration."]
 ],
 related:[
  {title:"Pilates and Reformer studio software",href:"/pilates-studio-software"},
  {title:"Pilates class packs and credit tracking",href:"/pilates-class-pack-software"},
  {title:"Yoga studio software",href:"/yoga-studio-software"}
 ]
};
export default function Page(){return <FeatureLanding config={config}/>;}
