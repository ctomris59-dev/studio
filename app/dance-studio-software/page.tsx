import type {Metadata} from "next";
import {StudioTypeLanding,type StudioLandingConfig} from "../studio-type-landing";
export const metadata:Metadata={title:"Dance Studio Software for Classes & Students | StudioTasker",description:"Dance studio software for class scheduling, student records, attendance, levels and teacher assignments. See real features in a fictional-data demo.",alternates:{canonical:"/dance-studio-software"}};
const config:StudioLandingConfig={
 path:"/dance-studio-software",
 seoName:"Dance Studio Software",
 kicker:"DANCE STUDIO SOFTWARE · GLOBAL",heroLine:"Dance classes.",heroEm:"Students in view.",
 lede:"StudioTasker is dance studio software for independent schools and teachers managing weekly class schedules, level-based lessons, student records, check-ins, waitlists and instructor assignments. Optional parent or guardian contacts stay with the student record. It does not provide recital production, curriculum lesson planning or tuition billing.",
 boardName:"Willow Dance Studio",strip:["DANCE LESSONS","LEVELS","TERMS","ATTENDANCE","PARENT CONTACT"],
 dailyLine:"Dance class scheduling",dailyEm:"with student context.",dailyCopy:"Plan weekly ballet, contemporary or other dance sessions by instructor, level and room. Use programme labels to group classes while keeping attendance and student notes visible. This is scheduling and studio administration software, not a lesson-plan or curriculum authoring tool.",
 cards:[
  {icon:"calendar",title:"Recurring lessons and levels.",copy:"Organize weekly lesson series with levels, programme labels, instructors and capacity. There is no separate course-enrolment model."},
  {icon:"users",title:"Student and guardian context.",copy:"Keep student records, notes, tags, waiver status and optional parent or guardian contact together."},
  {icon:"clock",title:"Attendance and follow-up.",copy:"Track check-ins, no-shows, waitlists and follow-up opportunities throughout the term."}
 ],
 fitLine:"Built for the independent",fitEm:"dance studio.",fitCopy:"Best for studios that need class and student operations rather than a specialized recital-production system.",
 strongFits:["You run lessons by level, course or term.","Attendance and waitlists matter.","Some students need a parent or guardian contact.","You want class credits or packages alongside student records.","You want a focused system rather than recital-production software."],
 broaderFits:["Costume, recital and competition management are core requirements.","Family billing inside the same platform is essential.","You need a large school administration suite.","You require complex multi-location enterprise controls."],
 decisionGuide:{
  title:"One weekly schedule. Clear student records.",
  summary:"A studio manager can organise recurring classes and student records without maintaining a separate roster in every teacher’s spreadsheet. These examples describe supported staff workflows, not results from real customers.",
  rows:[
   {task:"Class schedule",studioNeed:"Weekly ballet and contemporary classes with levels, instructors, rooms and capacity.",studioTasker:"Create recurring sessions, assign instructors and use programme or level labels."},
   {task:"Student database",studioNeed:"One place for student notes, tags, attendance history and a guardian contact where appropriate.",studioTasker:"Use member records with optional related-contact details and check-in history."},
   {task:"Teacher coordination",studioNeed:"Know who is teaching a session and handle instructor substitutions.",studioTasker:"Keep class assignments and substitute-instructor changes in the staff workspace."},
   {task:"Attendance and credits",studioNeed:"See who attended, missed a lesson or is approaching the end of a studio-managed class pack.",studioTasker:"Review check-in, no-show, waitlist and package-credit records together."}
  ],
  note:"Illustrative examples only. StudioTasker does not include choreography lesson plans, recital and costume operations, parent-facing portals or tuition collection."
 },
 faqLabel:"DANCE SOFTWARE FAQ",
 faqs:[
  ["Can StudioTasker organize classes by level or term?","Yes. Add level, course or term labels to recurring classes and maintain instructor, room and capacity details. There is no dedicated term enrolment or tuition billing module."],
  ["Can I store a parent or guardian contact?","Yes. Member records can include an optional related contact, including a parent or guardian."],
  ["Does it track attendance and no-shows?","Yes. Check-in, attendance and no-show status are built into class operations."],
  ["Does StudioTasker manage costumes or recitals?","No. StudioTasker focuses on studio operations rather than specialized recital and costume production workflows."],
  ["Can I use packages or credits?","Yes. Studio-managed packages and credits can be tracked alongside classes and attendance."],
  ["Is this ballet studio software as well as dance studio software?","Yes, for day-to-day ballet school operations such as weekly class schedules, levels, instructors, student records and attendance. It does not handle ballet recital planning, costumes or competition entries."],
  ["Can dance teachers plan classes or choreography in StudioTasker?","Teachers can manage class schedules, assigned instructors and attendance. StudioTasker does not currently offer a curriculum builder, choreography editor or dedicated dance lesson-plan authoring."],
  ["Can I replace my student spreadsheet or basic dance studio database?","StudioTasker centralises student records, tags, notes, related contacts, attendance and studio-managed credits. It is not a full school information system or family tuition-billing platform."],
  ["Is there a demo I can explore before signing up?","Yes. The interactive demo uses fictional studio data and does not require payment or a real student list. Paid production onboarding is not yet open."],
  ["How much does it cost?","$39.90 USD/month per studio or $406.80 USD/year."]
 ]
};
export default function Page(){return <StudioTypeLanding config={config}/>}
