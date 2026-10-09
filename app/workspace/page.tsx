import Link from "next/link";
import {WorkspaceClient} from "./workspace-client";
import "./workspace.css";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import {commercialRegistrationReady} from "../../lib/server/release-config";
export const dynamic="force-dynamic";
export const metadata={title:"StudioTasker | Studio Workspace",robots:{index:false,follow:false}};
export default function Workspace(){
 const ready=Boolean(process.env.DATABASE_URL);
 const registration=ready&&process.env.AUTH_ALLOW_REGISTRATION==="true"&&commercialRegistrationReady();
 if(ready)return <div className="rd-workspace rd-workspace-live"><a className="studio-skip-link" href="#main-content">Skip to main content</a><WorkspaceClient registrationEnabled={registration}/></div>;
 return <main className="rd-workspace"><a className="studio-skip-link" href="#main-content">Skip to main content</a>
  <header className="rd-workspace-header"><Link href="/" className="rd-wordmark"><StudioTaskerMark className="rd-logo-mark"/>studio<b>tasker.</b></Link><Link href="/app-demo">← Owner app demo</Link></header>
  <div id="main-content" className="rd-workspace-body"><p className="rd-eyebrow">REAL CUSTOMER WORKSPACE</p><h1>Studio workspace</h1>
   <p className="rd-intro">Sign in to your private StudioTasker workspace to manage your studio's own data, logo, terminology, classes, members and operating rules.</p>
   <section className="rd-not-ready"><h2>Customer workspace temporarily unavailable</h2><p>We could not open the secure customer workspace right now. Please try again shortly, or explore the interactive owner demo in the meantime.</p><Link href="/app-demo">Open the interactive owner demo →</Link></section>
  </div>
 </main>;
}
