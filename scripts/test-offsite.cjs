"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),os=require("node:os"),path=require("node:path");
const {newestBackup,remotePath}=require("./backup-offsite.cjs");
async function main(){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"studiotasker-offsite-"));
 try{
  await fs.writeFile(path.join(dir,"studiotasker-2026-10-08.rdbk"),Buffer.alloc(80,1));
  await fs.writeFile(path.join(dir,"studiotasker-2026-10-09.rdbk"),Buffer.alloc(90,1));
  await fs.writeFile(path.join(dir,"studiotasker-2026-10-10.rdbk.partial"),Buffer.alloc(120,1));
  assert.equal(path.basename(await newestBackup(dir)),"studiotasker-2026-10-09.rdbk");
  assert.equal(remotePath("studio-remote:encrypted/backups","backup.rdbk"),"studio-remote:encrypted/backups/backup.rdbk");
  assert.throws(()=>remotePath("remote:../secrets","foo.rdbk"));
  assert.throws(()=>remotePath("s3://example","foo.rdbk"));
  console.log("Off-site backup path guards and latest-archive selection passed.");
 }finally{await fs.rm(dir,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1});
