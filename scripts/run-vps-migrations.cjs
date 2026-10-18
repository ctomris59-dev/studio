"use strict";
// StudioTasker VPS-only one-shot migration launcher.
//
// MIG_DB_PASS enters this root-owned process from /root/studiotasker-db-secrets.
// Only the child that executes db/migrate.cjs receives the constructed
// MIGRATION_DATABASE_URL. The deploy shell and PM2 processes never receive it.
const {spawnSync}=require("node:child_process");

function migratorUrl(appDatabaseUrl,secret){
 if(typeof secret!=="string"||secret.length<24)throw Error("Dedicated migration password missing or too short.");
 const url=new URL(appDatabaseUrl||"");
 if(!["postgres:","postgresql:"].includes(url.protocol)||!url.hostname||!url.pathname.slice(1))
  throw Error("Application database location is invalid.");
 url.username="studiotasker_migrator";
 url.password=secret; // URL setter safely percent-encodes reserved characters.
 return url.toString();
}
function main(){
 if(typeof process.getuid!=="function"||process.getuid()!==0)
  throw Error("One-shot migration launcher must start under local root supervision.");
 const release=process.argv[2],user=process.argv[3];
 if(!release||user!=="studiotasker")
  throw Error("Expected the prepared release directory and the studiotasker OS user.");
 let url;
 try{url=migratorUrl(process.env.DATABASE_URL,process.env.MIG_DB_PASS);}
 catch(e){console.error("Cannot assemble the dedicated migration connection:",e.message);process.exitCode=2;return}
 const env={...process.env,MIGRATION_DATABASE_URL:url};
 delete env.MIG_DB_PASS;
 delete env.APP_DB_PASS;
 // Migrations execute as the normal application OS user, but with the
 // dedicated PostgreSQL migrator identity for this ONE child only.
 const proc=spawnSync("runuser",[
  "-u",user,"--","bash","-c",
  'cd "$1" && exec node --env-file=.env.production db/migrate.cjs',
  "_",release
 ],{env,stdio:"inherit",timeout:300000});
 if(proc.error){console.error("Migration process could not complete:",proc.error.code||"error");process.exitCode=1;return}
 process.exitCode=proc.status===null?1:proc.status;
}
if(require.main===module)main();
module.exports={migratorUrl};
