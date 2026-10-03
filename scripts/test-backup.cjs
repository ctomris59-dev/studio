const assert=require("node:assert/strict");
const {Readable}=require("node:stream");
const {mkdtemp,readFile,writeFile,rm}=require("node:fs/promises");
const os=require("node:os"),path=require("node:path");
const {encryptStream,decryptStream}=require("../scripts/backup-crypto.cjs");
(async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"studiotasker-bkp-"));
 try{
  const input=Buffer.from("Studio A lead\nStudio B member\n".repeat(250));
  const password="LOCAL_ONLY_very_long_test_passphrase_2026";
  const file=path.join(dir,"sample.rdbk");
  await encryptStream(Readable.from([input]),file,password);
  const encrypted=await readFile(file);
  assert(!encrypted.includes(input.subarray(0,30)),"Plaintext must not appear inside encrypted archive.");
  const result=[];await decryptStream(file,password,async chunk=>result.push(chunk));
  assert.deepEqual(Buffer.concat(result),input);
  await assert.rejects(()=>decryptStream(file,"other_password_that_is_very_long"),/authenticate|unable/i);
  const tampered=Buffer.from(encrypted);tampered[Math.floor(tampered.length/2)]^=1;
  const modified=path.join(dir,"altered.rdbk");await writeFile(modified,tampered);
  await assert.rejects(()=>decryptStream(modified,password),/authenticate|unable/i);
  await assert.rejects(()=>encryptStream(Readable.from([input]),path.join(dir,"short.rdbk"),"short"));
  console.log("Backup encryption roundtrip and tampering/wrong-password rejection passed.");
 }finally{await rm(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
