export type DemoRole="owner"|"member";
export const DEMO_ACCOUNTS={
 owner:{email:"owner@demo.studiotasker.com",password:"StudioTaskerDemo!",role:"owner" as DemoRole},
 member:{email:"member@demo.studiotasker.com",password:"MemberDemo!",role:"member" as DemoRole}
} as const;
export function authenticateDemo(email:string,password:string):DemoRole|null{
 const normalized=email.trim().toLowerCase();
 for(const account of Object.values(DEMO_ACCOUNTS)){
  if(normalized===account.email&&password===account.password)return account.role;
 }
 return null;
}
