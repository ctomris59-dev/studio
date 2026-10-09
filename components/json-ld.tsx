import {serializeJsonLd} from "../lib/jsonld-safe.cjs";

/**
 * Non-executable application/ld+json payload.
 *
 * Next.js documents script-safe JSON serialization with < escaping as the
 * preferred JSON-LD approach. Here all HTML-sensitive delimiters are escaped
 * in a separately unit-tested serializer before insertion.
 */
export function JsonLd({data}:{data:unknown}){
 return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(data)}}/>;
}
