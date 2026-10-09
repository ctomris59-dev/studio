"use strict";

/**
 * Escape JSON for embedding as the text content of a non-executable
 * application/ld+json <script> tag. React would otherwise bypass escaping in
 * dangerouslySetInnerHTML. Every "<" is replaced, so an attacker cannot
 * inject </script> and then HTML with executable event handlers.
 *
 * JSON-LD's structured values (including apostrophes, quotes and Unicode)
 * survive a JSON.parse round trip. Never accept HTML fragments as schema data.
 * @param {unknown} data
 * @returns {string}
 */
function serializeJsonLd(data){
 const value=JSON.stringify(data);
 if(typeof value!=="string")throw new TypeError("JSON-LD must serialize to JSON text.");
 return value.replace(/[<>&\u2028\u2029]/g,ch=>{
  switch(ch){
   case "<":return "\\u003c";
   case ">":return "\\u003e";
   case "&":return "\\u0026";
   case "\u2028":return "\\u2028";
   case "\u2029":return "\\u2029";
   default:return ch;
  }
 });
}
module.exports={serializeJsonLd};
