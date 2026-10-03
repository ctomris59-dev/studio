import type { SVGProps } from "react";

/** StudioTasker: class schedule, member records and completed studio tasks in one mark. */
export function StudioTaskerMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <rect width="64" height="64" rx="14" fill="#334BDD" />
      <rect x="12" y="12" width="40" height="40" rx="7" fill="none" stroke="#F4F0E7" strokeWidth="3.5" />
      <path d="M13 25h38" stroke="#F4F0E7" strokeWidth="3" />
      <rect x="19" y="31" width="8" height="8" rx="2" fill="#F4F0E7" />
      <rect x="31" y="31" width="8" height="8" rx="2" fill="#F4F0E7" opacity=".5" />
      <path d="m29 45 7 6 14-17" fill="none" stroke="#E7F982" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
