import Link from "next/link";
import {WorkspaceClient} from "./workspace-client";
import "./workspace.css";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import {commercialRegistrationReady} from "../../lib/server/release-config";
export const dynamic="force-dynamic";
export const metadata={title:"StudioTasker — Studio Workspace",robots:{index:false,follow:false}};
export default function Workspace(){
 const ready=Boolean(process.env.DATABASE_URL);
 const registration=ready&&process.env.AUTH_ALLOW_REGISTRATION==="true"&&commercialRegistrationReady();
 if(ready)return <main className="rd-workspace rd-workspace-live"><WorkspaceClient registrationEnabled={registration}/></main>;
 return <main className="rd-workspace">
  <header className="rd-workspace-header"><Link href="/" className="rd-wordmark"><StudioTaskerMark className="rd-logo-mark"/>studio<b>tasker.</b></Link><Link href="/app-demo">← Owner app demo</Link></header>
  <div className="rd-workspace-body"><p className="rd-eyebrow">REAL CUSTOMER WORKSPACE</p><h1>Studio workspace</h1>
   <p className="rd-intro">After purchase, this is the studio's private working area. It uses the same product structure as the demo, but with the studio's own data, logo, terminology and operating rules.</p>
   <section className="rd-not-ready"><h2>Secure backend not configured</h2><p>The real customer workspace stays disabled until private PostgreSQL, account email and StudioTasker subscription infrastructure are configured.</p><Link href="/app-demo">Open the interactive owner demo →</Link></section>
  </div>
 </main>;
}
