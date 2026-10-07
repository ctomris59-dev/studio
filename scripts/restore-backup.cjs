const {spawn}=require("node:child_process");
const {once}=require("node:events");
const {Pool}=require("pg");
const {decryptStream}=require("./backup-crypto.cjs");
const file=process.argv[2],{BACKUP_PASSPHRASE,RESTORE_DATABASE_URL}=process.env;
async function run(){
 if(!file||!BACKUP_PASSPHRASE||!RESTORE_DATABASE_URL||
  process.env.ALLOW_EMPTY_DATABASE_RESTORE!=="YES_I_CONFIRMED")
  throw Error("Provide file, RESTORE_DATABASE_URL, BACKUP_PASSPHRASE and ALLOW_EMPTY_DATABASE_RESTORE=YES_I_CONFIRMED.");
 const pool=new Pool({connectionString:RESTORE_DATABASE_URL});
 try{
  const tables=await pool.query("SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public'");
  if(tables.rows[0].n!==0)throw Error("Restore target is not an empty database. Refusing to overwrite records.");
 }finally{await pool.end()}
 // Authenticate the full encrypted file BEFORE any SQL is applied.
 const verified=await decryptStream(file,BACKUP_PASSPHRASE);
 console.log("Backup verified, bytes:",verified.bytes);
 const proc=spawn("pg_restore",["--dbname",RESTORE_DATABASE_URL,"--single-transaction","--exit-on-error","--no-owner","--no-privileges"],{
  env:process.env,stdio:["pipe","ignore","pipe"]
 });
 let errors="";
 proc.stderr.on("data",data=>{errors+=(data.toString()).slice(0,250)});
 try{
  await decryptStream(file,BACKUP_PASSPHRASE,async chunk=>{
   if(!proc.stdin.write(chunk))await once(proc.stdin,"drain");
  });
  proc.stdin.end();
  const exit=await new Promise((resolve,reject)=>{
   if(proc.exitCode!==null)return resolve(proc.exitCode);
   proc.once("close",resolve);proc.once("error",reject);
  });
  if(exit!==0)throw Error("pg_restore failed, exit "+exit+": "+errors.slice(-250));
  console.log("Database restored to a fresh, empty target. Verify application and constraints separately.");
 }catch(e){proc.kill("SIGTERM");throw e}
}
run().catch(e=>{console.error("Restore FAILED:",e.message);process.exitCode=1});
