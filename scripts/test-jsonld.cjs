"use strict";
const assert=require("node:assert/strict");
const {serializeJsonLd}=require("../lib/jsonld-safe.cjs");
const cases=[
 "</script><img src=x onerror=alert(1)>",
 '<script>alert("x")</script>',
 "</ScRiPt><svg/onload=alert(1)>",
 "A&B < best > 0",
 "\u2028\u2029",
 "' \" & <",
 "\u0000\t\n \ud83d\ude42"
];
for(const attack of cases){
 const source={["@context"]:"https://schema.org",name:attack,other:{value:attack},array:[attack]};
 const encoded=serializeJsonLd(source);
 assert.deepEqual(JSON.parse(encoded),source,"All original JSON-LD values must survive safe script serialization");
 assert(!/<\s*\/?\s*script|<\s*img|<\s*svg/i.test(encoded),"Dangerous HTML cannot appear in raw script text");
 assert(!encoded.includes("<"),"Any less-than character would permit raw HTML parsing");
 assert(!encoded.includes("\u2028")&&!encoded.includes("\u2029"),"Line separators must be escaped as JSON Unicode");
}
assert.throws(()=>serializeJsonLd(undefined),/must serialize/);
assert.equal(serializeJsonLd({a:1}),'{"a":1}');
assert.equal(serializeJsonLd({a:"</script>"}),'{"a":"\\u003c/script\\u003e"}');
console.log("JSON-LD script breakout and Unicode serializer regression passed.");
