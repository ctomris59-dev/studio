export const SITE_URL="https://www.studiotasker.com";

export const studioTypeLinks=[
 {name:"Pilates & Reformer",href:"/pilates-studio-software"},
 {name:"Yoga",href:"/yoga-studio-software"},
 {name:"Barre",href:"/barre-studio-software"},
 {name:"Dance",href:"/dance-studio-software"},
 {name:"Indoor Cycling",href:"/indoor-cycling-software"},
 {name:"Fitness & Gym",href:"/fitness-gym-software"},
 {name:"Boutique Fitness",href:"/boutique-fitness-software"}
] as const;

export function absoluteUrl(path="/"){
 return new URL(path,SITE_URL).toString();
}

export function websiteJsonLd(){
 return {
  "@context":"https://schema.org",
  "@graph":[
   {
    "@type":"Organization",
    "@id":SITE_URL+"/#organization",
    name:"StudioTasker",
    url:SITE_URL+"/",
    logo:SITE_URL+"/icon.svg",
    email:"support@studiotasker.com",
    contactPoint:{
     "@type":"ContactPoint",
     contactType:"customer support",
     email:"support@studiotasker.com",
     availableLanguage:["English"]
    }
   },
   {
    "@type":"WebSite",
    "@id":SITE_URL+"/#website",
    url:SITE_URL+"/",
    name:"StudioTasker",
    description:"Studio management software for independent class-based studios.",
    inLanguage:"en",
    publisher:{"@id":SITE_URL+"/#organization"}
   },
   {
    "@type":"Service",
    "@id":SITE_URL+"/#service",
    name:"StudioTasker",
    url:SITE_URL+"/",
    serviceType:"Studio management software",
    provider:{"@id":SITE_URL+"/#organization"},
    audience:{"@type":"BusinessAudience","audienceType":"Independent class-based studios"},
    areaServed:"International",
    description:"StudioTasker helps independent class-based studios manage members, recurring classes, bookings, waitlists, credits, attendance, staff, follow-up and operational insights.",
    offers:[
     {"@type":"Offer","name":"StudioTasker Monthly","url":SITE_URL+"/start?plan=monthly","price":"39.90","priceCurrency":"USD","category":"subscription"},
     {"@type":"Offer","name":"StudioTasker Annual","url":SITE_URL+"/start?plan=annual","price":"406.80","priceCurrency":"USD","category":"subscription"}
    ]
   }
  ]
 };
}

export function breadcrumbJsonLd(items:{name:string;path:string}[]){
 return {
  "@context":"https://schema.org",
  "@type":"BreadcrumbList",
  itemListElement:items.map((item,index)=>({
   "@type":"ListItem",
   position:index+1,
   name:item.name,
   item:absoluteUrl(item.path)
  }))
 };
}
