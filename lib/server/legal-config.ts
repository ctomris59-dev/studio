import "server-only";

export type LegalOperatorType="individual"|"business";
export type LegalOperator={
 configured:boolean;
 type:LegalOperatorType;
 name:string;
 address:string;
 country:string;
 email:string;
 phone:string;
 governingLaw:string;
 jurisdiction:string;
 hostingProvider:string;
 hostingRegion:string;
 emailProvider:string;
 billingProvider:string;
 publicLabel:string;
};

export function legalOperator():LegalOperator{
 const rawType=(process.env.LEGAL_OPERATOR_TYPE||"individual").trim().toLowerCase();
 const type:LegalOperatorType=rawType==="business"?"business":"individual";
 const values={
  name:(process.env.LEGAL_OPERATOR_NAME||"").trim(),
  address:(process.env.LEGAL_OPERATOR_ADDRESS||"").trim(),
  country:(process.env.LEGAL_OPERATOR_COUNTRY||"Türkiye").trim(),
  email:(process.env.LEGAL_CONTACT_EMAIL||"").trim(),
  phone:(process.env.LEGAL_SUPPORT_PHONE||"").trim(),
  governingLaw:(process.env.LEGAL_GOVERNING_LAW||"").trim(),
  jurisdiction:(process.env.LEGAL_JURISDICTION||"").trim(),
  hostingProvider:(process.env.LEGAL_HOSTING_PROVIDER||"").trim(),
  hostingRegion:(process.env.LEGAL_HOSTING_REGION||"").trim(),
  emailProvider:(process.env.LEGAL_EMAIL_PROVIDER||"").trim(),
  billingProvider:(process.env.LEGAL_BILLING_PROVIDER||"Paddle").trim()
 };
 const configured=Boolean(
  values.name&&values.address&&values.country&&values.email&&values.phone&&values.governingLaw&&values.jurisdiction&&
  values.hostingProvider&&values.hostingRegion&&values.emailProvider
 );
 return {
  configured,type,
  name:values.name,
  address:values.address,
  country:values.country,
  email:values.email,
  phone:values.phone,
  governingLaw:values.governingLaw,
  jurisdiction:values.jurisdiction,
  hostingProvider:values.hostingProvider,
  hostingRegion:values.hostingRegion,
  emailProvider:values.emailProvider,
  billingProvider:values.billingProvider,
  publicLabel:type==="individual"?"Independent individual operator":"Business operator"
 };
}

export function legalConfigurationReady():boolean{return legalOperator().configured&&Boolean(process.env.LEGAL_AUDIT_HASH_KEY);}
