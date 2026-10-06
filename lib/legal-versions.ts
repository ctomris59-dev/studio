export const LEGAL_VERSIONS={
 terms:"2026-10-06.2",
 dpa:"2026-10-06.2",
 privacy:"2026-10-06.2",
 cookies:"2026-10-06",
 security:"2026-10-06.2",
 cancellation:"2026-10-06",
 subprocessors:"2026-10-06.2"
} as const;

export const LEGAL_ACCEPTANCE_TEXT=
 "I am authorised to act for this studio. I agree to the Terms of Service and Data Processing Agreement, and I acknowledge the Privacy Policy.";

export type LegalPlan="monthly"|"annual";
export const LEGAL_PLAN_PRICE_CENTS:Record<LegalPlan,number>={monthly:3990,annual:41880};
export const LEGAL_PLAN_LABEL:Record<LegalPlan,string>={monthly:"$39.90/month",annual:"$418.80/year"};
