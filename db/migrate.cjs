const fs=require("node:fs");
const path=require("node:path");
const {Pool}=require("pg");
async function main(){
  const url=process.env.MIGRATION_DATABASE_URL;
  if(!url)throw new Error("Set MIGRATION_DATABASE_URL to an administrative PostgreSQL connection.");
  const pool=new Pool({connectionString:url,connectionTimeoutMillis:5000});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('reformdesk_schema_migrations'))");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())");
    const files=fs.readdirSync(path.join(__dirname,"migrations")).filter(f=>/^\d+_[a-z0-9_]+\.sql$/.test(f)).sort();
    for(const file of files){
      const present=await client.query("SELECT 1 FROM schema_migrations WHERE version=$1",[file]);
      if(present.rowCount){console.log("Skip",file);continue}
      const sql=fs.readFileSync(path.join(__dirname,"migrations",file),"utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES($1)",[file]);
      console.log("Applied",file);
    }
    await client.query("COMMIT");
  }catch(err){await client.query("ROLLBACK").catch(()=>{});throw err}
  finally{client.release();await pool.end();}
}
if(require.main===module)main().catch(e=>{console.error("Database migration failed:",e.message);process.exitCode=1});
module.exports={main};
