import {LegalPage,LegalSection} from "../../../components/legal-page";
import {LEGAL_VERSIONS} from "../../../lib/legal-versions";
import {legalOperator} from "../../../lib/server/legal-config";
export const metadata={title:"Subprocessors & Independent Controllers — StudioTasker"};
export default function Subprocessors(){
 const op=legalOperator();
 return <LegalPage title="Subprocessors & Independent Controllers" kicker="TRUST / SERVICE PROVIDERS" version={LEGAL_VERSIONS.subprocessors}>
  <LegalSection title="How StudioTasker uses processors"><p>StudioTasker is independently operated by an individual and may engage service providers that process Customer Personal Data only as needed to provide hosting, transactional account email, backups or service security. Paid signup remains fail-closed until the principal production hosting and transactional-email providers are identified in production configuration.</p></LegalSection>
  <LegalSection title="Current processor categories"><table className="lg-table"><thead><tr><th>Provider</th><th>Purpose</th><th>Data involved</th></tr></thead><tbody>
   <tr><td><strong>{op.hostingProvider||"Production hosting provider"}</strong>{op.hostingRegion&&<><br/><small>{op.hostingRegion}</small></>}</td><td>Application/database infrastructure and encrypted backup processing where applicable</td><td>Workspace/account data stored or processed for the service</td></tr>
   <tr><td><strong>{op.emailProvider||"Transactional email provider"}</strong></td><td>Account verification, password reset and essential service email</td><td>Recipient email, message template and minimum account/service metadata</td></tr>
  </tbody></table></LegalSection>
  <LegalSection title="Independent controller / Merchant of Record"><p><strong>Paddle</strong> is StudioTasker’s authorised reseller and Merchant of Record for subscription checkout. Paddle is not listed above as a Customer Personal Data subprocessor because Paddle independently determines processing necessary for checkout, payment processing, fraud prevention, tax, invoicing, refunds and regulatory compliance. Paddle and StudioTasker act as independent controllers for their respective buyer/payment processing purposes.</p></LegalSection>
  <LegalSection title="Changes"><p>Where required by applicable data-protection law or the DPA, StudioTasker will provide appropriate notice before adding or replacing a material processor that processes Customer Personal Data. Customers may raise a reasonable objection based on documented data-protection grounds. Changes to independent-controller payment providers will also be reflected in the Terms and Privacy Policy before they are used for live checkout.</p></LegalSection>
 </LegalPage>
}
