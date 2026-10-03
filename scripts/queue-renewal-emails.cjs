const {Pool}=require("pg");
async function main(){
 if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required");
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:2});
 let due=0;
 try{
  const studios=await pool.query("SELECT id,timezone FROM studios ORDER BY id LIMIT 10000");
  for(const studio of studios.rows){
   const client=await pool.connect();
   try{
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.studio_id',$1,true)",[studio.id]);
    const people=await client.query(`
      SELECT id,full_name,email,expiry_date::text AS expiry_date
      FROM people
      WHERE studio_id=$1 AND kind='member' AND package_status='Paid'
      AND member_status='Active' AND archived_at IS NULL AND email<>''
      AND expiry_date=(now() AT TIME ZONE $2)::date+3
      ORDER BY id LIMIT 500`,[studio.id,studio.timezone]);
    for(const member of people.rows){
     const dedupe=["expiry",studio.id,member.id,member.expiry_date].join(":");
     const message=await client.query(`
      INSERT INTO mail_outbox(recipient_email,template,payload,dedupe_key)
      VALUES($1,'renewal_alert',$2::jsonb,$3)
      ON CONFLICT DO NOTHING RETURNING id`,[member.email,
      JSON.stringify({name:member.full_name,expiryDate:member.expiry_date,studioId:studio.id}),dedupe]);
     due+=message.rowCount;
    }
    await client.query("COMMIT");
   }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error}
   finally{client.release()}
  }
  console.log("Renewal reminders queued:",due,"(no email sent by scheduler).");
 }finally{await pool.end()}
}
if(require.main===module)main().catch(e=>{console.error("Notification scheduling failed:",e.message);process.exitCode=1});
