import {LegalPage,LegalSection} from "../../../components/legal-page";
import {LEGAL_VERSIONS} from "../../../lib/legal-versions";
export const metadata={title:"Cancellation & Refund Policy — StudioTasker"};
export default function Cancellation(){
 return <LegalPage title="Cancellation & Refund Policy" kicker="BILLING / SUBSCRIPTION RULES" version={LEGAL_VERSIONS.cancellation}>
  <LegalSection title="1. Monthly plan"><p>The monthly StudioTasker plan is $39.90 per studio per month and renews monthly until cancelled. A cancellation stops the next renewal. Unless applicable law or a written exception requires otherwise, access continues through the already-paid billing period.</p></LegalSection>
  <LegalSection title="2. Annual plan"><p>The annual plan is $418.80 per studio per year, equivalent to $34.90 per month when prepaid. It renews annually until cancelled. Cancellation stops the next annual renewal and normally does not convert the current annual period into monthly billing.</p></LegalSection>
  <LegalSection title="3. Refunds"><p>Subscription fees are generally non-refundable after the billing period begins, except where required by applicable law, where a duplicate/incorrect charge is confirmed, or where StudioTasker expressly approves a refund. This policy does not remove rights that cannot legally be waived.</p></LegalSection>
  <LegalSection title="4. Failed payments and suspension"><p>If a StudioTasker subscription payment fails or remains unpaid, access may be restricted after reasonable retry/notice handling by the billing provider. Account, privacy, export and billing-management functions may remain available where technically and legally appropriate.</p></LegalSection>
  <LegalSection title="5. Data before account closure"><p>Before final account closure, Customer should export data it needs to keep. Data deletion and limited retention after termination are governed by the Terms, Privacy Policy, DPA, backup rotation and applicable legal obligations.</p></LegalSection>
  <LegalSection title="6. Member payments are separate"><p>This policy concerns the studio’s subscription to StudioTasker. It does not govern refunds or cancellations for a studio’s own memberships, classes or packages sold to its members; those remain the responsibility of the studio.</p></LegalSection>
 </LegalPage>
}
