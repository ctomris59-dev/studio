"use strict";
const {execFileSync}=require("node:child_process");
const {Client}=require("pg");
function dumpMajor(output){
 const match=String(output).match(/pg_dump\s*\(PostgreSQL\)\s*(\d+)/i);
 if(!match)throw Error("Could not determine pg_dump major version.");
 return Number(match[1]);
}
function serverMajor(versionNum){
 const v=Number(versionNum);
 if(!Number.isSafeInteger(v)||v<100000)throw Error("Unrecognized PostgreSQL server version.");
 return Math.floor(v/10000);
}
function assertCompatible(dump,server){
 if(dump<server)throw Error("pg_dump major "+dump+" is older than PostgreSQL server "+server+". Install client "+server+" or newer before backup.");
}
async function checkBackupClient(databaseUrl){
 const installed=dumpMajor(execFileSync("pg_dump",["--version"],{encoding:"utf8",timeout:5000}));
 const client=new Client({connectionString:databaseUrl,connectionTimeoutMillis:5000});
 try{
  await client.connect();
  const result=await client.query("SHOW server_version_num");
  const server=serverMajor(result.rows[0].server_version_num);
  assertCompatible(installed,server);
  console.log("Backup client/server majors are compatible:",installed,server);
 }finally{await client.end().catch(()=>{})}
}
module.exports={dumpMajor,serverMajor,assertCompatible,checkBackupClient};
