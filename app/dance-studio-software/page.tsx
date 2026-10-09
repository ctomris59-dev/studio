import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";
export const metadata:Metadata={title:"Dance Studio Software | StudioTasker",description:"Dance studio software for recurring lessons, levels, programme labels, attendance, waitlists, student records and optional guardian contact.",alternates:{canonical:"/dance-studio-software"}};
const config:StudioLandingConfig={
 path:"/dance-studio-software",
 seoName:"Dance Studio Software",
 kicker:"DANCE STUDIO SOFTWARE · GLOBAL",heroLine:"Organize the term.",heroEm:"Keep students visible.",
 lede:"Manage recurring dance lessons, levels, programme labels, attendance, waitlists, student records and optional parent or guardian contact. StudioTasker does not include separate term enrolment or tuition billing.",
 boardName:"Willow Dance Studio",strip:["DANCE LESSONS","LEVELS","TERMS","ATTENDANCE","PARENT CONTACT"],
 dailyLine:"Structure for lessons,",dailyEm:"levels and terms.",dailyCopy:"Use recurring lesson schedules and labels to organize classes by course or term. Formal term enrolment, tuition billing and recital operations are outside this product.",
 cards:[
  {icon:"calendar",title:"Recurring lessons and levels.",copy:"Organize weekly lesson series with levels, programme labels, instructors and capacity. There is no separate course-enrolment model."},
  {icon:"users",title:"Student and guardian context.",copy:"Keep student records, notes, tags, waiver status and optional parent or guardian contact together."},
  {icon:"clock",title:"Attendance and follow-up.",copy:"Track check-ins, no-shows, waitlists and follow-up opportunities throughout the term."}
 ],
 fitLine:"Built for the independent",fitEm:"dance studio.",fitCopy:"Best for studios that need class and student operations rather than a specialized recital-production system.",
 strongFits:["You run lessons by level, course or term.","Attendance and waitlists matter.","Some students need a parent or guardian contact.","You want class credits or packages alongside student records.","You want a focused system rather than recital-production software."],
 broaderFits:["Costume, recital and competition management are core requirements.","Family billing inside the same platform is essential.","You need a large school administration suite.","You require complex multi-location enterprise controls."],
 faqLabel:"DANCE SOFTWARE FAQ",
 faqs:[
  ["Can StudioTasker organize classes by level or term?","You can label recurring classes by level, course or term. Dedicated term enrolment and tuition billing are not available."],
  ["Can I store a parent or guardian contact?","Yes. Member records can include an optional related contact, including a parent or guardian."],
  ["Does it track attendance and no-shows?","Yes. Check-in, attendance and no-show status are built into class operations."],
  ["Does StudioTasker manage costumes or recitals?","No. StudioTasker focuses on studio operations rather than specialized recital and costume production workflows."],
  ["Can I use packages or credits?","Yes. Studio-managed packages and credits can be tracked alongside classes and attendance."],
  ["How much does it cost?","$39.90 USD/month per studio or $406.80 USD/year."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
