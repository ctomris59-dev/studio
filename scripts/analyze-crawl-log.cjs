const fs=require("node:fs");
const file=process.argv[2];
if(!file){console.error("Usage: npm run seo:logs -- /var/log/nginx/studiotasker-seo.log");process.exit(1)}
const lines=fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean);
const bots=[
 ["Googlebot",/googlebot/i],["Bingbot",/bingbot/i],["OAI-SearchBot",/OAI-SearchBot/i],
 ["GPTBot",/GPTBot/i],["ChatGPT-User",/ChatGPT-User/i],["PerplexityBot",/PerplexityBot/i]
];
const rows=[];
for(const line of lines){
 const p=line.split("\t");
 if(p.length<10)continue;
 const [time,ip,host,method,uri,args,status,bytes,ua,requestTime,location=""]=p;
 const bot=(bots.find(([,rx])=>rx.test(ua))||["Other"])[0];
 if(bot==="Other")continue;
 rows.push({time,ip,host,method,uri,args,status:Number(status),bytes:Number(bytes),ua,bot,requestTime:Number(requestTime),location});
}
const count=(arr,key)=>arr.reduce((m,x)=>(m[x[key]]=(m[x[key]]||0)+1,m),{});
const top=(m,n=15)=>Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);
const byUrl=rows.reduce((m,x)=>(m[x.uri]=(m[x.uri]||0)+1,m),{});
const queryWaste=rows.filter(x=>x.args&&x.args!=="-").reduce((m,x)=>{const k=x.uri+"?"+x.args;m[k]=(m[k]||0)+1;return m},{});
const slow=rows.filter(x=>Number.isFinite(x.requestTime)).sort((a,b)=>b.requestTime-a.requestTime).slice(0,15);
const errors=rows.filter(x=>x.status>=400).reduce((m,x)=>{const k=x.status+" "+x.uri;m[k]=(m[k]||0)+1;return m},{});
const redirects=rows.filter(x=>x.status>=300&&x.status<400).reduce((m,x)=>{const k=x.status+" "+x.uri+" -> "+(x.location||"?");m[k]=(m[k]||0)+1;return m},{});
console.log("\nStudioTasker crawler log report");
console.log("Bot requests:",rows.length);
console.log("\nBy bot:",top(count(rows,"bot"),20));
console.log("\nBy status:",top(count(rows,"status"),20));
console.log("\nTop crawled URLs:",top(byUrl));
console.log("\nQuery-parameter crawl candidates:",top(queryWaste));
console.log("\nCrawler errors:",top(errors));
console.log("\nRedirects:",top(redirects));
console.log("\nSlowest crawler responses:",slow.map(x=>({bot:x.bot,status:x.status,seconds:x.requestTime,url:x.uri})));
