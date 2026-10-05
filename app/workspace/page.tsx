import Link from "next/link";
import {WorkspaceClient} from "./workspace-client";
import "./workspace.css";
import { StudioTaskerMark } from "../../components/studio-tasker-mark";
import {commercialRegistrationReady} from "../../lib/server/release-config";
export const dynamic="force-dynamic";
export const metadata={title:"StudioTasker — Secure Workspace (Development)",robots:{index:false,follow:false}};
export default function Workspace(){
 const ready=Boolean(process.env.DATABASE_URL);
 const registration=ready&&process.env.AUTH_ALLOW_REGISTRATION==="true"&&commercialRegistrationReady();
 return <main className="rd-workspace">
  <header className="rd-workspace-header"><Link href="/" className="rd-wordmark"><StudioTaskerMark className="rd-logo-mark"/>studio<b>tasker.</b></Link><Link href="/demo">← Back to sample demo</Link></header>
  <div className="rd-workspace-body"><p className="rd-eyebrow">REAL WORKSPACE / DEVELOPMENT</p><h1>Studio workspace</h1>
  <p className="rd-intro">Separate studio accounts and server-side records. This is a development foundation, not a production-ready customer portal.</p>
  {!ready?<section className="rd-not-ready"><h2>Secure backend not configured</h2><p>The production workspace stays intentionally disabled until a private PostgreSQL connection is configured. You can still sign in to the full role-based sandbox with public demo credentials.</p><Link href="/app-demo">Sign in to the app demo →</Link><br/><Link href="/demo">Explore the sample CRM →</Link></section>:<WorkspaceClient registrationEnabled={registration}/>}
  </div>
 </main>;
}
