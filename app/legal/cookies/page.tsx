import {LegalPage,LegalSection} from "../../../components/legal-page";
import {LEGAL_VERSIONS} from "../../../lib/legal-versions";
export const metadata={title:"Cookie Policy — StudioTasker"};
export default function Cookies(){
 return <LegalPage title="Cookie Policy" kicker="COOKIES / NECESSARY STORAGE" version={LEGAL_VERSIONS.cookies}>
  <LegalSection title="1. Current approach"><p>StudioTasker is designed to minimise tracking. The core customer workspace uses strictly necessary authentication/session technology so signed-in users can securely access the correct studio workspace.</p></LegalSection>
  <LegalSection title="2. Necessary session cookie"><table className="lg-table"><thead><tr><th>Purpose</th><th>Type</th><th>Why needed</th></tr></thead><tbody><tr><td>Authenticated StudioTasker session</td><td>HTTP-only, secure in production, SameSite=Lax session cookie</td><td>Keeps a signed-in user authenticated and helps prevent client-side scripts from reading the session token.</td></tr></tbody></table></LegalSection>
  <LegalSection title="3. Demo browser storage"><p>The public interactive demo may use browser session storage to remember temporary demo choices, demo limits and visual customisation during the current browser session. This data is sample/demo state and is not intended for real personal information.</p></LegalSection>
  <LegalSection title="4. Analytics and advertising"><p>The current core policy does not rely on advertising cookies or behavioural advertising trackers. If StudioTasker later introduces optional analytics or marketing technologies that require consent, this policy and the consent interface will be updated before those technologies are enabled for affected users.</p></LegalSection>
  <LegalSection title="5. Browser controls"><p>You can delete or block browser storage through your browser settings. Blocking strictly necessary authentication storage may prevent the customer workspace from functioning.</p></LegalSection>
 </LegalPage>
}
