"use strict";
// Pass credentials to libpq as environment, never as a command-line argument.
function pgConnectionEnv(url){
 const parsed=new URL(url);
 if(!["postgres:","postgresql:"].includes(parsed.protocol))throw Error("A PostgreSQL connection URL is required.");
 if(!parsed.hostname||!parsed.pathname.slice(1))throw Error("Database host and name are required.");
 const additional={
  PGHOST:decodeURIComponent(parsed.hostname),
  PGPORT:parsed.port||"5432",
  PGDATABASE:decodeURIComponent(parsed.pathname.slice(1)),
  PGUSER:decodeURIComponent(parsed.username),
  PGPASSWORD:decodeURIComponent(parsed.password)
 };
 const sslmode=parsed.searchParams.get("sslmode");
 if(sslmode)additional.PGSSLMODE=sslmode;
 return additional;
}
module.exports={pgConnectionEnv};
