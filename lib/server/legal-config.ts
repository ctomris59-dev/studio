import "server-only";

export type LegalOperator={
 configured:boolean;
 name:string;
 address:string;
 country:string;
 email:string;
 governingLaw:string;
 jurisdiction:string;
 hostingProvider:string;
 emailProvider:string;
 billingProvider:string;
};

export function legalOperator():LegalOperator{
 const values={
  name:(process.env.LEGAL_OPERATOR_NAME||"").trim(),
  address:(process.env.LEGAL_OPERATOR_ADDRESS||"").trim(),
  country:(process.env.LEGAL_OPERATOR_COUNTRY||"").trim(),
  email:(process.env.LEGAL_CONTACT_EMAIL||"").trim(),
  governingLaw:(process.env.LEGAL_GOVERNING_LAW||"").trim(),
  jurisdiction:(process.env.LEGAL_JURISDICTION||"").trim(),
  hostingProvider:(process.env.LEGAL_HOSTING_PROVIDER||"").trim(),
  emailProvider:(process.env.LEGAL_EMAIL_PROVIDER||"").trim(),
  billingProvider:(process.env.LEGAL_BILLING_PROVIDER||"Lemon Squeezy").trim()
 };
 const configured=Boolean(values.name&&values.address&&values.country&&values.email&&values.governingLaw&&values.jurisdiction&&values.hostingProvider&&values.emailProvider);
 return {
  configured,
  name:values.name||"StudioTasker operator",
  address:values.address||"Operator address must be configured before commercial signup.",
  country:values.country||"Not configured",
  email:values.email||"Legal contact email must be configured before commercial signup.",
  governingLaw:values.governingLaw||"Not configured",
  jurisdiction:values.jurisdiction||"Not configured",
  hostingProvider:values.hostingProvider||"Production hosting provider not configured",
  emailProvider:values.emailProvider||"Transactional email provider not configured",
  billingProvider:values.billingProvider
 };
}

export function legalConfigurationReady():boolean{return legalOperator().configured&&Boolean(process.env.LEGAL_AUDIT_HASH_KEY);}
