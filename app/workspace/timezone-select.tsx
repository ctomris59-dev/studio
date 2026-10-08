"use client";

import {useEffect,useState} from "react";

type TimezoneSelectProps={
 value:string;
 onChange:(timezone:string)=>void;
 disabled?:boolean;
};

const commonTimezones=[
 "UTC",
 "America/New_York",
 "America/Chicago",
 "America/Denver",
 "America/Los_Angeles",
 "America/Toronto",
 "America/Vancouver",
 "America/Sao_Paulo",
 "Europe/London",
 "Europe/Paris",
 "Europe/Berlin",
 "Europe/Istanbul",
 "Europe/Rome",
 "Europe/Amsterdam",
 "Asia/Dubai",
 "Asia/Kolkata",
 "Asia/Singapore",
 "Asia/Tokyo",
 "Australia/Sydney",
 "Pacific/Auckland"
] as const;

function supportedTimezones():string[]{
 try {
  if(typeof Intl.supportedValuesOf==="function")return Intl.supportedValuesOf("timeZone");
 }catch{/* Use the common list when the browser cannot enumerate timezones. */}
 return [];
}

export function TimezoneSelect({value,onChange,disabled=false}:TimezoneSelectProps){
 // Start with deterministic options so server rendering and hydration match.
 const [supported,setSupported]=useState<string[]>([]);
 useEffect(()=>setSupported(supportedTimezones()),[]);

 const commonSet=new Set<string>(commonTimezones);
 const allZones=Array.from(new Set(supported.filter(zone=>!commonSet.has(zone)))).sort();
 const grouped:Record<string,string[]>={};
 for(const zone of allZones){
  const region=zone.includes("/")?zone.split("/")[0]:"Other";
  (grouped[region]??=[]).push(zone);
 }
 const selectedElsewhere=value&&!commonSet.has(value)&&!supported.includes(value);

 return (
  <select value={value} onChange={e=>onChange(e.target.value)} required disabled={disabled}>
   {selectedElsewhere&&<optgroup label="Current selection"><option value={value}>{value.replaceAll("_"," ")}</option></optgroup>}
   <optgroup label="Common timezones">
    {commonTimezones.map(zone=><option key={zone} value={zone}>{zone.replaceAll("_"," ")}</option>)}
   </optgroup>
   {Object.keys(grouped).sort().map(region=>
    <optgroup key={region} label={region}>
     {grouped[region].map(zone=><option key={zone} value={zone}>{zone.replaceAll("_"," ")}</option>)}
    </optgroup>
   )}
  </select>
 );
}
