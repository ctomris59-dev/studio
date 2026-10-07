import Link from "next/link";
import {ArrowLeft, ArrowUpRight, Clock3, Mail, MessageSquare, ShieldCheck} from "lucide-react";
import {StudioTaskerMark} from "../../components/studio-tasker-mark";
import ContactForm from "./contact-form";
import "./contact.css";

export const metadata={
  title:"Contact StudioTasker — Support & Questions",
  description:"Contact StudioTasker support about the product, pricing, account access or studio setup."
};

export default function ContactPage(){
  return <main className="ct-page">
    <header className="ct-top">
      <Link className="ct-brand" href="/" aria-label="StudioTasker home"><StudioTaskerMark/><span>studio<b>tasker</b><i>.</i></span></Link>
      <nav><Link href="/"><ArrowLeft size={16}/> Home</Link><Link className="ct-buy" href="/start">Start StudioTasker <ArrowUpRight size={16}/></Link></nav>
    </header>

    <section className="ct-hero">
      <div className="ct-intro">
        <span className="ct-kicker">CONTACT / STUDIOTASKER</span>
        <h1>Questions?<br/><em>Talk to us.</em></h1>
        <p>Product questions, account help, billing questions or feedback — send us a message and we&apos;ll pick it up at StudioTasker support.</p>
        <a className="ct-email" href="mailto:support@studiotasker.com"><Mail size={20}/><span><small>EMAIL US DIRECTLY</small><b>support@studiotasker.com</b></span><ArrowUpRight size={18}/></a>
        <div className="ct-notes">
          <div><MessageSquare size={18}/><span><b>Product & sales</b><small>Features, plans, demo and suitability for your studio.</small></span></div>
          <div><Clock3 size={18}/><span><b>Support</b><small>Account access, setup and product questions.</small></span></div>
          <div><ShieldCheck size={18}/><span><b>Privacy</b><small>Please do not include passwords, card details or sensitive member data.</small></span></div>
        </div>
      </div>
      <ContactForm/>
    </section>
  </main>
}
