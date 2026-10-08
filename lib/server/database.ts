import "server-only";
import {Pool,type PoolClient} from "pg";
let pool:Pool|undefined;
let runtimeVerified:Promise<void>|undefined;
// A superuser or BYPASSRLS role bypasses tenant separation even with FORCE RLS.
async function verifyRuntimeRole(p:Pool):Promise<void>{
 const result=await p.query<{rolsuper:boolean;rolbypassrls:boolean;rolcanlogin:boolean}>(
  "SELECT rolsuper,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname=current_user");
 const role=result.rows[0];
 if(!role||role.rolsuper||role.rolbypassrls||!role.rolcanlogin)
  throw new Error("UNSAFE_DATABASE_RUNTIME_ROLE");
}

export function dbIsReady(){return Boolean(process.env.DATABASE_URL);}
export function getPool():Pool{
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_NOT_CONFIGURED");
 if(!pool){
  const instance=new Pool({
   connectionString:process.env.DATABASE_URL,
   max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:5000,
   ssl:process.env.DATABASE_SSL_REQUIRE==="true"?{rejectUnauthorized:true}:undefined
  });
  instance.on("error",(e:Error)=>console.error("PostgreSQL idle connection error:",e.message));
  pool=instance;
 }
 return pool;
}
export async function inTransaction<T>(execute:(client:PoolClient)=>Promise<T>):Promise<T>{
 const activePool=getPool();
 if(!runtimeVerified)runtimeVerified=verifyRuntimeRole(activePool).catch(e=>{runtimeVerified=undefined;throw e});
 await runtimeVerified;
 const client=await activePool.connect();
 try{
  await client.query("BEGIN");
  const result=await execute(client);
  await client.query("COMMIT");
  return result;
 }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e}
 finally{client.release()}
}
