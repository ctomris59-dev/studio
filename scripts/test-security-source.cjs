"use strict";
// Audit first-party authored code, not Next.js bundles, generated code or
// DOM APIs inside third-party libraries. A scanner reporting built output
// needs source mapping to attribute a sink to StudioTasker.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const folders=["app","components","lib"];
const findings=[];
const names=[];
let reviewedJsonLdSinks=0;
function walk(root){
 for(const entry of fs.readdirSync(root,{withFileTypes:true})){
  const full=path.join(root,entry.name);
  if(entry.isDirectory()){walk(full);continue;}
  if(!entry.isFile()||!(/\.(?:tsx?|jsx?)$/.test(entry.name)))continue;
  names.push(full);
  const content=fs.readFileSync(full,"utf8");
  // There is no reason for first-party application code to bypass React text
  // escaping or assign unsanitized parsed markup. Reviewed JSON-LD can later
  // be added to a narrowly documented allowlist, but none is currently needed.
  for(const [kind,regex] of [
   ["dangerouslySetInnerHTML",/\bdangerouslySetInnerHTML\s*=/g],
   ["innerHTML assignment",/(?:\.|\[\s*["'`]innerHTML["'`]\s*\])\s*innerHTML?\s*=/g],
   ["insertAdjacentHTML",/\.insertAdjacentHTML\s*\(/g],
   ["outerHTML assignment",/\.outerHTML\s*=/g]
  ]){
   for(const match of content.matchAll(regex)){
    const line=content.slice(0,match.index).split("\n").length;
    if(kind==="dangerouslySetInnerHTML"&&full===path.join("components","json-ld.tsx")){
     // Only a non-executable JSON-LD script, and all '<' escaped before
     // writing into HTML. Any extra raw HTML sink is still an audit failure.
     assert(content.includes('type="application/ld+json"'));
     assert(/JSON\.stringify\(data\)\.replace\(\/<\//.test(content),
      "JSON-LD script must escape '<' to prevent closing its script tag.");
     reviewedJsonLdSinks++;
     continue;
    }
    findings.push(full+":"+line+": "+kind);
   }
  }
  // Also catch the common direct property assignment missed by bracket-only matches.
  for(const match of content.matchAll(/\.innerHTML\s*=/g)){
   findings.push(full+":"+content.slice(0,match.index).split("\n").length+": innerHTML assignment");
  }
 }
}
for(const folder of folders)walk(folder);
assert.equal(reviewedJsonLdSinks,1,"Expected one reviewed JSON-LD serialization sink.");
const attack='</script><img src=x onerror=alert(1)>';
const escaped=JSON.stringify({message:attack}).replace(/</g,"\\u003c");
assert(!escaped.includes("</script"),"JSON-LD script breakout must be escaped.");
assert.equal(findings.length,0,"First-party unsafe HTML sinks need individual auditing:\n"+findings.join("\n"));
console.log("Security source scan passed:",names.length,"files; one escaped JSON-LD sink; no other direct HTML injection sinks.");
