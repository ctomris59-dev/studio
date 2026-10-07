import Link from "next/link";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";

export const metadata={title:"Legal & Trust — StudioTasker"};
const docs=[
 ["Terms of Service","The contract governing StudioTasker subscriptions, acceptable use, liability and account rules.","/legal/terms"],
 ["Privacy Policy","How StudioTasker uses account, billing, security and service data.","/legal/privacy"],
 ["KVKK Privacy Notice","Operator transparency notice where Turkish Law No. 6698 applies.","/legal/turkiye-privacy"],
 ["Data Processing Agreement","Controller–processor terms for studio member data processed through StudioTasker.","/legal/dpa"],
 ["Cookie Policy","The cookies and browser storage used by StudioTasker.","/legal/cookies"],
 ["Subprocessors & Independent Controllers","Production processors plus Paddle's separate Merchant-of-Record role.","/legal/subprocessors"],
 ["Security","Technical and organisational safeguards used by the service.","/legal/security"],
 ["Cancellation & Refunds","How monthly and annual subscriptions renew, cancel and end.","/legal/cancellation"]
] as const;
export default function LegalHub(){
 return <main className="lg-page">
  <header className="lg-top"><Link className="lg-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link><nav><Link href="/">Home</Link><Link href="/start">Start StudioTasker</Link></nav></header>
  <section className="lg-hub"><div className="lg-hub-head"><span>LEGAL & TRUST</span><h1>Clear rules.<br/>Clear responsibilities.</h1><p>StudioTasker is an independently operated software service. These documents explain the subscription, privacy roles, data-processing terms, security model and cancellation rules.</p></div>
   <div className="lg-hub-grid">{docs.map(([title,body,href],i)=><Link key={href} href={href} className="lg-hub-card"><span>0{i+1}</span><div><b>{title}</b><p>{body}</p></div></Link>)}</div>
  </section>
 </main>
}
