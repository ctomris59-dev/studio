import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";
export const metadata:Metadata={title:"Dance Studio Software — StudioTasker",description:"Dance studio software for lessons, levels, terms, attendance, waitlists, student records and parent or guardian contact.",alternates:{canonical:"/dance-studio-software"}};
const config:StudioLandingConfig={
 path:"/dance-studio-software",
 seoName:"Dance Studio Software",
 kicker:"DANCE STUDIO SOFTWARE · GLOBAL",heroLine:"Organize the term.",heroEm:"Keep students visible.",
 lede:"StudioTasker supports independent dance studios with lessons, levels, course or term schedules, attendance, waitlists, student records and optional parent or guardian contact.",
 boardName:"Willow Dance Studio",strip:["DANCE LESSONS","LEVELS","TERMS","ATTENDANCE","PARENT CONTACT"],
 dailyLine:"Structure for lessons,",dailyEm:"levels and terms.",dailyCopy:"Use course-style schedules and student context without taking on recital, costume or enterprise-school complexity you may not need.",
 cards:[
  {icon:"calendar",title:"Courses and terms.",copy:"Organize structured lesson series with recurring schedules, levels, instructors and capacity."},
  {icon:"users",title:"Student and guardian context.",copy:"Keep student records, notes, tags, waiver status and optional parent or guardian contact together."},
  {icon:"clock",title:"Attendance and follow-up.",copy:"Track check-ins, no-shows, waitlists and follow-up opportunities throughout the term."}
 ],
 fitLine:"Built for the independent",fitEm:"dance studio.",fitCopy:"Best for studios that need class and student operations rather than a specialized recital-production system.",
 strongFits:["You run lessons by level, course or term.","Attendance and waitlists matter.","Some students need a parent or guardian contact.","You want class credits or packages alongside student records.","You want a focused system rather than recital-production software."],
 broaderFits:["Costume, recital and competition management are core requirements.","Family billing inside the same platform is essential.","You need a large school administration suite.","You require complex multi-location enterprise controls."],
 faqLabel:"DANCE SOFTWARE FAQ",
 faqs:[
  ["Can StudioTasker organize classes by level or term?","Yes. Course or term formats, labels and recurring schedules can be used for structured dance programmes."],
  ["Can I store a parent or guardian contact?","Yes. Member records can include an optional related contact, including a parent or guardian."],
  ["Does it track attendance and no-shows?","Yes. Check-in, attendance and no-show status are built into class operations."],
  ["Does StudioTasker manage costumes or recitals?","No. StudioTasker focuses on studio operations rather than specialized recital and costume production workflows."],
  ["Can I use packages or credits?","Yes. Studio-managed packages and credits can be tracked alongside classes and attendance."],
  ["How much does it cost?","$39.90 USD/month per studio or $406.80 USD/year."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
