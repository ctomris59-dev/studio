import Link from "next/link";
export default function NotFound(){
 return <main className="csp-notfound">
  <section className="csp-notfound-inner">
   <p className="csp-notfound-kicker">404 / PAGE NOT FOUND</p>
   <h1>This page<br/>isn&apos;t here.</h1>
   <p className="csp-notfound-copy">This page is unavailable. Return to the homepage or explore the StudioTasker demo.</p>
   <div className="csp-notfound-actions">
    <Link href="/" className="csp-notfound-home">HOME</Link>
    <Link href="/app-demo?tour=1">WATCH DEMO</Link>
   </div>
  </section>
 </main>;
}
