"use strict";
const assert=require("node:assert/strict");
const nodemailer=require("nodemailer");
async function main(){
 const transport=nodemailer.createTransport({jsonTransport:true});
 try{
  const result=await transport.sendMail({
   from:"StudioTasker <support@example.com>",
   to:"person@example.com",
   subject:"Invitation verification test",
   text:"No real message should be delivered."
  });
  const payload=JSON.parse(result.message.toString());
  assert(payload.subject==="Invitation verification test");
  assert(payload.to[0].address==="person@example.com");
  assert(payload.text==="No real message should be delivered.");
  console.log("Supported Nodemailer 10 SMTP-compatible sendMail API smoke test passed.");
 }finally{transport.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
