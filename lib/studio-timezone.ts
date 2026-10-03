/** Validate an IANA zone and convert an unambiguous local studio time to UTC. */
export function validStudioTimezone(value:unknown):value is string {
 if(typeof value!=="string"||value.length>80||!/^[A-Za-z_]+(?:\/[A-Za-z_+-]+){0,3}$/.test(value))return false;
 try{new Intl.DateTimeFormat("en-GB",{timeZone:value}).format(new Date());return true}catch{return false}
}
const formatters=new Map<string,Intl.DateTimeFormat>();
function partsAt(instant:number,timezone:string){
 let formatter=formatters.get(timezone);
 if(!formatter){formatter=new Intl.DateTimeFormat("en-GB",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});formatters.set(timezone,formatter)}
 const obj:Record<string,number>={};
 for(const p of formatter.formatToParts(new Date(instant)))if(["year","month","day","hour","minute"].includes(p.type))obj[p.type]=Number(p.value);
 return obj;
}
export function localDateTimeToUTC(date:string,time:string,zone:string):string{
 if(!validStudioTimezone(zone)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error("Invalid studio timezone or local date/time.");
 const [year,month,day]=date.split("-").map(Number),[hour,minute]=time.split(":").map(Number);
 const stamp=Date.UTC(year,month-1,day,hour,minute);
 if(new Date(stamp).toISOString().slice(0,16)!==date+"T"+time)throw Error("Invalid calendar date.");
 const offsets=new Set<number>();
 for(const probe of [stamp-36*3600000,stamp,stamp+36*3600000]){
  const p=partsAt(probe,zone);
  offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)-Math.floor(probe/60000)*60000);
 }
 const matches=[...offsets].map(offset=>stamp-offset).filter(candidate=>{
  const p=partsAt(candidate,zone);
  return p.year===year&&p.month===month&&p.day===day&&p.hour===hour&&p.minute===minute;
 });
 if(matches.length!==1)throw Error(matches.length?"Ambiguous local time during daylight saving transition. Choose a different class time.":"Nonexistent local time during daylight saving transition.");
 return new Date(matches[0]).toISOString();
}
