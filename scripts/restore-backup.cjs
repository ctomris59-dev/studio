"use strict";
const {spawn}=require("node:child_process");
const {once}=require("node:events");
const {Pool}=require("pg");
const {decryptStream}=require("./backup-crypto.cjs");
const {pgConnectionEnv}=require("./pg-connection-env.cjs");
const file=process.argv[2],{BACKUP_PASSPHRASE,RESTORE_DATABASE_URL}=process.env;
async function run(){
 if(!file||!BACKUP_PASSPHRASE||!RESTORE_DATABASE_URL||
  process.env.ALLOW_EMPTY_DATABASE_RESTORE!=="YES_I_CONFIRMED")
  throw Error("Provide file, RESTORE_DATABASE_URL, BACKUP_PASSPHRASE and ALLOW_EMPTY_DATABASE_RESTORE=YES_I_CONFIRMED.");
 const connection=pgConnectionEnv(RESTORE_DATABASE_URL);
 const pool=new Pool({connectionString:RESTORE_DATABASE_URL,connectionTimeoutMillis:5000});
 try{
  const tables=await pool.query("SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public'");
  if(tables.rows[0].n!==0)throw Error("Restore target is not an empty database. Refusing to overwrite records.");
 }finally{await pool.end()}
 // Authenticate the complete archive before any SQL reaches PostgreSQL.
 const verified=await decryptStream(file,BACKUP_PASSPHRASE);
 console.log("Backup verified, bytes:",verified.bytes);
 const proc=spawn("pg_restore",["--dbname",connection.PGDATABASE,"--single-transaction","--exit-on-error","--no-owner","--no-privileges"],{
  env:{...process.env,...connection},stdio:["pipe","ignore","pipe"]
 });
 let errors="";
 proc.stderr.on("data",data=>{errors+=String(data).slice(0,400)});
 // Never wait forever for stdin drain if pg_restore has already exited.
 // A premature zero exit is also a failure: the archive was not consumed.
 const finished=new Promise(resolve=>{
  proc.once("close",(code,signal)=>resolve({code,signal}));
  proc.once("error",error=>resolve({error}));
 });
 proc.stdin.on("error",()=>{}); // EPIPE is reported through process exit below.
 try{
  await decryptStream(file,BACKUP_PASSPHRASE,async chunk=>{
   if(proc.exitCode!==null)throw Error("pg_restore terminated before receiving the archive.");
   if(!proc.stdin.write(chunk)){
    await Promise.race([
     once(proc.stdin,"drain"),
     finished.then(result=>{throw Error("pg_restore exited while waiting for stdin drain: "+JSON.stringify(result)+" "+errors.slice(-300))})
    ]);
   }
  });
  proc.stdin.end();
  const result=await finished;
  if(result.error||result.code!==0)throw Error("pg_restore failed: "+JSON.stringify(result)+" "+errors.slice(-300));
  const verify=new Pool({connectionString:RESTORE_DATABASE_URL,connectionTimeoutMillis:5000,max:1});
  try{
   const restored=await verify.query("SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public'");
   if(restored.rows[0].n===0)throw Error("pg_restore claimed success but restored zero public tables.");
   console.log("Restore completed:",restored.rows[0].n,"public tables; verify tenant data and RLS policies.");
  }finally{await verify.end()}
 }catch(e){proc.kill("SIGTERM");await finished;throw e}
}
run().catch(e=>{console.error("Restore FAILED:",e.message);process.exitCode=1});
