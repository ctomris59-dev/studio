import Link from "next/link";
import {StudioTaskerMark} from "./studio-tasker-mark";
import {legalOperator} from "../lib/server/legal-config";

export function LegalPage({title,kicker,version,children}:{title:string;kicker:string;version:string;children:React.ReactNode}){
 const operator=legalOperator();
 return <main className="lg-page">
  <header className="lg-top">
   <Link className="lg-brand" href="/"><StudioTaskerMark/><span>studio<b>tasker.</b></span></Link>
   <nav aria-label="Legal navigation"><Link href="/legal">Legal hub</Link><Link href="/start">Start StudioTasker</Link></nav>
  </header>
  {!operator.configured&&<div className="lg-config-warning"><strong>Commercial legal identity not configured.</strong> Public signup remains fail-closed until the operator name, address, legal contact and production providers are configured.</div>}
  <article className="lg-document">
   <header className="lg-document-head"><span>{kicker}</span><h1>{title}</h1><p>Version {version}</p></header>
   <div className="lg-body">{children}</div>
   <footer className="lg-document-footer">
    <div><b>StudioTasker operator</b><span>{operator.name}</span><span>{operator.address}</span><span>{operator.country}</span><span>{operator.email}</span></div>
    <div><b>Related documents</b><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/dpa">DPA</Link><Link href="/legal/security">Security</Link></div>
   </footer>
  </article>
 </main>;
}

export function LegalSection({title,children,id}:{title:string;children:React.ReactNode;id?:string}){
 return <section id={id}><h2>{title}</h2>{children}</section>;
}
