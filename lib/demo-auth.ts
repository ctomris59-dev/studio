export const DEMO_ACCOUNT={email:"owner@demo.studiotasker.com",password:"StudioTaskerDemo!"} as const;
export function authenticateDemo(email:string,password:string):boolean{
 return email.trim().toLowerCase()===DEMO_ACCOUNT.email&&password===DEMO_ACCOUNT.password;
}
