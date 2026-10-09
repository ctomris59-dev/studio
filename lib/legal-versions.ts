export const LEGAL_VERSIONS={
 terms:"2026-10-09.1",
 dpa:"2026-10-09.1",
 privacy:"2026-10-09.1",
 cookies:"2026-10-06.2",
 security:"2026-10-09.1",
 cancellation:"2026-10-09.1",
 subprocessors:"2026-10-06.3",
 turkiyePrivacy:"2026-10-06"
} as const;

export const LEGAL_ACCEPTANCE_TEXT=
 "I am authorised to act for this studio. I agree to the Terms of Service, Cancellation & Refund Policy and Data Processing Agreement.";

export type LegalPlan="monthly"|"annual";
export const LEGAL_PLAN_PRICE_CENTS:Record<LegalPlan,number>={monthly:3990,annual:40680};
export const LEGAL_PLAN_LABEL:Record<LegalPlan,string>={monthly:"$39.90/month",annual:"$406.80/year"};
