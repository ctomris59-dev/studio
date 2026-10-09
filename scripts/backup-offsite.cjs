"use strict";
const fs=require("node:fs/promises"),path=require("node:path"),{spawn}=require("node:child_process");
function remotePath(base,name){
 if(!/^[A-Za-z][A-Za-z0-9_-]*:[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(base)||base.length>190||base.includes(".."))
  throw Error("RCLONE_REMOTE_DIR must be a trusted configured remote:path with no parent traversal.");
 return base+"/"+name;
}
async function newestBackup(dir){
 const names=(await fs.readdir(dir)).filter(n=>/^studiotasker-[\w-]+\.rdbk$/.test(n)).sort();
 if(!names.length)throw Error("No encrypted backup archives found for off-site upload.");
 const full=path.join(dir,names.at(-1)),stat=await fs.lstat(full);
 if(!stat.isFile()||stat.size<50)throw Error("Backup archive is missing, suspiciously small or a symlink.");
 return full;
}
async function run(cmd,args,env){
 return new Promise((resolve,reject)=>{
  const proc=spawn(cmd,args,{env,stdio:["ignore","ignore","pipe"]});
  let error="";
  proc.stderr.on("data",data=>{error+=String(data).slice(0,500)});
  proc.on("error",reject);
  proc.on("close",code=>code===0?resolve():reject(Error(cmd+" failed ("+code+"): "+error.slice(0,400))));
 });
}
async function main(){
 const dir=process.env.BACKUP_OUTPUT_DIR,remote=process.env.RCLONE_REMOTE_DIR;
 if(!dir||!remote||!process.env.RCLONE_CONFIG)throw Error("Set BACKUP_OUTPUT_DIR, RCLONE_REMOTE_DIR and a private RCLONE_CONFIG path.");
 const backup=await newestBackup(dir),destination=remotePath(remote,path.basename(backup));
 // TLS and any remote encryption are configured in the private rclone config.
 await run("rclone",["copyto","--immutable","--retries","3",backup,destination],process.env);
 const size=(await fs.stat(backup)).size;
 // Validate that the offsite object exists and its encrypted byte length matches.
 const remoteSize=await new Promise((resolve,reject)=>{
  const proc=spawn("rclone",["lsjson","--stat",destination],{env:process.env,stdio:["ignore","pipe","pipe"]});
  let stdout="";proc.stdout.on("data",x=>{stdout+=String(x).slice(0,3000)});
  let stderr="";proc.stderr.on("data",x=>{stderr+=String(x).slice(0,300)});
  proc.on("error",reject);proc.on("close",code=>{
   if(code!==0)return reject(Error("Remote size check failed: "+stderr.slice(0,220)));
   try{resolve(JSON.parse(stdout).Size)}catch{reject(Error("Invalid remote verification metadata."))}
  });
 });
 if(remoteSize!==size)throw Error("Encrypted archive length differs from off-site copy.");
 console.log("Encrypted backup copied off-site and remote object size verified:",path.basename(backup));
}
module.exports={newestBackup,remotePath};
if(require.main===module)main().catch(e=>{console.error("Off-site backup failed:",e.message);process.exitCode=1});
