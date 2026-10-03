import "server-only";
import {Pool,type PoolClient} from "pg";
let pool:Pool|undefined;
export function dbIsReady(){return Boolean(process.env.DATABASE_URL);}
export function getPool():Pool{
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_NOT_CONFIGURED");
 if(!pool)pool=new Pool({
  connectionString:process.env.DATABASE_URL,
  max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:5000,
  ssl:process.env.DATABASE_SSL_REQUIRE==="true"?{rejectUnauthorized:true}:undefined
 });
 return pool;
}
export async function inTransaction<T>(execute:(client:PoolClient)=>Promise<T>):Promise<T>{
 const client=await getPool().connect();
 try{
  await client.query("BEGIN");
  const result=await execute(client);
  await client.query("COMMIT");
  return result;
 }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e}
 finally{client.release()}
}
