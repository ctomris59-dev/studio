import {ShieldCheck} from "lucide-react";
import {STUDIO_DATA_NOTICE_TITLE,STUDIO_DATA_NOTICE_TEXT} from "../lib/legal-versions";

export function StudioDataNotice(){
 return <div className="rd-data-notice" role="note" aria-label={STUDIO_DATA_NOTICE_TITLE}>
  <ShieldCheck size={19} aria-hidden="true"/>
  <div><strong>{STUDIO_DATA_NOTICE_TITLE}</strong><p>{STUDIO_DATA_NOTICE_TEXT}</p></div>
 </div>;
}
