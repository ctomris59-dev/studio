const {Pool}=require("pg");
const nodemailer=require("nodemailer");
const templates={
 verify_email:(d)=>({subject:"Verify your StudioTasker email",text:"Verify your StudioTasker owner/staff account by opening this one-time link:\n"+d.url+"\nLink expires after 24 hours."}),
 password_reset:(d)=>({subject:"Reset your StudioTasker password",text:"Reset your StudioTasker password using this one-time link:\n"+d.url+"\nIf you did not request this, ignore it."})
};
const validText=x=>typeof x==="string"&&x.length<5000?x:"";
async function main(){
 const {DATABASE_URL,SMTP_HOST,SMTP_FROM,SMTP_USER,SMTP_PASSWORD}=process.env;
 if(!DATABASE_URL||!SMTP_HOST||!SMTP_FROM||!SMTP_USER||!SMTP_PASSWORD)throw Error("DATABASE_URL, SMTP_HOST, SMTP_FROM, SMTP_USER and SMTP_PASSWORD are required. No messages sent.");
 const port=Number(process.env.SMTP_PORT||587);if(![465,587].includes(port))throw Error("Only secure TLS SMTP ports 465 or 587 are supported.");
 const smtp=nodemailer.createTransport({host:SMTP_HOST,port,secure:port===465,requireTLS:true,tls:{rejectUnauthorized:true},auth:{user:SMTP_USER,pass:SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
 const pool=new Pool({connectionString:DATABASE_URL,max:1,connectionTimeoutMillis:5000});let delivered=0;
 try{
  await smtp.verify();
  for(let i=0;i<30;i++){
   const client=await pool.connect();
   try{
    await client.query("BEGIN");
    const next=await client.query("SELECT id,recipient_email,template,payload FROM mail_outbox WHERE dispatched_at IS NULL AND attempts<5 ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED");
    if(!next.rowCount){await client.query("COMMIT");break}
    const job=next.rows[0],builder=templates[job.template],message=builder?builder(job.payload):null;
    if(!message)throw Error("Unknown account-mail template: "+job.template);
    try{
     await smtp.sendMail({from:SMTP_FROM,to:job.recipient_email,subject:validText(message.subject),text:validText(message.text)});
     await client.query("UPDATE mail_outbox SET dispatched_at=now(),payload='{}'::jsonb,attempts=attempts+1,last_error=NULL WHERE id=$1",[job.id]);
     await client.query("COMMIT");delivered++;
    }catch(e){
     await client.query("UPDATE mail_outbox SET attempts=attempts+1,last_error=$2 WHERE id=$1",[job.id,String(e.message||"SMTP failure").slice(0,250)]);
     await client.query("COMMIT");
    }
   }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e}finally{client.release()}
  }
  console.log("Studio account SMTP worker delivered:",delivered);
 }finally{smtp.close();await pool.end()}
}
if(require.main===module)main().catch(e=>{console.error("SMTP worker failed:",e.message);process.exitCode=1});
