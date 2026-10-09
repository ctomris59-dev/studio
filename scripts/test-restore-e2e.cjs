"use strict";
const assert=require("node:assert/strict");
const {mkdtemp,readdir,writeFile,chmod,rm,readFile}=require("node:fs/promises");
const {tmpdir}=require("node:os"),path=require("node:path");
const {spawnSync}=require("node:child_process");
const {randomUUID}=require("node:crypto");
const {Pool}=require("pg");
function run(args,env){
 const p=spawnSync(process.execPath,args,{env,encoding:"utf8",timeout:90000});
 if(p.error)throw p.error;
 return p;
}
async function counts(pool){
 const tables=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename);
 const rows={};
 // Names come exclusively from the server's pg_tables catalogue. Quote identifier
 // characters separately; PostgreSQL does not accept bind parameters for names.
 const quoteIdentifier=name=>'"'+name.replaceAll('"','""')+'"';
 for(const table of tables){
  const identifier=quoteIdentifier(table);
  rows[table]=Number((await pool.query("SELECT count(*)::int AS n FROM "+identifier)).rows[0].n);
 }
 const metrics=await pool.query(`SELECT
  (SELECT count(*)::int FROM pg_policies WHERE schemaname='public') AS policies,
  (SELECT count(*)::int FROM pg_class WHERE relnamespace='public'::regnamespace AND relforcerowsecurity) AS forced,
  (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public') AS indexes,
  (SELECT count(*)::int FROM pg_constraint WHERE connamespace='public'::regnamespace) AS constraints`);
 return {rows,metrics:metrics.rows[0]};
}
async function main(){
 const url=process.env.MIGRATION_DATABASE_URL;if(!url)throw Error("MIGRATION_DATABASE_URL required.");
 const dbname="studiotasker_restore_ci_"+randomUUID().replaceAll("-","").slice(0,12);
 const restoreUrl=new URL(url);restoreUrl.pathname="/"+dbname;
 const admin=new Pool({connectionString:url,max:1});
 const folder=await mkdtemp(path.join(tmpdir(),"studiotasker-restore-e2e-"));
 let restored;
 try{
  const original=await counts(admin);
  assert(Object.keys(original.rows).length>=15,"Source must have migrated test tables.");
  await admin.query('CREATE DATABASE "'+dbname+'"');
  const pass="ci-only-restore-passphrase-"+randomUUID();
  const base={...process.env,BACKUP_DATABASE_URL:url,BACKUP_OUTPUT_DIR:folder,BACKUP_PASSPHRASE:pass,
   RESTORE_DATABASE_URL:restoreUrl.toString(),ALLOW_EMPTY_DATABASE_RESTORE:"YES_I_CONFIRMED"};
  const archiveCreation=run(["scripts/backup-postgres.cjs"],base);
  assert.equal(archiveCreation.status,0,archiveCreation.stderr);
  const files=(await readdir(folder)).filter(n=>n.endsWith(".rdbk"));
  assert.equal(files.length,1,"Encrypted backup was not created.");
  const archive=path.join(folder,files[0]);
  const shim=path.join(folder,"pg_restore");
  await writeFile(shim,"#!/bin/sh\nexit 1\n");await chmod(shim,0o700);
  const early=run(["scripts/restore-backup.cjs",archive],{...base,PATH:folder+":"+process.env.PATH});
  assert.notEqual(early.status,0,"Early failed pg_restore must never exit 0.");
  restored=new Pool({connectionString:restoreUrl.toString(),max:1});
  assert.equal(Object.keys((await counts(restored)).rows).length,0,"Failed restore must leave zero tables.");
  const successful=run(["scripts/restore-backup.cjs",archive],base);
  assert.equal(successful.status,0,successful.stderr+"\n"+successful.stdout);
  const actual=await counts(restored);
  assert.deepEqual(actual,original,"Restored table rows, RLS, indexes and constraints must match source.");
  assert(Object.keys(actual.rows).length>=15);
  const refuseSecond=run(["scripts/restore-backup.cjs",archive],base);
  assert.notEqual(refuseSecond.status,0,"Cannot overwrite a populated database.");
  console.log("Real encrypted PostgreSQL restore passed:",Object.keys(actual.rows).length,"tables, identical counts, RLS and constraints; early failed child nonzero.");
 }finally{
  if(restored)await restored.end().catch(()=>{});
  await admin.query('DROP DATABASE IF EXISTS "'+dbname+'" WITH (FORCE)').catch(()=>{});
  await admin.end();
  await rm(folder,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
