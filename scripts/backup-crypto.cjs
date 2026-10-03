const {createCipheriv,createDecipheriv,randomBytes,scryptSync,createHash}=require("node:crypto");
const {createReadStream,createWriteStream,promises:fs}=require("node:fs");
const {once}=require("node:events");
const MAGIC=Buffer.from("RDBK01","ascii");
const SALT_LEN=16,IV_LEN=12,TAG_LEN=16;
const HEADER_LEN=MAGIC.length+SALT_LEN+IV_LEN;
function guard(password){if(typeof password!=="string"||password.length<20)throw Error("A 20+ character backup passphrase is required.");}
async function write(stream,data){if(!stream.write(data))await once(stream,"drain");}
async function encryptStream(readable,output,password){
 guard(password);
 const salt=randomBytes(SALT_LEN),iv=randomBytes(IV_LEN),key=scryptSync(password,salt,32);
 const cipher=createCipheriv("aes-256-gcm",key,iv),header=Buffer.concat([MAGIC,salt,iv]);
 const stream=createWriteStream(output,{flags:"wx",mode:0o600});
 try{
  await write(stream,header);
  for await(const chunk of readable)await write(stream,cipher.update(chunk));
  await write(stream,cipher.final());
  await write(stream,cipher.getAuthTag());
  stream.end();await once(stream,"finish");
 }catch(err){stream.destroy();await fs.rm(output,{force:true}).catch(()=>{});throw err}
}
async function metadata(file,password){
 guard(password);
 const stat=await fs.stat(file);
 if(stat.size<=HEADER_LEN+TAG_LEN)throw Error("Invalid encrypted backup length");
 const handle=await fs.open(file,"r");
 let header=Buffer.alloc(HEADER_LEN),tag=Buffer.alloc(TAG_LEN);
 try{
  await handle.read(header,0,HEADER_LEN,0);
  await handle.read(tag,0,TAG_LEN,stat.size-TAG_LEN);
 }finally{await handle.close()}
 if(!header.subarray(0,MAGIC.length).equals(MAGIC))throw Error("Unknown backup format");
 const salt=header.subarray(MAGIC.length,MAGIC.length+SALT_LEN),iv=header.subarray(MAGIC.length+SALT_LEN);
 return {iv,tag,key:scryptSync(password,salt,32),size:stat.size};
}
async function decryptStream(file,password,onChunk){
 const meta=await metadata(file,password);
 const decipher=createDecipheriv("aes-256-gcm",meta.key,meta.iv);
 decipher.setAuthTag(meta.tag);
 const stream=createReadStream(file,{start:HEADER_LEN,end:meta.size-TAG_LEN-1});
 let bytes=0;const digest=createHash("sha256");
 for await(const chunk of stream){
  const data=decipher.update(chunk);bytes+=data.length;digest.update(data);
  if(onChunk)await onChunk(data);
 }
 const final=decipher.final();bytes+=final.length;digest.update(final);
 if(onChunk)await onChunk(final);
 return {bytes,sha256:digest.digest("hex")};
}
module.exports={encryptStream,decryptStream};
