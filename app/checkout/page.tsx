import type {Metadata} from "next";
import Link from "next/link";
import CheckoutClient from "./checkout-client";
import "./checkout.css";

export const metadata:Metadata={
 title:"Secure checkout | StudioTasker",
 description:"Secure StudioTasker subscription checkout powered by Paddle.",
 robots:{index:false,follow:false},
 alternates:{canonical:"https://www.studiotasker.com/checkout"}
};

export default function CheckoutPage(){
 return <main className="st-pay-page">
  <header className="st-pay-top"><Link href="/" className="st-pay-brand">studio<b>tasker</b><i>.</i></Link><Link href="/start">Plans</Link></header>
  <section className="st-pay-shell">
   <div className="st-pay-copy"><span>SECURE CHECKOUT</span><h1>StudioTasker<br/><em>subscription.</em></h1><p>Payment details, taxes, invoices and eligible payment methods are handled securely by Paddle as Merchant of Record.</p></div>
   <CheckoutClient/>
  </section>
 </main>
}
