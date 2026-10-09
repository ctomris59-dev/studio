const {spawn}=require("node:child_process");
const {randomUUID}=require("node:crypto");
const {promises:fs}=require("node:fs");
const path=require("node:path");
const {encryptStream}=require("./backup-crypto.cjs");
const {pgConnectionEnv}=require("./pg-connection-env.cjs");
const {checkBackupClient}=require("./pg-dump-compat.cjs");
async function main(){
 const {BACKUP_DATABASE_URL,BACKUP_PASSPHRASE,BACKUP_OUTPUT_DIR}=process.env;
 if(!BACKUP_DATABASE_URL||!BACKUP_PASSPHRASE||!BACKUP_OUTPUT_DIR)throw Error("BACKUP_DATABASE_URL, BACKUP_PASSPHRASE and BACKUP_OUTPUT_DIR required");
 await checkBackupClient(BACKUP_DATABASE_URL);
 await fs.mkdir(BACKUP_OUTPUT_DIR,{recursive:true,mode:0o700});
 const now=new Date().toISOString().replace(/[:.]/g,"-");
 const filename="studiotasker-"+now+"-"+randomUUID().slice(0,8)+".rdbk";
 const output=path.join(BACKUP_OUTPUT_DIR,filename),partial=output+".partial";
 const proc=spawn("pg_dump",["--format=custom","--no-owner","--no-privileges"],{
  env:{...process.env,...pgConnectionEnv(BACKUP_DATABASE_URL)},stdio:["ignore","pipe","pipe"]
 });
 let stderr="";
 proc.stderr.on("data",b=>{stderr+=(b.toString()).slice(0,400)});
 try{
  await encryptStream(proc.stdout,partial,BACKUP_PASSPHRASE);
  const exit=await new Promise((resolve,reject)=>{
   if(proc.exitCode!==null)return resolve(proc.exitCode);
   proc.once("close",resolve);proc.once("error",reject);
  });
  if(exit!==0)throw Error("pg_dump failed (exit "+exit+"): "+stderr.slice(-300));
  await fs.rename(partial,output);
  console.log("Encrypted backup written:",path.basename(output));
  console.log("Store an additional copy OFF this server, with the passphrase kept separately.");
 }catch(e){proc.kill("SIGTERM");await fs.rm(partial,{force:true}).catch(()=>{});throw e}
}
main().catch(e=>{console.error("Backup failed:",e.message);process.exitCode=1});
