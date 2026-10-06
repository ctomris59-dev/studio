import {LegalPage,LegalSection} from "../../../components/legal-page";
import {LEGAL_VERSIONS} from "../../../lib/legal-versions";
import {legalOperator} from "../../../lib/server/legal-config";
export const metadata={title:"Subprocessors — StudioTasker"};
export default function Subprocessors(){
 const op=legalOperator();
 return <LegalPage title="Subprocessors" kicker="TRUST / SERVICE PROVIDERS" version={LEGAL_VERSIONS.subprocessors}>
  <LegalSection title="How StudioTasker uses subprocessors"><p>StudioTasker may engage service providers that process personal data only as needed to provide hosting, email delivery, subscription billing, backup or security functions. Production signup is kept fail-closed until the principal hosting and transactional-email providers are identified in configuration.</p></LegalSection>
  <LegalSection title="Current production categories"><table className="lg-table"><thead><tr><th>Provider</th><th>Purpose</th><th>Data involved</th></tr></thead><tbody>
   <tr><td><strong>{op.hostingProvider}</strong></td><td>Application and database infrastructure</td><td>Workspace/account data stored or processed for the service</td></tr>
   <tr><td><strong>{op.emailProvider}</strong></td><td>Transactional account email</td><td>Recipient email, message template and account/service metadata</td></tr>
   <tr><td><strong>{op.billingProvider}</strong></td><td>StudioTasker subscription checkout and billing</td><td>Studio owner email, plan/subscription identifiers and billing data handled by the provider</td></tr>
  </tbody></table></LegalSection>
  <LegalSection title="Changes"><p>Where required by applicable data-protection law or the DPA, StudioTasker will provide appropriate notice before adding or replacing a material subprocessor that processes Customer Personal Data. Customers may raise a reasonable objection based on documented data-protection grounds.</p></LegalSection>
 </LegalPage>
}
